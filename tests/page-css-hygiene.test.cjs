const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Shared chrome (header, footer, search box) is injected at runtime by nav.js,
// so the sub-pages must not carry their own copies of that CSS. Eleven pages
// each shipped a byte-identical inline .search-bar/.search-results block that
// was always overridden by css/site.css — dead weight that silently drifted
// from the real styles. This guards against it returning.
const root = path.join(__dirname, "..");

function htmlFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        if (entry.name === "node_modules" || entry.name === ".git") return [];
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return htmlFiles(full);
        return entry.name.endsWith(".html") ? [full] : [];
    });
}

test("no page re-declares the shared search-box CSS inline", () => {
    const offenders = [];
    for (const file of htmlFiles(root)) {
        const html = fs.readFileSync(file, "utf8");
        const style = html.match(/<style>[\s\S]*?<\/style>/g) || [];
        const inline = style.join("\n");
        // The shared search box is styled by css/site.css (.cx-search-wrap ...).
        if (/\.search-bar\s*\{/.test(inline) || /\.search-results\s*\{/.test(inline)) {
            offenders.push(path.relative(root, file));
        }
    }
    assert.deepEqual(offenders, [], `pages re-declaring shared search CSS: ${offenders.join(", ")}`);
});

test("no page ships an empty <style> block", () => {
    const offenders = [];
    for (const file of htmlFiles(root)) {
        const html = fs.readFileSync(file, "utf8");
        const blocks = html.match(/<style>([\s\S]*?)<\/style>/g) || [];
        for (const block of blocks) {
            const inner = block.replace(/<\/?style>/g, "").trim();
            if (inner === "") offenders.push(path.relative(root, file));
        }
    }
    assert.deepEqual(offenders, [], `pages with an empty <style> block: ${offenders.join(", ")}`);
});

test("the research page keeps its #domains anchor and evidence-tier sections", () => {
    const html = fs.readFileSync(path.join(root, "research", "index.html"), "utf8");
    assert.ok(html.includes('id="domains"'), "research page must keep the #domains anchor");
    for (const heading of ["Research Integrity", "Supply-Chain", "Threat Model", "Open Problems"]) {
        assert.ok(html.includes(heading), `research page must keep the ${heading} section`);
    }
});
