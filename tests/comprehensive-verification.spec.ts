import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE_URL = pathToFileURL(path.resolve('.')).href;
const PAGES = [
    'index.html',
    'sdk/index.html',
    'docs/index.html',
    'pricing/index.html',
    'commercial/index.html',
    'commercial/pilot/index.html',
    'partners/index.html',
    'operators/index.html',
    'enterprise/index.html',
    'research/index.html',
    'privacy/index.html',
    'terms/index.html',
    'about/index.html',
    'security/index.html'
];

test.describe('Conxian Labs Comprehensive Site Verification', () => {

    test('all pages should load successfully', async ({ page }) => {
        for (const pagePath of PAGES) {
            const url = `${BASE_URL}/${pagePath}`;
            await page.goto(url);
            if (pagePath === 'privacy/index.html') {
                await expect(page).toHaveTitle(/Privacy Protocol/);
            } else if (pagePath === 'terms/index.html') {
                await expect(page).toHaveTitle(/Terms/);
            } else {
                await expect(page).toHaveTitle(/Conxian/);
            }
        }
    });

    test('landing page terminal hash should animate', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const initialHash = await page.textContent('#terminal-hash');

        // Wait for animation interval + buffer
        await page.waitForTimeout(6000);

        const newHash = await page.textContent('#terminal-hash');
        expect(newHash).not.toBe(initialHash);
    });

    test('homepage should expose the four proof-first stack surfaces', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);

        await expect(page.getByRole('link', { name: 'Explore the stack' })).toHaveAttribute('href', '#products');
        await expect(page.locator('main').getByRole('link', { name: 'Enterprise', exact: true }).first()).toHaveAttribute('href', '/enterprise');

        const products = page.locator('#products');
        await expect(products).toBeVisible();

        const surfaces = [
            ['gateway', 'Gateway', 'https://github.com/Conxian/conxian-gateway', 'Beta'],
            ['wallet', 'Wallet', 'https://github.com/Conxian/conxius-wallet', 'Stable reference client'],
            ['sdk', 'Conxius Enclave SDK', 'https://github.com/Conxian/conxius-enclave-sdk', 'Beta / conditional'],
            ['core', 'Core primitives', 'https://github.com/Conxian/lib-conxian-core', 'Shared foundation']
        ] as const;

        for (const [id, heading, sourceUrl, maturity] of surfaces) {
            const card = products.locator(`#product-${id}`);
            await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible();
            await expect(card).toContainText(maturity);
            await expect(card.locator(`a[href="${sourceUrl}"]`)).toBeVisible();
        }

        for (const href of ['/docs', '/security', '/research', '/enterprise']) {
            await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
        }
    });

    test('docs page should state conxian-market and deprecation posture', async ({ page }) => {
        await page.goto(`${BASE_URL}/docs/index.html`);
        await expect(page.locator('main')).toContainText('conxian-market');
        await expect(page.locator('main')).toContainText('Conxian/Conxian');
        await expect(page.locator('main')).toContainText('deprecated');
    });

    test('mobile navigation should open and close', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/index.html`);

        const menuButton = page.locator('[data-mobile-menu-button]');
        const menuIcon = menuButton.locator('.menu-trigger-icon');
        const closeIcon = menuButton.locator('.menu-close-icon');
        const mobileMenu = page.locator('#mobile-menu');
        await expect(menuButton).toBeVisible();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
        await expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
        await expect(menuIcon).toHaveClass(/menu-trigger-icon/);
        await expect(menuIcon).toHaveAttribute('aria-hidden', 'true');
        await expect(closeIcon).toHaveClass(/menu-close-icon/);
        await expect(closeIcon).toHaveAttribute('aria-hidden', 'true');
        await expect(menuIcon).toBeVisible();
        await expect(closeIcon).not.toBeVisible();
        expect(await menuButton.locator('.material-symbols-outlined:visible').count()).toBe(1);
        await expect(mobileMenu).not.toBeVisible();

        await menuButton.click();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        await expect(menuButton).toHaveAttribute('aria-label', 'Close navigation menu');
        await expect(menuIcon).not.toBeVisible();
        await expect(closeIcon).toBeVisible();
        expect(await menuButton.locator('.material-symbols-outlined:visible').count()).toBe(1);
        await expect(mobileMenu).toBeVisible();
        await expect(mobileMenu.getByRole('link', { name: 'Stack', exact: true })).toHaveAttribute('href', '#products');

        await menuButton.click();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
        await expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
        await expect(mobileMenu).not.toBeVisible();
    });

    test('homepage should not overflow horizontally at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/index.html`);

        const widths = await page.evaluate(() => ({
            documentScrollWidth: document.documentElement.scrollWidth,
            documentClientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            bodyClientWidth: document.body.clientWidth
        }));

        expect(widths.documentScrollWidth).toBeLessThanOrEqual(widths.documentClientWidth);
        expect(widths.bodyScrollWidth).toBeLessThanOrEqual(widths.bodyClientWidth);
    });

    test('SDK public identity and claims should stay canonical and evidence-grounded', async ({ page }) => {
        const sdkSource = fs.readFileSync(path.join(process.cwd(), 'sdk/index.html'), 'utf8');
        const searchSource = fs.readFileSync(path.join(process.cwd(), 'search.js'), 'utf8');
        const changedSurfaces = [sdkSource, searchSource];
        const staleReferences = [
            'lib-conclave-sdk',
            'gateway.conxian-labs.com',
            'vault.conxian-labs.com',
            'nexus.conxian-labs.com',
            'Conclave SDK'
        ];

        for (const source of changedSurfaces) {
            for (const staleReference of staleReferences) {
                expect(source).not.toContain(staleReference);
            }
        }

        await page.goto(`${BASE_URL}/sdk/index.html`);
        await expect(page.getByRole('heading', { name: 'Conxius Enclave SDK', exact: true })).toBeVisible();
        await expect(page.locator('main')).toContainText('Beta/conditional');
        await expect(page.locator('main')).toContainText('Cross-platform enclave and key-management boundaries');
        await expect(page.locator('main')).toContainText('Secure signing');
        await expect(page.locator('main')).toContainText('Attestation interfaces');
        await expect(page.locator('main')).not.toContainText('Conclave SDK');
        await expect(page.getByRole('link', { name: 'View SDK source' })).toHaveAttribute('href', 'https://github.com/Conxian/conxius-enclave-sdk');
    });

    test('internal links should be valid across all pages', async ({ page }) => {
        for (const pagePath of PAGES) {
            await page.goto(`${BASE_URL}/${pagePath}`);
            const navLinks = await page.locator('a[href^="/"]').all();

            for (const link of navLinks) {
                const href = await link.getAttribute('href');
                if (href && href !== '/') {
                    const relativePath = href.startsWith('/') ? href.substring(1) : href;
                    const fullPath = path.join(process.cwd(), relativePath);

                    let exists = false;
                    if (fs.existsSync(fullPath)) {
                        if (fs.statSync(fullPath).isDirectory()) {
                            exists = fs.existsSync(path.join(fullPath, 'index.html'));
                        } else {
                            exists = true;
                        }
                    }

                    expect(exists, `Link to ${href} on ${pagePath} is broken (path: ${fullPath})`).toBe(true);
                }
            }
        }
    });

    test('sub-pages should follow package-page design system', async ({ page }) => {
        // Terms page as representative of sub-pages
        await page.goto(`${BASE_URL}/terms/index.html`);

        const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bgColor).toBe('rgb(253, 251, 247)'); // #FDFBF7

        const logoBg = await page.evaluate(() => {
            const container = document.querySelector('.logo-container');
            return container ? getComputedStyle(container).backgroundColor : null;
        });
        expect(logoBg).toBe('rgb(0, 0, 0)');

        const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
        expect(fontFamily).toContain('JetBrains Mono');
    });

    test('main navigation elements presence', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);

        // Header
        await expect(page.locator('header')).toBeVisible();
        // Footer
        await expect(page.locator('footer')).toBeVisible();

        // Search bar
        await expect(page.getByPlaceholder(/Search documentation/i)).toBeVisible();
    });

    test('viewport responsiveness check', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // Mobile
        await page.goto(`${BASE_URL}/index.html`);
        const heroTitle = page.locator('h1');
        await expect(heroTitle).toBeVisible();

        const searchBar = page.getByPlaceholder(/Search documentation/i);
        await expect(searchBar).not.toBeVisible();

        await page.setViewportSize({ width: 1440, height: 900 }); // Desktop
        await page.goto(`${BASE_URL}/index.html`);
        await expect(searchBar).toBeVisible();
    });
});
