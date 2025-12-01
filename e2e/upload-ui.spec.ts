import { test, expect } from '@playwright/test';

test.describe('Upload UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication BEFORE any page load
        await page.addInitScript(() => {
            localStorage.setItem('accessToken', 'mock-access-token');
            localStorage.setItem('refreshToken', 'mock-refresh-token');
        });

        // Block WebSocket connections entirely
        await page.route('**/ws*', route => route.abort());
        await page.route('ws://**', route => route.abort());
        await page.route('wss://**', route => route.abort());

        // Mock batch upload endpoint first (more specific route)
        await page.route('**/api/v1/files/upload/batch', async route => {
            console.log('Mock hit: /api/v1/files/upload/batch');
            await route.fulfill({
                json: {
                    results: [
                        { file_id: 1, s3_key: 'key1', upload_url: 'http://mock-s3-url/1' }
                    ]
                }
            });
        });

        // Mock file listing endpoint (general route)
        await page.route('**/api/v1/files', async route => {
            console.log('Mock hit: /api/v1/files (listing)');
            await route.fulfill({
                json: {
                    files: [],
                    total_count: 0,
                    page: 1,
                    page_size: 20
                }
            });
        });

        // Mock user stats endpoint
        await page.route('**/api/v1/user/stats', async route => {
            console.log('Mock hit: /api/v1/user/stats');
            await route.fulfill({
                json: {
                    storage: {
                        used: 0,
                        total: 1073741824, // 1GB
                        used_percentage: 0
                    },
                    file_count: 0
                }
            });
        });

        // Mock user activity endpoint
        await page.route('**/api/v1/user/activity*', async route => {
            console.log('Mock hit: /api/v1/user/activity');
            await route.fulfill({
                json: {
                    activities: []
                }
            });
        });

        // Mock S3 upload
        await page.route('http://mock-s3-url/*', async route => {
            await route.fulfill({ status: 200 });
        });

        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    });

    test('should show loading indicator and result summary', async ({ page }) => {
        // First navigate to a route that works (gallery) to ensure app loads
        await page.goto('/gallery');
        await page.waitForLoadState('networkidle');

        // Then navigate to upload
        await page.goto('/upload');
        await page.waitForLoadState('networkidle');

        // Create a dummy file
        const buffer = Buffer.from('dummy content');
        const file = {
            name: 'test-file.jpg',
            mimeType: 'image/jpeg',
            buffer,
        };

        // Upload file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles([file]);

        // Click upload button
        await page.click('button:has-text("업로드 시작")');

        // Check for loading indicator
        await expect(page.locator('text=업로드 중입니다...')).toBeVisible();

        // Check for result summary
        await expect(page.locator('text=업로드 완료!')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=총 1개 중 1개 성공, 0개 실패')).toBeVisible();
    });
});
