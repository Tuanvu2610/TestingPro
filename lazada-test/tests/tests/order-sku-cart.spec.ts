import { test, expect, Page } from '@playwright/test';

const productUrl =
    'https://www.lazada.vn/products/pdp-i1068266595-s117538577104.html?search=store';

const cartUrl = 'https://cart.lazada.vn/cart';

const productName = 'Combo 1,5kg Yến Mạch Nguyên Hạt Cán Dẹt';

const invalidQuantities = ['0', '-1'];

// Đọc số lượng sản phẩm trong giỏ hàng hiện tại
async function readCartQuantity(page: Page): Promise<number> {
    const product = page.getByText(productName, {
        exact: false
    }).first();

    const isInCart = await product.isVisible().catch(() => false);

    if (!isInCart) {
        return 0;
    }

    const productItem = product.locator(
        'xpath=ancestor::*[.//*[contains(@class,"automation-item-quantity")]][1]'
    );

    const quantityInput = productItem
        .locator('.quantity.automation-item-quantity input')
        .first();

    const isQuantityVisible = await quantityInput
        .isVisible()
        .catch(() => false);

    if (!isQuantityVisible) {
        return 0;
    }

    return Number(await quantityInput.inputValue());
}

// Mở giỏ hàng và lấy số lượng ban đầu
async function getCartQuantity(page: Page): Promise<number> {
    await page.goto(cartUrl, {
        waitUntil: 'domcontentloaded'
    });

    const product = page.getByText(productName, {
        exact: false
    }).first();

    const isInCart = await product
        .waitFor({
            state: 'visible',
            timeout: 10000
        })
        .then(() => true)
        .catch(() => false);

    if (!isInCart) {
        return 0;
    }

    return readCartQuantity(page);
}

// Mở trang sản phẩm
async function openProductPage(page: Page) {
    await page.goto(productUrl, {
        waitUntil: 'domcontentloaded'
    });

    const quantityInput = page.locator(
        '#module_quantity-input input'
    );

    const addToCartButton = page.getByRole('button', {
        name: 'Add to Cart',
        exact: true
    });

    await expect(quantityInput).toBeVisible();
    await expect(addToCartButton).toBeVisible();

    return {
        quantityInput,
        addToCartButton
    };
}

test.describe('ORDER-003 - Kiểm tra số lượng không hợp lệ', () => {

    test.describe.configure({
        mode: 'serial'
    });

    for (const invalidQuantity of invalidQuantities) {

        test(
            `ORDER-003 - Nhập số lượng ${invalidQuantity} thì giỏ hàng tăng 1`,
            async ({ page }) => {

                const quantityBefore = await getCartQuantity(page);

                console.log(
                    'Số lượng trước khi thêm:',
                    quantityBefore
                );

                const {
                    quantityInput,
                    addToCartButton
                } = await openProductPage(page);

                await expect(quantityInput).toHaveValue('1');

                await quantityInput.fill(invalidQuantity);

                await quantityInput.press('Tab');

                const valueAfterValidation =
                    await quantityInput.inputValue();

                console.log(
                    'Giá trị sau validation:',
                    valueAfterValidation
                );

                await addToCartButton.click();

                console.log('Đã nhấn Add to Cart');

                await page.waitForTimeout(2000);

                await page.goto(cartUrl, {
                    waitUntil: 'domcontentloaded'
                });

                await expect.poll(
                    async () => {
                        return await readCartQuantity(page);
                    },
                    {
                        message:
                            `Giỏ hàng phải tăng từ ${quantityBefore} lên ${quantityBefore + 1}`,
                        intervals: [1000, 2000, 3000],
                        timeout: 30000
                    }
                ).toBe(quantityBefore + 1);

                const quantityAfter = await readCartQuantity(page);

                console.log(
                    'Số lượng sau khi thêm:',
                    quantityAfter
                );

                console.log(
                    'Số lượng tăng:',
                    quantityAfter - quantityBefore
                );

                expect(quantityAfter).toBe(quantityBefore + 1);

            }
        );
    }
});
