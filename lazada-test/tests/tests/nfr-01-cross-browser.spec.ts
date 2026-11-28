
import { test, expect, Page } from '@playwright/test';

test.use({
  storageState: 'auth.json',
  ignoreHTTPSErrors: true,
});

async function moGioHang(page: Page) {
  await page.goto('https://www.lazada.vn/', {
    waitUntil: 'domcontentloaded',
  });

  await page.locator('.cart-icon').click();

  await expect(page).toHaveURL(/cart\.lazada\.vn/);
}

test('NFR-01 - Kiểm tra tương thích đa trình duyệt: Giỏ hàng -> Checkout', async ({ page }) => {

  // 1. Mở giỏ hàng
  await moGioHang(page);

  // 2. Kiểm tra giao diện giỏ hàng
  await expect(page.locator('body')).toBeVisible();

  const tranNgangGioHang = await page.evaluate(() =>
    document.documentElement.scrollWidth -
    document.documentElement.clientWidth
  );

  expect(tranNgangGioHang).toBeLessThanOrEqual(0);

  // 3. Kiểm tra sản phẩm trong giỏ hàng
  const sanPham = page.locator('.next-number-picker');

  await expect(sanPham.first()).toBeVisible({
    timeout: 15000,
  });

  // 4. Chọn sản phẩm
// Lấy dòng sản phẩm đầu tiên trong giỏ hàng
const sp = page.locator('.next-number-picker').first()
  .locator("xpath=ancestor::div[.//*[contains(@class,'next-checkbox')]][1]");

// Lấy checkbox của sản phẩm
const checkbox = sp.locator(
  '.next-checkbox-wrapper, .next-checkbox'
).first();

// Kiểm tra checkbox hiển thị
await expect(checkbox).toBeVisible({ timeout: 15000 });

// Chỉ click nếu sản phẩm chưa được chọn
const inputCheckbox = sp.locator('input[type="checkbox"]').first();

if (!(await inputCheckbox.isChecked())) {
  await checkbox.click();
}

// Xác nhận sản phẩm đã được chọn
await expect(inputCheckbox).toBeChecked();
  // 5. Kiểm tra nút Checkout
  const checkout = page.getByRole('button', {
    name: /confirm cart/i,
  });

  await expect(checkout).toBeVisible();
  await expect(checkout).toBeEnabled();

  // 6. Tiến hành Checkout
  await checkout.click();

  // 7. Kiểm tra điều hướng
  await expect(page).not.toHaveURL(/cart\.lazada\.vn\/cart/);

  // 8. Kiểm tra trang Checkout hiển thị
  await expect(page.locator('body')).toBeVisible();

  // 9. Kiểm tra không tràn ngang tại Checkout
  const tranNgangCheckout = await page.evaluate(() =>
    document.documentElement.scrollWidth -
    document.documentElement.clientWidth
  );

  expect(tranNgangCheckout).toBeLessThanOrEqual(0);

  // 10. Ghi nhận thông tin trình duyệt
  console.log('Browser:', await page.evaluate(() => navigator.userAgent));
  console.log('Checkout URL:', page.url());

  // Dừng tại Checkout, không nhấn Đặt hàng
});
