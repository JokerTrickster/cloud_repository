import { test, expect } from '@playwright/test';

/**
 * Basic UI tests that don't require authentication
 * Tests the login page and basic navigation
 */

test.describe('Basic UI Tests', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check for CloudBox title
    await expect(page.locator('h1:has-text("CloudBox")')).toBeVisible();

    // Check for description
    await expect(page.locator('text=모든 사진과 동영상을 한 곳에서 안전하게 보관하세요')).toBeVisible();

    // Check for Google sign-in button div exists (button content is rendered by Google SDK)
    await expect(page.locator('#googleSignInButton')).toBeAttached();

    // Check for footer
    await expect(page.locator('text=© 2025 CloudBox Inc.')).toBeVisible();
  });

  test('should navigate to login when not authenticated', async ({ page }) => {
    // Try to access gallery without auth
    await page.goto('/gallery');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to login when accessing mypage without auth', async ({ page }) => {
    // Try to access mypage without auth
    await page.goto('/mypage');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting tokens in localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
    });

    // Mock API endpoints to prevent 401 errors from real server
    await page.route('**/api/v1/files*', async route => {
      await route.fulfill({
        json: {
          files: [],
          total_count: 0,
          page: 1,
          page_size: 20
        }
      });
    });

    await page.route('**/api/v1/user/stats', async route => {
      await route.fulfill({
        json: {
          storage: { used: 0, total: 1000000000, percentage: 0 },
          monthlyStats: { uploads: 0, downloads: 0, tagsCreated: 0 }
        }
      });
    });

    await page.route('**/api/v1/user/activity*', async route => {
      await route.fulfill({ json: {} });
    });
  });

  test('should show gallery page when authenticated', async ({ page }) => {
    await page.goto('/gallery');

    // Should stay on gallery page
    await expect(page).toHaveURL(/\/gallery/);

    // Check for navigation (filter for visible buttons only to handle mobile/desktop differences)
    await expect(page.locator('button:has-text("갤러리"):visible').first()).toBeVisible();
    await expect(page.locator('button:has-text("업로드"):visible').first()).toBeVisible();

    // Check for search input
    await expect(page.locator('input[placeholder*="이름 또는 #태그로 검색"]')).toBeVisible();

    // Check for filter buttons
    await expect(page.locator('button:has-text("전체")').first()).toBeVisible();
    await expect(page.locator('button:has-text("이미지")').first()).toBeVisible();
    await expect(page.locator('button:has-text("동영상")').first()).toBeVisible();
  });

  test('should show mypage with calendar and stats', async ({ page }) => {
    await page.goto('/mypage');

    // Should stay on mypage
    await expect(page).toHaveURL(/\/mypage/);

    // Check for page title
    await expect(page.locator('h1:has-text("마이페이지")')).toBeVisible();

    // Check for logout button
    await expect(page.locator('button:has-text("로그아웃")')).toBeVisible();

    // Check for storage card
    await expect(page.locator('h3:has-text("저장 공간")')).toBeVisible();

    // Check for activity card
    await expect(page.locator('h3:has-text("이번 달 활동")')).toBeVisible();

    // Check for calendar - verify the section exists
    await expect(page.locator('h3:has-text("활동 캘린더")')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await expect(page).toHaveURL(/\/gallery/);

    // Navigate to mypage
    await page.goto('/mypage');
    await expect(page).toHaveURL(/\/mypage/);

    // Navigate back to gallery
    await page.goto('/gallery');
    await expect(page).toHaveURL(/\/gallery/);
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/mypage');

    // Click logout button
    await page.locator('button:has-text("로그아웃")').click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Verify tokens are cleared
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
