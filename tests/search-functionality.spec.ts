import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const BASE_URL = pathToFileURL(path.resolve('.')).href;

test.describe('Search Functionality', () => {
    test('homepage search should show results', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const searchInput = page.getByPlaceholder(/Search documentation/i);
        await searchInput.fill('SDK');

        const resultsDropdown = page.locator('.search-results');
        await expect(resultsDropdown).toBeVisible();

        const firstResult = resultsDropdown.locator('a').first();
        await expect(firstResult).toContainText('SDK');
    });

    test('sub-page search should show results', async ({ page }) => {
        await page.goto(`${BASE_URL}/sdk/index.html`);
        const searchInput = page.locator('.subpage-search-input');
        await searchInput.fill('Docs');

        const resultsDropdown = page.locator('.search-results').first();
        await expect(resultsDropdown).toBeVisible();

        const firstResult = resultsDropdown.locator('a').first();
        await expect(firstResult).toContainText('Docs');
    });

    test('search should navigate on enter', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const searchInput = page.getByPlaceholder(/Search documentation/i);
        await searchInput.fill('Pricing');
        await searchInput.press('ArrowDown');
        await searchInput.press('Enter');

        await expect(page).toHaveURL(/.*pricing/);
    });
});
