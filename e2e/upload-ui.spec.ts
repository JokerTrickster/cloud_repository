import { test, expect } from '@playwright/test';

test.describe('Upload UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication
        await page.goto('/login');
        await page.evaluate(() => {
            localStorage.setItem('accessToken', 'mock-access-token');
            localStorage.setItem('refreshToken', 'mock-refresh-token');
        });

        // Mock API endpoints
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

        // Mock S3 upload
        await page.route('http://mock-s3-url/*', async route => {
            await route.fulfill({ status: 200 });
        });

        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    });

    test('should show loading indicator and result summary', async ({ page }) => {
        await page.goto('/upload');

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
