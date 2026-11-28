import { test, expect, Page } from '@playwright/test';
import {
  searchFor,
  productCards,
  docGia,
  docGiaTatCa,
  daSapXep,
} from '../lazada-helpers';

// ---------------------------------------------------------------------------
// Các selector bên dưới CHƯA được xác nhận trên Lazada (đoán).
// Nếu test báo "locator not found": dùng Pick locator của codegen để lấy selector thật.
// ---------------------------------------------------------------------------
const trangSo = (page: Page, n: number) => page.locator(`li[title="${n}"]`);             // TODO: phân trang
const oGiaTu = (page: Page) => page.getByPlaceholder(/min|từ/i).first();                  // TODO: ô giá từ
const oGiaDen = (page: Page) => page.getByPlaceholder(/max|đến/i).first();                // TODO: ô giá đến

// Nút Áp dụng là mũi tên cam (không có chữ), nên: nhấn Enter ở ô "giá đến" trước;
// nếu URL chưa có tham số price thì bấm nút mũi tên nằm ngay sau ô "giá đến".
// TODO: nếu cả hai cách đều không áp dụng được, lấy selector nút mũi tên bằng Pick locator.
async function apDungGia(page: Page) {
  await oGiaDen(page).press('Enter');
  const daApDung = await page
    .waitForURL(/price=/, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!daApDung) {
    await oGiaDen(page).locator('xpath=following::*[self::button or self::a or self::i][1]').click();
  }
}
// Nhãn của menu sắp xếp: lúc đầu là "Best Match", sau khi chọn đổi thành tên lựa chọn
const nhanSapXep = (page: Page) =>
  page.getByText(/^(Best Match|Price low to high|Price high to low)$/).first();

async function chonSapXep(page: Page, tuyChon: 'Price low to high' | 'Price high to low') {
  await nhanSapXep(page).click();                                  // mở menu
  await page.getByText(tuyChon, { exact: true }).last().click();   // chọn dòng trong danh sách
  await expect(nhanSapXep(page)).toHaveText(tuyChon);              // nhãn đã đổi = đã áp dụng
  await page.waitForTimeout(3000);                                 // chờ danh sách cập nhật
}          // TODO

async function docTenSanPham(card: ReturnType<typeof productCards>): Promise<string> {
  // Link đầu tiên trong thẻ thường là link của ẢNH (không có chữ), nên duyệt hết các link
  const links = card.locator('a[href*="/products/"]');
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const l = links.nth(i);
    const t = ((await l.getAttribute('title')) || (await l.innerText()) || '').trim();
    if (t) return t;
  }
  // Dự phòng: lấy dòng chữ dài nhất trong thẻ mà không phải dòng giá
  const lines = (await card.innerText())
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.includes('₫'));
  return lines.sort((a, b) => b.length - a.length)[0] ?? '';
}

test.describe('FR-S03/S04/S05 Kết quả tìm kiếm', () => {
  test('TC-SEARCH-010 - Phân trang: sang trang 2', async ({ page }) => {
    await searchFor(page, 'áo thun');
    const tenTrang1 = await docTenSanPham(productCards(page).first());
    expect(tenTrang1, 'đọc được tên sản phẩm đầu trang 1').not.toBe('');

    await page.keyboard.press('End'); // cuộn xuống cuối trang
    const t2 = trangSo(page, 2);
    await t2.scrollIntoViewIfNeeded();
    await t2.click();

    await expect(page).toHaveURL(/page=2/);
    await expect(t2).toHaveClass(/active/); // trang hiện tại được highlight
    await expect(productCards(page).first()).toBeVisible();
    const tenTrang2 = await docTenSanPham(productCards(page).first());
    expect(tenTrang2).not.toBe(tenTrang1);
  });

  test('TC-SEARCH-011 - Trang chi tiết khớp tên & giá với danh sách', async ({ page }) => {
    await searchFor(page, 'áo thun');
    const card = productCards(page).first();
    await card.waitFor();

    const tenNgoai = await docTenSanPham(card);
    const giaNgoai = await docGia(card);

    await card.locator('a[href*="/products/"]').first().click();
    await page.waitForURL(/\/products\//, { timeout: 30_000 });

    const body = page.locator('body');
    await expect(body).toContainText(tenNgoai.slice(0, 15), { ignoreCase: true });
    if (!Number.isNaN(giaNgoai)) {
      // Giá ở trang chi tiết phải khớp giá ngoài danh sách
      // (bỏ dấu . và , vì Lazada hiển thị kiểu ₫57,000)
      const chuTrang = (await body.innerText()).replace(/[.,]/g, '');
      expect(chuTrang, `trang chi tiết phải có giá ${giaNgoai}`).toContain(String(giaNgoai));
    }
  });

  test('TC-SEARCH-012 - Bố cục lưới kết quả (chạy với --project=firefox / edge)', async ({ page }) => {
    await searchFor(page, 'áo thun');
    expect(await productCards(page).count()).toBeGreaterThan(5);

    // Không vỡ khung: trang không bị tràn ngang
    const trànNgang = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(trànNgang, 'trang không được cuộn ngang').toBe(false);
  });

  test('TC-SEARCH-013 - Lọc giá hợp lệ 100.000 - 500.000đ', async ({ page }) => {
    await searchFor(page, 'áo thun');
    await oGiaTu(page).fill('100000');
    await oGiaDen(page).fill('500000');
    await apDungGia(page);
    await page.waitForTimeout(3000); // chờ danh sách cập nhật

    const gia = await docGiaTatCa(page, 20);
    expect(gia.length).toBeGreaterThan(0);
    for (const g of gia) {
      expect(g).toBeGreaterThanOrEqual(100_000);
      expect(g).toBeLessThanOrEqual(500_000);
    }
  });

  test('TC-SEARCH-014 - Lọc giá biên: Giá từ > Giá đến', async ({ page }) => {
    await searchFor(page, 'áo thun');
    await oGiaTu(page).fill('500000');
    await oGiaDen(page).fill('100000');
    await apDungGia(page);
    await page.waitForTimeout(3000);

    // Không treo trang
    await expect(page.locator('body')).toBeVisible();

    // Kỳ vọng: báo lỗi, hoặc tự hoán đổi khoảng giá hợp lý
    const coThongBaoLoi = await page
      .getByText(/invalid|không hợp lệ|error|lỗi/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!coThongBaoLoi) {
      const gia = await docGiaTatCa(page, 20);
      for (const g of gia) {
        expect(g).toBeGreaterThanOrEqual(100_000);
        expect(g).toBeLessThanOrEqual(500_000);
      }
    }
  });

    test('TC-SEARCH-017 - Sắp xếp giá thấp→cao và cao→thấp', async ({ page }) => {
    await searchFor(page, 'chuột không dây');

    await chonSapXep(page, 'Price low to high');
    const tang = await docGiaTatCa(page, 10);
    expect(tang.length).toBeGreaterThan(1);
    expect(daSapXep(tang, 'asc'), `giá phải tăng dần: ${tang.join(', ')}`).toBe(true);

    await chonSapXep(page, 'Price high to low');
    const giam = await docGiaTatCa(page, 10);
    expect(daSapXep(giam, 'desc'), `giá phải giảm dần: ${giam.join(', ')}`).toBe(true);
  });
});