import { test } from '@playwright/test';

test('Đăng nhập Lazada và lưu trạng thái', async ({ page }) => {
    await page.goto('https://www.lazada.vn/');

    console.log('Hãy đăng nhập Lazada.');

    await page.pause();

    await page.context().storageState({
        path: 'playwright/.auth/user.json'
    });
});