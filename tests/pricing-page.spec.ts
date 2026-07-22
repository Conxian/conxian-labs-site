import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const PRICING_URL = pathToFileURL(path.resolve('pricing/index.html')).href;

test.describe('Pricing and packaging page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(PRICING_URL);
    });

    test('has semantic sections and all three product package groups', async ({ page }) => {
        await expect(page.locator('main')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Price the operating path/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Payment paths and expectations' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Gateway access matrix' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Plan-level feature matrix' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();

        const productGroups = [
            ['#sdk-packaging', 'Conxius Enclave SDK', ['Sandbox', 'Team', 'Enterprise']],
            ['#gateway-packaging', 'Conxian Gateway', ['Pilot', 'Metered / enabled routes', 'Enterprise']],
            ['#wallet-packaging', 'Conxius Wallet', ['Starter', 'Growth', 'Enterprise']],
        ] as const;

        for (const [selector, product, levels] of productGroups) {
            const group = page.locator(selector);
            await expect(group.getByRole('heading', { name: product })).toBeVisible();
            for (const level of levels) {
                await expect(group.getByRole('heading', { name: level, exact: true })).toBeVisible();
            }
        }

        await expect(page.getByRole('heading', { name: 'Core foundation — outside the paid tiers' })).toBeVisible();
        await expect(page.locator('#core-foundation')).toContainText('not a paid fourth tier');

        await expect(page.locator('footer > .footer-links > .footer-links')).toHaveCount(0);
    });

    test('states commercial boundaries and payment positioning without invented rates', async ({ page }) => {
        const mainText = await page.locator('main').innerText();

        expect(mainText).toMatch(/MIT-licensed and free for local development/i);
        expect(mainText).toMatch(/local\/self-hosted.*pilot/i);
        expect(mainText).toMatch(/route-level x402 \/ Lightning/i);
        expect(mainText).toMatch(/contract or invoice/i);
        expect(mainText).toMatch(/generally available hosted endpoint/i);
        expect(mainText).toMatch(/account ledger.*credit balance.*quota/i);
        expect(mainText).toMatch(/non-custodial/i);
        expect(mainText).toMatch(/Stripe.*optional convenience/i);
        expect(mainText).toMatch(/not the core native rail/i);

        const pricingSections = page.locator('#payment-paths, #product-packaging, #gateway-access, #plan-matrix, #faq');
        const pricingText = (await pricingSections.allInnerTexts()).join('\n');
        const inventedPricingPatterns = [
            /(?:[$€£]\s*\d+(?:[.,]\d+)?|\b(?:USD|EUR|GBP)\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP)\b)/i,
            /\b(?:per[-\s]?call|per[-\s]?month|per[-\s]?credit|credits?|quota)\s*(?:[:=]|of)?\s*\d+(?:[.,]\d+)?\b/i,
            /\b\d+(?:[.,]\d+)?\s*(?:per[-\s]?call|per[-\s]?month|per[-\s]?credit|credits?|quota)\b/i,
            /\b\d+(?:[.,]\d+)?\s+(?:calls?|requests?|credits?|units?)\s+per[-\s]?month\b/i,
        ];

        for (const pattern of inventedPricingPatterns) {
            expect(pricingText).not.toMatch(pattern);
        }
    });

    test('classifies Gateway access families and keeps x402 conditional', async ({ page }) => {
        const gatewayText = await page.locator('#gateway-access').innerText();

        expect(gatewayText).toContain('GET /api/v1/health');
        expect(gatewayText).toContain('GET /api/v1/chains/list');
        expect(gatewayText).toContain('POST /api/v1/chains/bitvm/verify');
        expect(gatewayText).toMatch(/Free \/ local sandbox/i);
        expect(gatewayText).toMatch(/Metered/i);
        expect(gatewayText).toMatch(/Enterprise-only \/ scoped/i);
        expect(gatewayText).toMatch(/x402 \/ Lightning only where enabled and configured/i);
        expect(gatewayText).toMatch(/Institutional message and settlement domains/i);
        expect(gatewayText).toMatch(/enterprise discovery\/manual-review/i);
        expect(gatewayText).toMatch(/route presence or a named domain does not imply a verified production adapter, availability, or access commitment/i);
        expect(gatewayText).not.toMatch(/\b(?:CIPS|SPFS|mBridge|ISO 20022|PAPSS|BRICS)\b/i);
        expect(gatewayText).not.toMatch(/institutional rails/i);
        expect(gatewayText).toMatch(/not a live public endpoint catalog/i);
        expect(gatewayText).toMatch(/SLA.*availability terms.*not promised/i);
    });

    test('covers the plan matrix, FAQ topics, search terms, and accessibility behavior', async ({ page }) => {
        const planTable = page.locator('#plan-feature-matrix');
        await expect(planTable).toHaveCount(1);
        await expect(planTable.locator('caption')).toContainText('Source');
        await expect(planTable.locator('thead th')).toHaveCount(11);
        expect(await planTable.locator('th[scope]').count()).toBeGreaterThan(10);
        expect(await planTable.locator('tbody tr').count()).toBe(9);

        const faqText = await page.locator('#faq').innerText();
        for (const topic of [
            'What is free',
            'commercial license',
            'sandbox and pilot',
            'x402 and Lightning',
            'every endpoint paid',
            'per-call pricing, credits, invoices, or a hybrid',
            'enterprise customers be invoiced',
            'Stripe the payment rail',
            'support is included',
            'white-label',
            'upgrades work',
            'onboarding involve',
            'take custody',
            'hosted Gateway endpoint available',
        ]) {
            expect(faqText).toContain(topic);
        }
        expect(await page.locator('#faq details').count()).toBeGreaterThanOrEqual(14);

        const searchInput = page.locator('.subpage-search-input');
        const searchResults = page.locator('.search-results').first();
        await expect(searchResults).toHaveJSProperty('tagName', 'SECTION');
        await expect(searchResults).toHaveAttribute('aria-label', 'Search results');
        await expect(searchResults).toHaveAttribute('aria-live', 'polite');
        await expect(page.getByRole('region', { name: 'Search results', includeHidden: true })).toHaveCount(1);
        await searchInput.fill('white-label');
        await expect(searchResults).toBeVisible();
        await expect(searchResults).toContainText('Pricing');

        await page.setViewportSize({ width: 375, height: 900 });
        await page.goto(PRICING_URL);
        const overflowState = await page.locator('.pricing-table-scroll').first().evaluate((element) => ({
            overflowX: getComputedStyle(element).overflowX,
            scrollable: element.scrollWidth > element.clientWidth,
        }));
        expect(overflowState.overflowX).toBe('auto');
        expect(overflowState.scrollable).toBe(true);
        await expect(page.locator('.table-scroll-hint')).toHaveCount(2);
        await expect(page.locator('.table-scroll-hint').first()).toHaveText('Scroll horizontally to compare columns.');
        await expect(page.locator('.table-scroll-hint').nth(1)).toHaveText('Scroll horizontally to compare columns.');

        await page.keyboard.press('Tab');
        const focusState = await page.evaluate(() => {
            const active = document.activeElement;
            if (!active) return null;
            const style = getComputedStyle(active);
            return { tagName: active.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
        });
        expect(focusState).not.toBeNull();
        expect(focusState?.outlineStyle).not.toBe('none');
        expect(focusState?.outlineWidth).not.toBe('0px');
    });
});
