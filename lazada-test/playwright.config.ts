import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  timeout: 90_000,               // mỗi test được chạy tối đa 90 giây (mặc định chỉ 30)
  expect: { timeout: 15_000 },   // mỗi lệnh expect chờ tối đa 15 giây

  fullyParallel: false,
  workers: 1,                    // chạy lần lượt từng test, đỡ bị Lazada chặn
  retries: 0,

  reporter: 'html',

  use: {
    storageState: 'playwright/.auth/user.json',
    actionTimeout: 20_000,       // mỗi thao tác (click, fill) chờ tối đa 20 giây
    navigationTimeout: 60_000,   // mở trang chờ tối đa 60 giây
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },

    // Bỏ dấu // ở 2 dòng dưới khi làm ORDER-030 (Firefox) hoặc SEARCH-012:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
});