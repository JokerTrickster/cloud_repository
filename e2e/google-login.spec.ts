// e2e/google-login.spec.ts
import { test, expect } from '@playwright/test';

/**
 * This test automates the Google login flow.
 * It requires a test Google account and a valid OAuth client ID configured for the redirect URI.
 * Update the `TEST_GOOGLE_EMAIL` and `TEST_GOOGLE_PASSWORD` environment variables before running.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const GOOGLE_EMAIL = process.env.TEST_GOOGLE_EMAIL;
const GOOGLE_PASSWORD = process.env.TEST_GOOGLE_PASSWORD;

test('Google login redirects to gallery and stores tokens', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Click the Google Sign‑In button
    await page.waitForSelector('#googleSignInButton');
    await page.click('#googleSignInButton');

    // Google sign‑in popup handling
    const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        // The click opens a new window
    ]);

    // Fill Google credentials
    await popup.waitForSelector('input[type="email"]', { timeout: 10000 });
    await popup.fill('input[type="email"]', GOOGLE_EMAIL);
    await popup.click('#identifierNext');

    await popup.waitForSelector('input[type="password"]', { timeout: 10000 });
    await popup.fill('input[type="password"]', GOOGLE_PASSWORD);
    await popup.click('#passwordNext');

    // Wait for redirect back to the app
    await page.waitForURL(url => url.pathname === '/gallery', { timeout: 15000 });

    // Verify that tokens are stored (localStorage example)
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
});
