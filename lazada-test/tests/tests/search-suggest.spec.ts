import { test, expect, Page } from '@playwright/test';

const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: /search|tìm kiếm/i });

const goiY = (page: Page, tuKhoa: string) =>
  page
    .locator('a[href*="/tag/"], a[href*="/catalog/"]')
    .filter({ hasText: new RegExp('^\\s*' + tuKhoa, 'i') });

test.describe('FR-S02 Gợi ý tìm kiếm', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.lazada.vn/');
  });

  test('TC-SEARCH-006 - Hiển thị gợi ý khi gõ', async ({ page }) => {
    await searchBox(page).click();
    await searchBox(page).fill('iphone ');
    await expect(goiY(page, 'iphone').first()).toBeVisible();
  });

  test('TC-SEARCH-007 - Chọn một từ khóa gợi ý', async ({ page }) => {
    await searchBox(page).click();
    await searchBox(page).fill('iphone ');
    const first = goiY(page, 'iphone').first();
    await first.waitFor();
    await first.click();
    await expect(page).toHaveURL(/tag\/|catalog|q=/);
  });

  test('TC-SEARCH-008 - Điều hướng gợi ý bằng bàn phím', async ({ page }) => {
    await searchBox(page).click();
    await searchBox(page).fill('laptop');
    await goiY(page, 'laptop').first().waitFor();
    await searchBox(page).press('ArrowDown');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/tag\/|catalog|q=/);
  });

});