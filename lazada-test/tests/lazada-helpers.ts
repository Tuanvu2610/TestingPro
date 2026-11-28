import { Page, Locator } from '@playwright/test';

export const LAZADA_URL = 'https://www.lazada.vn/';

// ---------------------------------------------------------------------------
// Selector ĐÃ XÁC NHẬN từ codegen của nhóm:
//   - ô tìm kiếm: getByRole('searchbox', { name: 'Search in Lazada' })
// Selector CHƯA XÁC NHẬN (đoán, đánh dấu TODO) - kiểm tra bằng Pick locator:
//   - nút tìm kiếm, thẻ sản phẩm trong trang kết quả
// ---------------------------------------------------------------------------
export const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: /search|tìm kiếm/i });

// TODO(codegen): xác nhận nút kính lúp
const searchButton = (page: Page) =>
  page.getByRole('button', { name: /search|tìm kiếm/i }).first();

// TODO(codegen): xác nhận thẻ sản phẩm ở trang kết quả
export const productCards = (page: Page) =>
  page.locator('[data-qa-locator="product-item"]');

export async function openHome(page: Page) {
  await page.goto(LAZADA_URL, { waitUntil: 'domcontentloaded' });
}

export async function submitSearch(page: Page, cach: 'enter' | 'button' = 'enter') {
  if (cach === 'button') {
    const btn = searchButton(page);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      return;
    }
  }
  await searchBox(page).press('Enter');
}

// Mở trang chủ, tìm từ khóa, chờ sang trang kết quả
export async function searchFor(
  page: Page,
  keyword: string,
  cach: 'enter' | 'button' = 'enter',
) {
  await openHome(page);
  await searchBox(page).click();
  await searchBox(page).fill(keyword);
  await submitSearch(page, cach);
  await page.waitForURL(/catalog|tag\/|q=/, { timeout: 30_000 });
}

// Đọc giá (số nguyên VND) từ một thẻ sản phẩm; NaN nếu không đọc được.
// Giá hiển thị dạng "₫ 150.000" hoặc "150.000 ₫".
export async function docGia(card: Locator): Promise<number> {
  const text = await card.innerText();
  // Chỉ lấy số đứng SAU ký hiệu ₫ (tránh nhầm với số ở cuối tên sản phẩm)
  const m = text.match(/₫\s*([\d.,]+)/);
  return m ? Number(m[1].replace(/[.,]/g, '')) : NaN;
}

export async function docGiaTatCa(page: Page, toiDa = 10): Promise<number[]> {
  const cards = productCards(page);
  const n = Math.min(await cards.count(), toiDa);
  const gia: number[] = [];
  for (let i = 0; i < n; i++) gia.push(await docGia(cards.nth(i)));
  return gia.filter((g) => !Number.isNaN(g));
}

export function daSapXep(arr: number[], chieu: 'asc' | 'desc'): boolean {
  return arr.every((v, i) =>
    i === 0 ? true : chieu === 'asc' ? v >= arr[i - 1] : v <= arr[i - 1],
  );
}