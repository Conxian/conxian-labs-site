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
    'bos/index.html',
    'research/index.html',
    'privacy/index.html',
    'terms/index.html',
    'about/index.html',
    'security/index.html',
    'status/index.html',
    'get-started/index.html',
    'console/index.html'
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

    test('landing page shows a live status card', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        await expect(page.locator('#hero-status')).toBeVisible();
        // Fails visible: under file:// the fetch rejects and the card says so.
        await expect(page.locator('#hero-status-line')).not.toBeEmpty();
    });

    test('homepage should expose the product surfaces and provisioning path', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);

        await expect(page.getByRole('link', { name: 'Request access' }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'Open console' }).first()).toHaveAttribute('href', '/console');
        await expect(page.getByRole('link', { name: 'See pricing' }).first()).toHaveAttribute('href', '/pricing');

        const products = page.locator('#products');
        await expect(products).toBeVisible();

        const surfaces = [
            ['Managed gateway', '/docs#gateway'],
            ['Enclave SDK', '/sdk#integration-scope'],
            ['Conxius Wallet', '/enterprise#capabilities'],
            ['Nexus node', '/research#domains'],
            ['Market engine', '/commercial#market'],
            ['Core library', '/docs#core'],
        ] as const;

        for (const [heading, href] of surfaces) {
            const card = products.getByRole('heading', { name: heading, exact: true });
            await expect(card).toBeVisible();
            await expect(card.locator('xpath=..').locator(`a[href="${href}"]`)).toBeVisible();
        }

        // Conversion sections present
        await expect(page.locator('#pricing-preview')).toBeVisible();
        await expect(page.locator('#cx-nav')).toBeVisible();
        await expect(page.locator('#cx-footer')).toBeVisible();
    });

    test('customer journey and console pages expose provisioning and cancellation', async ({ page }) => {
        await page.goto(`${BASE_URL}/get-started/index.html`);
        await expect(page.getByRole('heading', { name: /From request to a running service/i })).toBeVisible();
        // Request access routes to the on-page gated intake, with a mailto fallback.
        await expect(page.locator('main').getByRole('link', { name: 'Request access' }).first()).toHaveAttribute('href', '#request-access');
        await expect(page.locator('main a[href^="mailto:labs@conxian-labs.com"]').first()).toBeVisible();
        await expect(page.locator('#access-form')).toBeVisible();

        await page.goto(`${BASE_URL}/console/index.html`);
        await expect(page.getByRole('heading', { name: /Provision, manage, and cancel/i })).toBeVisible();
        await expect(page.locator('main').getByRole('link', { name: 'Request access' }).first()).toHaveAttribute('href', '/get-started#request-access');
        await expect(page.locator('main')).toContainText('cancel');
        // No customer-facing link may point at the internal BOS operator surface.
        await expect(page.locator('main a[href*="bos.conxian-labs.com"]')).toHaveCount(0);
    });

    test('docs page should state conxian-market and active ecosystem components', async ({ page }) => {
        await page.goto(`${BASE_URL}/docs/index.html`);
        await expect(page.locator('main')).toContainText('conxian-market');
        await expect(page.locator('main')).toContainText('lib-conxian-core');
    });

    test('mobile navigation should open and close', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`${BASE_URL}/index.html`);

        const menuButton = page.locator('#cx-burger');
        const mobileMenu = page.locator('#cx-mobile');
        await expect(menuButton).toBeVisible();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
        await expect(mobileMenu).not.toBeVisible();

        await menuButton.click();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        await expect(mobileMenu).toBeVisible();
        await expect(mobileMenu.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute('href', '/pricing');

        await menuButton.click();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
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
                    // In-page anchors (e.g. /docs#gateway) address a section of a
                    // real page, so resolve the path portion and verify the
                    // fragment actually exists on the target page.
                    const [pathname, fragment] = href.split('#');
                    const relativePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
                    const fullPath = path.join(process.cwd(), relativePath);

                    let exists = false;
                    let target = fullPath;
                    if (fs.existsSync(fullPath)) {
                        if (fs.statSync(fullPath).isDirectory()) {
                            target = path.join(fullPath, 'index.html');
                            exists = fs.existsSync(target);
                        } else {
                            exists = true;
                        }
                    }

                    expect(exists, `Link to ${href} on ${pagePath} is broken (path: ${fullPath})`).toBe(true);

                    if (fragment && fs.existsSync(target) && path.extname(target) === '.html') {
                        const markup = fs.readFileSync(target, 'utf8');
                        expect(
                            markup.includes(`id="${fragment}"`) || markup.includes(`name="${fragment}"`),
                            `Anchor #${fragment} in ${href} (from ${pagePath}) does not exist on ${relativePath}`,
                        ).toBe(true);
                    }
                }
            }
        }
    });

    test('sub-pages should follow package-page design system', async ({ page }) => {
        // Terms page as representative of sub-pages
        await page.goto(`${BASE_URL}/terms/index.html`);

        const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bgColor).toBe('rgb(253, 251, 247)'); // #FDFBF7

        const brandText = await page.evaluate(() => {
            const el = document.querySelector('.cx-brand-text');
            return el ? el.textContent : null;
        });
        expect(brandText).toContain('CONXIAN');

        const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
        expect(fontFamily).toContain('JetBrains Mono');
    });

    test('main navigation elements presence', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);

        // Header (shared shell)
        await expect(page.locator('#cx-nav')).toBeVisible();
        // Footer (shared shell)
        await expect(page.locator('#cx-footer')).toBeVisible();
        // Auth pair present. The customer console link must not target the
        // internal BOS control plane.
        await expect(page.locator('#cx-nav').getByRole('link', { name: 'Console' })).toHaveAttribute('href', '/console');
        await expect(page.locator('#cx-nav').getByRole('link', { name: 'Request access' })).toBeVisible();
        await expect(page.locator('#cx-nav a[href*="bos.conxian-labs.com"]')).toHaveCount(0);
    });

    test('viewport responsiveness check', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // Mobile
        await page.goto(`${BASE_URL}/index.html`);
        const heroTitle = page.locator('h1');
        await expect(heroTitle).toBeVisible();

        const burger = page.locator('#cx-burger');
        await expect(burger).toBeVisible();

        await page.setViewportSize({ width: 1440, height: 900 }); // Desktop
        await page.goto(`${BASE_URL}/index.html`);
        await expect(burger).not.toBeVisible();
    });
    test("server API endpoints /api/health, /api/services, and /api/site-map structure", async ({ request }) => {
        // Express app module testing via API request context or local server spawn
        const server = require("../server.js");
        const http = require("http");

        await new Promise((resolve) => {
            const s = http.createServer(server);
            s.listen(0, async () => {
                const port = s.address().port;

                // Test /api/health
                const healthRes = await fetch(`http://localhost:${port}/api/health`);
                expect(healthRes.status).toBe(200);
                const healthJson = await healthRes.json();
                expect(healthJson.status).toBe("healthy");
                expect(healthJson.service).toBe("conxian-labs-site");
                expect(healthJson.infrastructure.provider).toBe("Render");
                expect(healthJson.infrastructure.databases).toContain("market");

                // Test /api/services
                const servicesRes = await fetch(`http://localhost:${port}/api/services`);
                expect(servicesRes.status).toBe(200);
                const servicesJson = await servicesRes.json();
                expect(servicesJson.status).toBe("unverified");
                expect(servicesJson.productionSupported).toBe(false);
                expect(servicesJson.scope).toBe("reference-catalog");
                expect(servicesJson.domains.protocol).toBe("conxian.org");
                expect(servicesJson.domains.corporate).toBe("conxian-labs.com");
                expect(servicesJson.routingMatrix["conxian-nexus"]).toBe("nexus.conxian.org");

                // Test /api/site-map
                const mapRes = await fetch(`http://localhost:${port}/api/site-map`);
                expect(mapRes.status).toBe(200);
                const mapJson = await mapRes.json();
                expect(mapJson.total).toBe(18);
                expect(mapJson.routes.some(r => r.route === "/commercial/pilot")).toBe(true);
                expect(mapJson.routes.some(r => r.route === "/bos")).toBe(true);
                expect(mapJson.routes.some(r => r.route === "/status")).toBe(true);
                expect(mapJson.routes.some(r => r.route === "/get-started")).toBe(true);
                expect(mapJson.routes.some(r => r.route === "/console")).toBe(true);

                s.close(resolve);
            });
        });
    });

    test("sitemap.xml has valid formatting and covers all 18 surfaces", async () => {
        const sitemapContent = fs.readFileSync(path.join(process.cwd(), "sitemap.xml"), "utf8");
        expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(sitemapContent).toContain("<loc>https://www.conxian-labs.com/commercial/pilot</loc>");
        expect(sitemapContent).toContain("<loc>https://www.conxian-labs.com/bos</loc>");
        expect(sitemapContent).toContain("<loc>https://www.conxian-labs.com/status</loc>");
        expect(sitemapContent).toContain("<loc>https://www.conxian-labs.com/get-started</loc>");
        expect(sitemapContent).toContain("<loc>https://www.conxian-labs.com/console</loc>");
        expect(sitemapContent).toContain("<lastmod>2026-08-27</lastmod>");
        const urlCount = (sitemapContent.match(/<url>/g) || []).length;
        expect(urlCount).toBe(18);
    });
});
