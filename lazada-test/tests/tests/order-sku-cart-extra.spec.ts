import { test, expect, Page, Locator } from '@playwright/test';

// =====================================================
// 1. CẤU HÌNH
// =====================================================

const productUrl =
    'https://www.lazada.vn/products/pdp-i3316781330.html';

const cartUrl = 'https://cart.lazada.vn/cart';

const productName =
    'MPATHW Áo khoác lông vũ nam mùa đông cổ đứng';

// Phân loại sản phẩm dùng để kiểm thử
const colorOption = 'Gray';
const sizeOption = 'M';

// Selector trên trang sản phẩm
const skuSelector = '#module_sku-select';
const quantitySelector = '#module_quantity-input input';

// Selector số lượng sản phẩm trong giỏ
const cartQuantitySelector =
    '.quantity.automation-item-quantity input';

// Selector dự kiến của số lượng trên icon giỏ hàng.
// Cần đối chiếu DOM thực tế nếu Lazada thay đổi giao diện.
const cartBadgeSelector = [
    '#topActionCartNumber',
    '.cart-num',
    '.cart-icon-num',
    '[class*="cartNum"]',
    '[class*="cart-num"]',
    '[class*="cart-count"]'
].join(', ');


// =====================================================
// 2. HÀM HỖ TRỢ
// =====================================================

// Mở trang sản phẩm
async function openProductPage(page: Page) {
    await page.goto(productUrl);
    await page.waitForLoadState('domcontentloaded');

    const addToCartButton = page
        .getByText(/Thêm vào giỏ(?: hàng)?|Add to Cart/i)
        .filter({ visible: true });

    await expect(addToCartButton.first()).toBeVisible({
        timeout: 15000
    });

    return addToCartButton.first();
}


// Chọn màu hoặc kích cỡ
async function selectSkuOption(
    page: Page,
    optionName: string
) {
    const option = page
        .locator(`${skuSelector} [class*="sku-item"]`)
        .filter({
            hasText: optionName
        })
        .first();

    await expect(option).toBeVisible({
        timeout: 10000
    });

    await option.click();
}


// Lấy dòng sản phẩm trong giỏ hàng
async function getCartProductRow(
    page: Page
): Promise<Locator> {
    const product = page.getByText(productName, {
        exact: false
    }).first();

    await expect(product).toBeVisible({
        timeout: 10000
    });

    return product.locator(
        'xpath=ancestor::*[.//*[contains(@class,"automation-item-quantity")]][1]'
    );
}


// Đọc số lượng sản phẩm trong giỏ
async function readCartQuantity(
    page: Page
): Promise<number> {
    const row = await getCartProductRow(page);

    const quantityInput = page.locator(
        '#module_quantity-input input'
    );  

    await expect(quantityInput).toBeVisible();

    return Number(await quantityInput.inputValue());
}


// Mở giỏ hàng và đọc số lượng
async function getCartQuantity(
    page: Page
): Promise<number> {
    await page.goto(cartUrl, {
        waitUntil: 'domcontentloaded'
    });

    const product = page.getByText(productName, {
        exact: false
    }).first();

    const visible = await product
        .waitFor({
            state: 'visible',
            timeout: 5000
        })
        .then(() => true)
        .catch(() => false);

    if (!visible) {
        return 0;
    }

    return readCartQuantity(page);
}


// Đọc số lượng hiển thị trên icon giỏ hàng
async function readCartBadgeCount(
    page: Page
): Promise<number> {
    const badge = page.locator(cartBadgeSelector).first();

    const exists = await badge.count();

    if (exists === 0) {
        throw new Error(
            'Không tìm thấy selector số lượng trên icon giỏ hàng. ' +
            'Cần kiểm tra lại DOM Lazada.'
        );
    }

    const visible = await badge.isVisible().catch(() => false);

    // Một số giao diện ẩn badge khi số lượng bằng 0.
    if (!visible) {
        return 0;
    }

    const text = (
        await badge.innerText().catch(() => '')
    ).trim();

    const match = text.match(/\d+/);

    return match ? Number(match[0]) : 0;
}


// Chuẩn bị sản phẩm với số lượng 1 trong giỏ.
// Đây là bước thiết lập điều kiện đầu vào cho ORDER-008.
async function ensureCartQuantityOne(
    page: Page
) {
    let currentQuantity = await getCartQuantity(page);

    if (currentQuantity === 0) {
        const {
            quantityInput,
            addToCartButton
        } = await openProductPage(page);

        await selectSkuOption(page, colorOption);
        await selectSkuOption(page, sizeOption);

        await quantityInput.fill('1');
        await addToCartButton.click();

        currentQuantity = await getCartQuantity(page);
    }

    if (currentQuantity !== 1) {
        const row = await getCartProductRow(page);

        const quantityInput = row
            .locator(cartQuantitySelector)
            .first();

        await quantityInput.fill('1');
        await quantityInput.press('Enter');

        await expect.poll(
            async () => getCartQuantity(page),
            {
                timeout: 15000
            }
        ).toBe(1);
    }

    expect(await getCartQuantity(page)).toBe(1);
}


// =====================================================
// 3. TC-ORDER-005
// Nhập ký tự không phải số vào ô số lượng
// =====================================================

test('TC-ORDER-005 - Kiểm tra nhập ký tự và số thập phân vào ô số lượng', async ({ page }) => {
    await openProductPage(page);

    console.log(
        'Quantity locator count:',
        await page.locator('#module_quantity-input input').count()
    );

    const quantityInput = page.locator(
        '#module_quantity-input input'
    );

    await expect(quantityInput).toBeVisible({
        timeout: 15000
    });

    // Lấy số lượng ban đầu
    const quantityBefore = await quantityInput.inputValue();

    // Trường hợp 1: Nhập chữ abc
    await quantityInput.click();
    await quantityInput.pressSequentially('abc');
    await quantityInput.press('Tab');

    await expect(quantityInput).toHaveValue(quantityBefore);

    // Trường hợp 2: Nhập 1.5
    await quantityInput.fill('1.5');
    await quantityInput.press('Tab');

    await expect(quantityInput).toHaveValue('2');

    // Trường hợp 3: Nhập 2.3
    await quantityInput.fill('2.3');
    await quantityInput.press('Tab');

    await expect(quantityInput).toHaveValue('2');
});


// =====================================================
// 4. TC-ORDER-006
// Thêm vào giỏ khi chưa chọn đủ phân loại
// =====================================================

test('TC-ORDER-006 - Không thêm vào giỏ hàng khi chưa chọn đủ phân loại', async ({ page }) => {
    await openProductPage(page);

    const skuSection = page.locator('#module_sku-select');

    // Chỉ chọn màu Gray
    // await skuSection.locator('.sku-item')
    //     .filter({ hasText: /^Gray$/ })
    //     .click();

    // Không chọn Size
    const size2XL = page
    .locator('.sku-variable-name-text:visible')
    .filter({ hasText: /^2XL$/ });

    await expect(size2XL).toHaveCount(1);   // kiểm tra chỉ còn 1 cái hiển thị
    await expect(size2XL).toBeVisible({ timeout: 15000 });
    await size2XL.click();
    // Ghi nhận số lượng sản phẩm trong giỏ trước khi thêm
    const cartCountBefore = await readCartBadgeCount(page);

    // Nhấn nút Thêm vào giỏ hàng
    const addToCartButton = page.getByText(
        /Thêm vào giỏ|Add to Cart/i
    ).filter({ visible: true });
    // const addToCartButton = page.locator(
    //     'button:visible, div[role="button"]:visible'
    // ).filter({
    //     hasText: /Thêm vào giỏ|Add to Cart/i
    // }).first();

    await addToCartButton.click();

    // Kiểm tra thông báo lỗi
    const errorMessage = skuSection.getByText('Please select the option', {
        exact: true
    });

    await expect(errorMessage).toBeVisible({
        timeout: 10000
    });

    // Kiểm tra giỏ hàng không tăng số lượng
    await expect.poll(
        async () => await readCartBadgeCount(page)
    ).toBe(cartCountBefore);
});


// =====================================================
// 5. TC-ORDER-007
// Thêm vào giỏ thành công khi đã chọn đủ phân loại
// =====================================================

test(
    'TC-ORDER-007 - Thêm thành công sản phẩm số lượng 2',
    async ({ page }) => {

        // Ghi nhận số lượng trên icon giỏ hàng trước khi thêm
        await page.goto(productUrl, {
            waitUntil: 'domcontentloaded'
        });

        const quantityBefore =
            await readCartBadgeCount(page);

        console.log(
            'Số lượng trên icon trước khi thêm:',
            quantityBefore
        );


        // Mở trang sản phẩm và chọn đủ phân loại
        const {
            quantityInput,
            addToCartButton
        } = await openProductPage(page);

        await selectSkuOption(page, colorOption);
        await selectSkuOption(page, sizeOption);


        // Nhập số lượng 2
        await quantityInput.fill('2');

        // Thêm vào giỏ hàng
        await addToCartButton.click();


        // Kiểm tra icon giỏ hàng tăng thêm 2
        await expect.poll(
            async () => readCartBadgeCount(page),
            {
                message:
                    'Icon giỏ hàng phải tăng thêm 2 đơn vị',
                timeout: 15000
            }
        ).toBe(quantityBefore + 2);

        const quantityAfter =
            await readCartBadgeCount(page);

        console.log(
            'Số lượng trên icon sau khi thêm:',
            quantityAfter
        );

        console.log(
            'Số lượng tăng:',
            quantityAfter - quantityBefore
        );
    }
);


// =====================================================
// 6. TC-ORDER-008
// Thêm cùng một phân loại sản phẩm vào giỏ nhiều lần
// =====================================================

test(
    'TC-ORDER-008 - Cộng dồn số lượng cùng một SKU',
    async ({ page }) => {

        // Bước 1: Đảm bảo sản phẩm đã có số lượng 1
        await ensureCartQuantityOne(page);

        const quantityBefore =
            await getCartQuantity(page);

        expect(quantityBefore).toBe(1);

        // Ghi nhận số dòng sản phẩm trước khi thêm
        const rowCountBefore = await page
            .locator(cartQuantitySelector)
            .count();

        console.log(
            'Số lượng ban đầu trong giỏ:',
            quantityBefore
        );


        // Bước 2: Mở lại trang sản phẩm
        const {
            quantityInput,
            addToCartButton
        } = await openProductPage(page);


        // Bước 3: Chọn đúng phân loại đã có trong giỏ
        await selectSkuOption(page, colorOption);
        await selectSkuOption(page, sizeOption);


        // Bước 4: Nhập thêm 2 sản phẩm
        await quantityInput.fill('2');

        // Bước 5: Thêm vào giỏ
        await addToCartButton.click();


        // Bước 6: Mở giỏ hàng
        await page.goto(cartUrl, {
            waitUntil: 'domcontentloaded'
        });


        // Bước 7: Kiểm tra số lượng được cộng dồn thành 3
        await expect.poll(
            async () => readCartQuantity(page),
            {
                message:
                    'Số lượng cùng SKU phải được cộng dồn từ 1 thành 3',
                timeout: 15000
            }
        ).toBe(3);

        const quantityAfter =
            await readCartQuantity(page);


        // Bước 8: Kiểm tra không tạo thêm dòng sản phẩm trùng
        const rowCountAfter = await page
            .locator(cartQuantitySelector)
            .count();

        expect(rowCountAfter).toBe(rowCountBefore);

        console.log(
            'Số lượng trước khi thêm:',
            quantityBefore
        );

        console.log(
            'Số lượng sau khi thêm:',
            quantityAfter
        );

        console.log(
            'Số dòng sản phẩm trước:',
            rowCountBefore
        );

        console.log(
            'Số dòng sản phẩm sau:',
            rowCountAfter
        );
    }
);
