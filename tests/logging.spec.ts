import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const BASE_URL = pathToFileURL(path.resolve('.')).href;

test.describe('Conxian Labs Logging Verification', () => {
    test('should have Logger available on window', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const loggerExists = await page.evaluate(() => typeof window.Logger !== 'undefined');
        expect(loggerExists).toBe(true);
    });

    test('should log initialization message', async ({ page }) => {
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${BASE_URL}/index.html`);

        // Check for init message
        const initLog = logs.some(l => l.includes('[INFO] [LOGGER] Institutional Logger Initialized'));
        expect(initLog).toBe(true);
    });

    test('should log terminal hash cycling', async ({ page }) => {
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${BASE_URL}/index.html`);

        const terminalLog = logs.some(l => l.includes('[INFO] [TERMINAL] Cycling terminal hash'));
        expect(terminalLog).toBe(true);
    });

    test('should capture global errors', async ({ page }) => {
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${BASE_URL}/index.html`);

        // Trigger a fake error
        await page.evaluate(() => {
            setTimeout(() => {
                throw new Error('Test Error for Logger');
            }, 10);
        });

        await page.waitForTimeout(100);

        const errorLog = logs.some(l => l.includes('[FATAL] [GLOBAL] Uncaught Error: Test Error for Logger'));
        expect(errorLog).toBe(true);
    });
});
