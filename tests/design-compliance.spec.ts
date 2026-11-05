import { test, expect } from '@playwright/test';
import path from 'path';

const PAGE_URL = 'file://' + path.resolve('index.html');

test.describe('Conxian Labs Design Compliance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(PAGE_URL);
    });

    test('should follow Ivory Foundation color palette', async ({ page }) => {
        const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bgColor).toBe('rgb(253, 251, 247)');

        const textMain = await page.evaluate(() => getComputedStyle(document.body).color);
        expect(textMain).toBe('rgb(18, 18, 18)');
    });

    test('should use JetBrains Mono for typography', async ({ page }) => {
        const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
        expect(fontFamily).toContain('JetBrains Mono');
    });

    test('should render the accent brand mark', async ({ page }) => {
        const markBg = await page.evaluate(() => {
            const mark = document.querySelector('.cx-brand-mark');
            return mark ? getComputedStyle(mark).backgroundColor : null;
        });
        expect(markBg).toBe('rgb(194, 94, 0)');
    });

    test('should maintain high contrast for dim text', async ({ page }) => {
        const dimText = await page.evaluate(() => {
            const el = document.createElement('span');
            el.style.color = 'var(--text-dim)';
            document.body.appendChild(el);
            const color = getComputedStyle(el).color;
            el.remove();
            return color;
        });
        expect(dimText).toBe('rgb(85, 85, 85)');
    });
});
