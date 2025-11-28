import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Large File Upload Test', () => {
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
                        {
                            file_id: 1,
                            s3_key: 'large-file-key',
                            upload_url: 'http://localhost:5173/mock-s3-upload/large-file',
                            thumbnail_upload_url: 'http://localhost:5173/mock-s3-upload/thumbnail'
                        }
                    ]
                }
            });
        });

        // Mock S3 upload endpoint
        await page.route('**/mock-s3-upload/*', async route => {
            console.log(`Mock S3 upload hit: ${route.request().url()}`);
            const buffer = await route.request().postDataBuffer();
            if (buffer) {
                console.log(`Received upload size: ${buffer.length} bytes`);
            } else {
                const contentLength = route.request().headers()['content-length'];
                console.log(`Received large upload (buffer null). Content-Length: ${contentLength}`);
            }
            await route.fulfill({ status: 200 });
        });

        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    });

    test('should handle large file upload (50MB)', async ({ page }) => {
        test.setTimeout(120000); // Increase timeout for large file

        await page.goto('/upload');

        // Create a large dummy file (51MB to be sure)
        const fileSizeInBytes = 51 * 1024 * 1024;
        const tempFilePath = path.join(process.cwd(), 'large-test-file.mp4');

        // Write a large file efficiently
        const buffer = Buffer.alloc(fileSizeInBytes, 'a');
        fs.writeFileSync(tempFilePath, buffer);

        // Upload file using path
        console.log('Setting input files...');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(tempFilePath);

        // Clean up after test (in a finally block or after upload starts)
        // We'll clean up at the end of the test


        // Click upload button
        console.log('Clicking upload button...');
        await page.click('button:has-text("업로드 시작")');

        // Check for loading indicator
        await expect(page.locator('text=업로드 중입니다...')).toBeVisible();

        // Check for result summary
        // The upload might take some time, so we wait for the success message
        await expect(page.locator('text=업로드 완료!')).toBeVisible({ timeout: 60000 });

        // Verify success count
        await expect(page.locator('text=총 1개 중 1개 성공')).toBeVisible();

        // Cleanup
        try {
            fs.unlinkSync(tempFilePath);
        } catch (e) {
            console.log('Error cleaning up file:', e);
        }
    });
});
