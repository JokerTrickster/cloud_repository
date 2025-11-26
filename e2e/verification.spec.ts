import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const GOOGLE_EMAIL = process.env.TEST_GOOGLE_EMAIL;
const GOOGLE_PASSWORD = process.env.TEST_GOOGLE_PASSWORD;

if (!GOOGLE_EMAIL || !GOOGLE_PASSWORD) {
    test.skip(true, 'Skipping verification tests - credentials not provided');
}

test.describe('Verification and Performance', () => {
    test('Full flow: Login, Upload, List, Download, Delete', async ({ page }) => {
        // 1. Login
        await page.goto(`${BASE_URL}/login`);

        // Check if already logged in (if state is preserved) or needs login
        if (await page.isVisible('#googleSignInButton')) {
            console.log('Logging in...');
            await page.click('#googleSignInButton');
            const [popup] = await Promise.all([
                page.waitForEvent('popup'),
            ]);

            await popup.waitForSelector('input[type="email"]');
            await popup.fill('input[type="email"]', GOOGLE_EMAIL);
            await popup.click('#identifierNext');

            await popup.waitForSelector('input[type="password"]');
            await popup.fill('input[type="password"]', GOOGLE_PASSWORD);
            await popup.click('#passwordNext');

            await page.waitForURL(url => url.pathname === '/gallery');
        } else {
            console.log('Already logged in or on gallery page');
        }

        // 2. Upload
        console.log('Uploading file...');
        await page.click('button:has-text("업로드")'); // Click "Upload" button

        // Wait for file chooser
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('text=파일 선택'), // Assuming there is a button/label "파일 선택" in the modal
        ]);

        await fileChooser.setFiles(path.join(__dirname, '../public/vite.svg'));

        // Click upload confirm button in modal
        await page.click('button:has-text("업로드")'); // The button inside the modal to start upload

        // Wait for upload to complete (modal closes or success message)
        await page.waitForTimeout(2000); // Wait for reload

        // 3. Verify List & Performance
        console.log('Verifying list and performance...');

        // Capture console logs for performance
        const performanceLogs = [];
        page.on('console', msg => {
            if (msg.text().startsWith('[Performance]')) {
                performanceLogs.push(msg.text());
                console.log('BROWSER LOG:', msg.text());
            }
        });

        // Reload page to trigger fresh load and performance measurement
        await page.reload();
        await page.waitForSelector('img[alt="vite.svg"]'); // Wait for our uploaded image

        // Wait a bit for images to load and logs to appear
        await page.waitForTimeout(3000);

        expect(performanceLogs.length).toBeGreaterThan(0);

        // 4. Download
        console.log('Downloading file...');
        // Select the file
        await page.click('button:has-text("선택")'); // Enter selection mode
        await page.click('img[alt="vite.svg"]'); // Select the image

        // Click download
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('button[title="다운로드"]'),
        ]);

        // Wait for download to complete
        const path_download = await download.path();
        expect(path_download).toBeTruthy();

        // 5. Delete
        console.log('Deleting file...');
        // File is already selected
        page.on('dialog', dialog => dialog.accept()); // Handle confirm dialog
        await page.click('button[title="삭제"]');

        // Verify deletion
        await page.waitForTimeout(2000);
        const imageVisible = await page.isVisible('img[alt="vite.svg"]');
        expect(imageVisible).toBeFalsy();

        console.log('Test completed successfully');
    });
});
