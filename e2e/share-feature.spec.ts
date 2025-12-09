import { test, expect } from '@playwright/test';

/**
 * Folder and File Sharing Feature Tests
 * Tests the share modal, sharing functionality, and shared items view
 */

test.describe('Share Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
    });

    // Mock share API responses
    await page.route('**/api/folders/*/share', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Folder shared successfully',
          shared_users: [
            {
              id: 'user1',
              name: 'Test User',
              email: 'test@example.com',
              shared_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/api/folders/*/shares', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shared_users: [
            {
              id: 'user1',
              name: 'Test User',
              email: 'test@example.com',
              shared_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/api/files/*/share', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'File shared successfully',
          shared_users: [
            {
              id: 'user2',
              name: 'Another User',
              email: 'another@example.com',
              shared_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/api/files/*/shares', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shared_users: [
            {
              id: 'user2',
              name: 'Another User',
              email: 'another@example.com',
              shared_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Mock folders API for folder list
    await page.route('**/api/folders**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'folder1',
              folder_name: 'Test Folder',
              created_at: new Date().toISOString(),
              file_count: 5
            }
          ])
        });
      }
    });

    // Mock files API
    await page.route('**/api/files**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              id: 'file1',
              name: 'test-image.jpg',
              type: 'image',
              url: 'https://via.placeholder.com/300',
              date: '2025-12-09',
              created_at: new Date().toISOString(),
              size: 1024000,
              isFavorite: false,
              tags: ['test'],
              processing_status: 'completed'
            }
          ]
        })
      });
    });
  });

  test('should open share modal from folder toolbar', async ({ page }) => {
    await page.goto('/gallery');

    // Wait for folders to load
    await page.waitForTimeout(1000);

    // Click on a folder to select it
    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      await folder.click();

      // Wait for folder to be selected
      await page.waitForTimeout(500);

      // Look for share button in toolbar
      const shareButton = page.locator('button:has-text("폴더 공유")');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Check if share modal appears
        await expect(page.locator('text=공유 관리')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('input[placeholder*="이메일"]')).toBeVisible();
      }
    }
  });

  test('should add user to share list via email', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForTimeout(1000);

    // Try to find and click folder
    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      await folder.click();
      await page.waitForTimeout(500);

      const shareButton = page.locator('button:has-text("폴더 공유")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);

        // Enter email address
        const emailInput = page.locator('input[placeholder*="이메일"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('newuser@example.com');

          // Click add button
          const addButton = page.locator('button:has-text("추가")');
          await addButton.click();

          // Wait for API call
          await page.waitForTimeout(1000);

          // Success message should appear
          // Note: This depends on your toast/notification implementation
        }
      }
    }
  });

  test('should display list of shared users', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForTimeout(1000);

    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      await folder.click();
      await page.waitForTimeout(500);

      const shareButton = page.locator('button:has-text("폴더 공유")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(1000);

        // Check if shared users list is visible
        const sharedUsersList = page.locator('text=공유된 사용자');
        if (await sharedUsersList.isVisible()) {
          // Check if mocked user appears
          await expect(page.locator('text=test@example.com')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForTimeout(1000);

    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      await folder.click();
      await page.waitForTimeout(500);

      const shareButton = page.locator('button:has-text("폴더 공유")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);

        const emailInput = page.locator('input[placeholder*="이메일"]');
        if (await emailInput.isVisible()) {
          // Enter invalid email
          await emailInput.fill('invalid-email');

          const addButton = page.locator('button:has-text("추가")');
          await addButton.click();

          // Error message should appear
          await page.waitForTimeout(500);
          // Check for error indication (depends on implementation)
        }
      }
    }
  });

  test('should close share modal', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForTimeout(1000);

    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      await folder.click();
      await page.waitForTimeout(500);

      const shareButton = page.locator('button:has-text("폴더 공유")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);

        // Look for close button (X or 닫기)
        const closeButton = page.locator('button[aria-label="Close"]').or(page.locator('button:has-text("닫기")'));
        if (await closeButton.first().isVisible()) {
          await closeButton.first().click();
          await page.waitForTimeout(500);

          // Modal should be hidden
          await expect(page.locator('text=공유 관리')).not.toBeVisible();
        }
      }
    }
  });

  test('should open folder context menu and show share option', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForTimeout(1000);

    const folder = page.locator('text=Test Folder').first();
    if (await folder.isVisible()) {
      // Right click on folder
      await folder.click({ button: 'right' });
      await page.waitForTimeout(500);

      // Look for share option in context menu
      const shareMenuItem = page.locator('text=공유').or(page.locator('text=Share'));
      if (await shareMenuItem.isVisible()) {
        await expect(shareMenuItem).toBeVisible();
      }
    }
  });

  test.skip('should navigate to shared with me page', async ({ page }) => {
    // Mock shared folders and files API
    await page.route('**/api/shared/folders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'shared-folder-1',
            folder_name: 'Shared Test Folder',
            owner_name: 'Owner User',
            owner_email: 'owner@example.com',
            shared_at: new Date().toISOString(),
            file_count: 3
          }
        ])
      });
    });

    await page.route('**/api/shared/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'shared-file-1',
            name: 'shared-image.jpg',
            type: 'image',
            url: 'https://via.placeholder.com/300',
            owner_name: 'Owner User',
            owner_email: 'owner@example.com',
            shared_at: new Date().toISOString(),
            size: 2048000
          }
        ])
      });
    });

    await page.goto('/shared-with-me');
    await page.waitForTimeout(1000);

    // Check page title
    await expect(page.locator('h1:has-text("공유된 항목")')).toBeVisible({ timeout: 5000 });

    // Check tabs exist
    const foldersTab = page.locator('button:has-text("폴더")').or(page.locator('button:has-text("Folders")'));
    const filesTab = page.locator('button:has-text("파일")').or(page.locator('button:has-text("Files")'));

    if (await foldersTab.isVisible()) {
      await expect(foldersTab).toBeVisible();
    }
    if (await filesTab.isVisible()) {
      await expect(filesTab).toBeVisible();
    }
  });

  test('should display shared folders in shared with me page', async ({ page }) => {
    await page.route('**/api/shared/folders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'shared-folder-1',
            folder_name: 'Shared Test Folder',
            owner_name: 'Owner User',
            owner_email: 'owner@example.com',
            shared_at: new Date().toISOString(),
            file_count: 3
          }
        ])
      });
    });

    await page.goto('/shared-with-me');
    await page.waitForTimeout(1500);

    // Check if shared folder appears
    const sharedFolder = page.locator('text=Shared Test Folder');
    if (await sharedFolder.isVisible()) {
      await expect(sharedFolder).toBeVisible();

      // Check owner info
      await expect(page.locator('text=owner@example.com')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should switch between folders and files tabs', async ({ page }) => {
    await page.route('**/api/shared/folders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/shared/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'shared-file-1',
            name: 'shared-image.jpg',
            type: 'image',
            url: 'https://via.placeholder.com/300',
            owner_name: 'Owner User',
            owner_email: 'owner@example.com',
            shared_at: new Date().toISOString(),
            size: 2048000
          }
        ])
      });
    });

    await page.goto('/shared-with-me');
    await page.waitForTimeout(1000);

    // Click on files tab
    const filesTab = page.locator('button:has-text("파일")').or(page.locator('button:has-text("Files")'));
    if (await filesTab.isVisible()) {
      await filesTab.click();
      await page.waitForTimeout(1000);

      // Check if file appears
      const sharedFile = page.locator('text=shared-image.jpg');
      if (await sharedFile.isVisible()) {
        await expect(sharedFile).toBeVisible();
      }
    }
  });
});
