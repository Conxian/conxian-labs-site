import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const BASE_URL = pathToFileURL(path.resolve('.')).href;

test.describe('Search Functionality', () => {
    test('homepage search should find all four stack surfaces', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const searchInput = page.getByPlaceholder(/Search documentation/i);
        const resultsDropdown = page.locator('.search-results');

        const queries = [
            ['Gateway', 'Gateway'],
            ['Wallet', 'Wallet'],
            ['SDK', 'Conxius Enclave SDK'],
            ['Core', 'Core']
        ] as const;

        for (const [query, expectedKeyword] of queries) {
            await searchInput.fill(query);
            await expect(resultsDropdown).toBeVisible();

            const homeResult = resultsDropdown.locator('a').filter({ hasText: 'Home' }).first();
            await expect(homeResult).toBeVisible();
            await expect(homeResult).toHaveAttribute('href', /index\.html$/);
            await expect(homeResult).toContainText(expectedKeyword);
        }
    });

    test('SDK search result should use the canonical identity', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const searchInput = page.getByPlaceholder(/Search documentation/i);
        const resultsDropdown = page.locator('.search-results');

        await searchInput.fill('SDK');

        const sdkResult = resultsDropdown.locator('a[href$="sdk/index.html"]');
        await expect(sdkResult).toBeVisible();
        await expect(sdkResult).toHaveAttribute('href', /sdk\/index\.html$/);
        await expect(sdkResult).toContainText('Beta/conditional');
        await expect(sdkResult).not.toContainText('Conclave SDK');
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
