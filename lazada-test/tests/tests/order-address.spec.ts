import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'auth.json' });

async function openAddAddressForm(page: Page) {
  await page.goto('https://www.lazada.vn/');
  await page.getByText('\'s account').click();
  await page.getByRole('link', { name: 'Manage My Account' }).click();
  await page.getByRole('link', { name: 'Address Book' }).click();
  await page.getByRole('button', { name: '+ ADD NEW ADDRESS' }).click();
}

test.describe('FR-O04 Form địa chỉ nhận hàng', () => {

  test('TC-ORDER-019 - Bỏ trống các trường bắt buộc', async ({ page }) => {
    await openAddAddressForm(page);
    await page.getByRole('button', { name: 'SAVE' }).click();

    const loi = page.getByText('You can\'t leave this empty.');
    await expect(loi.first()).toBeVisible();
    expect(await loi.count()).toBeGreaterThanOrEqual(3);
  });

  const sdtSai = [
    { ten: '9 số',        sdt: '091234567' },
    { ten: '11 số',       sdt: '09123456789' },
    { ten: 'có chữ',      sdt: '090abc' },
    { ten: 'sai đầu số',  sdt: '0123456789' },
  ];

  for (const { ten, sdt } of sdtSai) {
    test(`TC-ORDER-020 - SĐT không hợp lệ (${ten}: ${sdt})`, async ({ page }) => {
      await openAddAddressForm(page);
      await page.getByRole('textbox', { name: 'Please enter your phone number' }).fill(sdt);
      await page.getByRole('button', { name: 'SAVE' }).click();
      await expect(page.getByText(/valid phone/i)).toBeVisible();
    });
  }

});