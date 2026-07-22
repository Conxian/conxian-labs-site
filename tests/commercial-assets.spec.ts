import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const BASE_URL = pathToFileURL(path.resolve('.')).href;
const COMMERCIAL_URL = `${BASE_URL}/commercial/index.html`;
const PILOT_URL = `${BASE_URL}/commercial/pilot/index.html`;

test.describe('Commercial asset pack', () => {
    test('commercial brief covers all four public surfaces and buyer paths', async ({ page }) => {
        await page.goto(COMMERCIAL_URL);

        await expect(page).toHaveTitle(/Commercial Brief/);
        await expect(page.getByRole('heading', { name: 'A proof-first path from software evidence to scoped engagement.' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Read the scoped pilot brief' })).toHaveAttribute('href', '/commercial/pilot');
        await expect(page.getByRole('link', { name: 'Review packaging guidance' })).toHaveAttribute('href', '/pricing');

        const surfaces = [
            ['#commercial-gateway', 'Gateway', 'Beta / pilot-first', 'https://github.com/Conxian/conxian-gateway'],
            ['#commercial-wallet', 'Wallet', 'Stable reference client', 'https://github.com/Conxian/conxius-wallet'],
            ['#commercial-sdk', 'Conxius Enclave SDK', 'Beta / conditional', 'https://github.com/Conxian/conxius-enclave-sdk'],
            ['#commercial-core', 'Core', 'Live shared foundation', 'https://github.com/Conxian/lib-conxian-core']
        ] as const;

        for (const [selector, heading, maturity, proofUrl] of surfaces) {
            const card = page.locator(selector);
            await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible();
            await expect(card).toContainText(maturity);
            await expect(card.locator(`a[href="${proofUrl}"]`)).toBeVisible();
        }

        const mainText = await page.locator('main').innerText();
        expect(mainText).toMatch(/no generally available hosted endpoint/i);
        expect(mainText).toMatch(/no custody of funds, assets, private keys, or signing control/i);
        expect(mainText).toMatch(/Core is.*not a paid fourth tier/i);
        expect(mainText).toMatch(/no uptime, SLA, operational guarantee/i);
        expect(mainText).toMatch(/no fixed public price, quota, credit balance/i);
        expect(mainText).not.toMatch(/Gateway Fusion|Nexus Proofs|Sovereign Wallet/i);
        expect(mainText).not.toMatch(/production-ready integrations|guaranteed uptime|operational guarantees/i);
    });

    test('pilot brief covers scope, boundaries, inputs, criteria, stages, and exits', async ({ page }) => {
        await page.goto(PILOT_URL);

        await expect(page).toHaveTitle(/Scoped Pilot Brief/);
        for (const heading of [
            'Recommended pilot scope',
            'Product boundaries in the pilot',
            'Required customer inputs',
            'Measurable success criteria',
            'Time-boxed stages and checkpoints',
            'Evidence checkpoints',
            'Explicit non-goals',
            'Exit paths'
        ]) {
            await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        }

        for (const phrase of [
            'Gateway // Beta',
            'Wallet // stable reference',
            'SDK // Beta / conditional',
            'Core // live foundation',
            'No generally available hosted Gateway endpoint',
            'No custody of funds, assets, private keys, or signing control',
            'No uptime, SLA, operational guarantee',
            'Stop, continue with a new scope, or move to contract discovery'
        ]) {
            await expect(page.locator('main')).toContainText(phrase);
        }

        await expect(page.getByRole('link', { name: 'Back to the buyer brief' })).toHaveAttribute('href', '/commercial');
        await expect(page.getByRole('link', { name: 'Review packaging guidance' })).toHaveAttribute('href', '/pricing');
    });

    test('commercial routes are wired consistently and remain usable on mobile', async ({ page }) => {
        // Route rewrites are deployment-preview behavior; a file-based test cannot verify them
        // without introducing a fake rewrite server. Validate /commercial and /commercial/pilot
        // on a Render preview instead of adding local infrastructure that would mask that risk.
        const renderSource = fs.readFileSync(path.join(process.cwd(), 'render.yaml'), 'utf8');
        const searchSource = fs.readFileSync(path.join(process.cwd(), 'search.js'), 'utf8');
        const sitemapSource = fs.readFileSync(path.join(process.cwd(), 'sitemap.xml'), 'utf8');
        const pricingSource = fs.readFileSync(path.join(process.cwd(), 'pricing/index.html'), 'utf8');

        expect(renderSource).toContain('source: "/commercial/pilot/*"');
        expect(renderSource).toContain('destination: "/commercial/pilot/index.html"');
        expect(renderSource).toContain('source: "/commercial/*"');
        expect(renderSource).toContain('destination: "/commercial/index.html"');
        expect(searchSource).toContain("url: 'commercial/index.html'");
        expect(searchSource).toContain("url: 'commercial/pilot/index.html'");
        expect(sitemapSource).toContain('https://www.conxian-labs.com/commercial</loc>');
        expect(sitemapSource).toContain('https://www.conxian-labs.com/commercial/pilot</loc>');
        expect(pricingSource).toContain('Conxius Enclave SDK');
        expect(pricingSource).not.toContain('Conclave SDK');

        for (const url of [COMMERCIAL_URL, PILOT_URL]) {
            await page.setViewportSize({ width: 375, height: 900 });
            await page.goto(url);
            const widths = await page.evaluate(() => ({
                documentScrollWidth: document.documentElement.scrollWidth,
                documentClientWidth: document.documentElement.clientWidth,
                bodyScrollWidth: document.body.scrollWidth,
                bodyClientWidth: document.body.clientWidth
            }));

            expect(widths.documentScrollWidth).toBeLessThanOrEqual(widths.documentClientWidth);
            expect(widths.bodyScrollWidth).toBeLessThanOrEqual(widths.bodyClientWidth);
            await expect(page.locator('footer')).toBeVisible();
            await expect(page.locator('.subpage-search-input')).toBeVisible();
        }
    });

    test('buyer-facing footers expose commercial paths without nested wrappers', async ({ page }) => {
        for (const pagePath of ['docs', 'partners', 'enterprise']) {
            await page.goto(`${BASE_URL}/${pagePath}/index.html`);

            const footer = page.locator('footer');
            await expect(page.locator('footer > .footer-links')).toHaveCount(1);
            await expect(footer.locator('.footer-links .footer-links')).toHaveCount(0);
            await expect(footer.getByRole('link', { name: 'Commercial', exact: true })).toHaveAttribute('href', '/commercial');
            await expect(footer.getByRole('link', { name: 'Pilot', exact: true })).toHaveAttribute('href', '/commercial/pilot');
        }
    });

    test('Enterprise search metadata is bounded and its Core link is safe', async ({ page }) => {
        const searchSource = fs.readFileSync(path.join(process.cwd(), 'search.js'), 'utf8');

        expect(searchSource).toContain("desc: 'Deployment discovery, governance, and scoped support for Gateway, Wallet, Conxius Enclave SDK, and Core.'");
        expect(searchSource).not.toContain('Enterprise-grade solutions, institutional services, and sovereign infrastructure deployment for regulated entities.');

        await page.goto(`${BASE_URL}/enterprise/index.html`);
        const coreLink = page.locator('a[href="https://github.com/Conxian/lib-conxian-core"]');
        await expect(coreLink).toHaveAttribute('target', '_blank');
        await expect(coreLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('site search discovers the commercial and pilot briefs', async ({ page }) => {
        await page.goto(COMMERCIAL_URL);
        const subpageSearch = page.locator('.subpage-search-input');
        const subpageResults = page.locator('.search-results').first();
        await subpageSearch.fill('Scoped Pilot');
        await expect(subpageResults).toBeVisible();
        await expect(subpageResults).toContainText('Scoped Pilot Brief');

        await page.goto(`${BASE_URL}/index.html`);
        const homepageSearch = page.locator('input[placeholder*="Search documentation"]');
        const homepageResults = page.locator('.search-results').first();
        await homepageSearch.fill('commercial');
        await expect(homepageResults).toBeVisible();
        await expect(homepageResults).toContainText('Commercial Brief');
    });

    test('adjacent public pages avoid stale identities and unsupported boilerplate', async () => {
        const sources = ['docs/index.html', 'partners/index.html', 'enterprise/index.html'].map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8'));
        const prohibited = [
            /production-ready boilerplate/i,
            /production-ready integrations/i,
            /operational guarantees/i,
            /guaranteed uptime/i,
            /Gateway Fusion/i,
            /Nexus Proofs/i,
            /Sovereign Wallet/i,
            /Conclave SDK/i
        ];

        for (const source of sources) {
            for (const pattern of prohibited) {
                expect(source).not.toMatch(pattern);
            }
        }

        expect(sources[0]).toContain('Conxian Gateway');
        expect(sources[0]).toContain('Conxius Wallet');
        expect(sources[0]).toContain('Conxius Enclave SDK');
        expect(sources[0]).toContain('lib-conxian-core');
        expect(sources[2]).toContain('Scoped Support Services');
        expect(sources[2]).toContain('Conxius Enclave SDK');
    });
});
