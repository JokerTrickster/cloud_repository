import { test, expect } from '@playwright/test';

test.describe('Video Duration Position Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication
        await page.goto('/login');
        await page.evaluate(() => {
            localStorage.setItem('accessToken', 'mock-access-token');
            localStorage.setItem('refreshToken', 'mock-refresh-token');
        });

        // Mock API to return a video file
        await page.route('**/api/v1/files*', async route => {
            await route.fulfill({
                json: {
                    files: [
                        {
                            id: 1,
                            file_name: 'test-video.mp4',
                            file_type: 'video',
                            url: 'http://mock-url/video.mp4',
                            thumbnail_url: 'http://mock-url/thumb.jpg',
                            duration: 120.5, // 2:00
                            tags: [],
                            created_at: '2023-01-01T00:00:00Z'
                        }
                    ],
                    total_count: 1,
                    page: 1,
                    page_size: 20
                }
            });
        });

        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    });

    test('should display video duration at top-left', async ({ page }) => {
        await page.goto('/gallery');

        // Wait for the duration text to appear
        const durationElement = page.locator('text=02:00');
        await expect(durationElement).toBeVisible();

        // Check styles
        // We expect top: 8px and left: 8px
        // Note: Playwright's toHaveCSS checks computed values, which might be in pixels.
        await expect(durationElement).toHaveCSS('top', '8px');
        await expect(durationElement).toHaveCSS('left', '8px');
        await expect(durationElement).toHaveCSS('position', 'absolute');
    });
});
