import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const HOME_URL = pathToFileURL(path.resolve('index.html')).href;

// The desktop menus previously closed the instant the pointer left the trigger,
// so crossing the 8px gap between the trigger and the panel dismissed the menu
// and it was nearly impossible to click an item. These tests pin the hover
// intent (open delay + close grace + gap bridge) and the click/keyboard paths.
test.describe('Primary navigation dropdowns', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HOME_URL);
        await page.waitForSelector('.cx-menu');
    });

    test('menu stays open while the pointer crosses the gap into the panel', async ({ page }) => {
        const menu = page.locator('.cx-menu').first();
        const btn = menu.locator('button');
        const box = (await btn.boundingBox())!;

        await page.mouse.move(box.x + 10, box.y + box.height / 2);
        await expect(menu).toHaveClass(/cx-open/);

        // Pause inside the 8px gap between trigger and panel.
        await page.mouse.move(box.x + 10, box.y + box.height + 4);
        await page.waitForTimeout(120);
        await expect(menu).toHaveClass(/cx-open/);

        // Continue into the panel and click an item without the menu closing.
        const item = menu.locator('.cx-menu-item').first();
        await item.hover();
        await expect(item).toBeVisible();
    });

    test('the panel is bridged to the trigger so the pointer never leaves the menu', async ({ page }) => {
        const panel = page.locator('.cx-menu').first().locator('.cx-menu-panel');
        const bridge = await panel.evaluate(el => getComputedStyle(el, '::before').content);
        expect(bridge).not.toBe('none');
        const height = await panel.evaluate(el => getComputedStyle(el, '::before').height);
        expect(parseFloat(height)).toBeGreaterThan(0);
    });

    test('hovering then clicking keeps the menu open instead of toggling it shut', async ({ page }) => {
        const menu = page.locator('.cx-menu').first();
        const btn = menu.locator('button');
        const box = (await btn.boundingBox())!;

        await page.mouse.move(box.x + 10, box.y + box.height / 2);
        await expect(menu).toHaveClass(/cx-open/);

        await btn.click();
        await expect(menu).toHaveClass(/cx-open/);

        // A second click on the pinned menu closes it.
        await btn.click();
        await expect(menu).not.toHaveClass(/cx-open/);
    });

    test('keyboard opens the menu, focuses items, and Escape returns focus to the trigger', async ({ page }) => {
        const menu = page.locator('.cx-menu').first();
        const btn = menu.locator('button');

        await btn.focus();
        await page.keyboard.press('ArrowDown');
        await expect(menu).toHaveClass(/cx-open/);
        await expect(menu.locator('.cx-menu-item').first()).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(menu).not.toHaveClass(/cx-open/);
        await expect(btn).toBeFocused();
    });

    test('each menu exposes only distinct destinations', async ({ page }) => {
        const count = await page.locator('.cx-menu').count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const hrefs = await page.locator('.cx-menu').nth(i).locator('.cx-menu-item').evaluateAll(
                els => els.map(el => (el as HTMLAnchorElement).getAttribute('href')),
            );
            expect(new Set(hrefs).size, `menu ${i} repeats a destination`).toBe(hrefs.length);
        }
    });

    test('the trailing menu anchors its panel to the right to stay on screen', async ({ page }) => {
        const last = page.locator('.cx-links > .cx-menu').last();
        const panel = last.locator('.cx-menu-panel');
        await last.locator('button').hover();
        await expect(panel).toBeVisible();
        const anchored = await panel.evaluate(el => getComputedStyle(el).right);
        expect(anchored).not.toBe('auto');
    });
});
