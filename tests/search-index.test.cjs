const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// search.js is a hand-maintained index. Two failure modes had crept in: an entry
// pointing at a page that does not exist, and an entry claiming a surface it
// does not own (the BOS entry pointed at the Enterprise page even though a real
// /bos page exists). This test keeps every target resolvable.
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "search.js"), "utf8");

function entries() {
    const out = [];
    const pattern = /\{\s*title:\s*'([^']*)'[\s\S]*?url:\s*'([^']*)'/g;
    for (const match of source.matchAll(pattern)) {
        out.push({ title: match[1], url: match[2] });
    }
    return out;
}

test("every search entry points at a file that exists", () => {
    const list = entries();
    assert.ok(list.length >= 15, "search index should cover the site");
    const missing = [];
    for (const entry of list) {
        const target = path.join(root, entry.url.split("#")[0]);
        if (!fs.existsSync(target)) missing.push(`${entry.title} -> ${entry.url}`);
    }
    assert.deepEqual(missing, [], `search entries with missing targets: ${missing.join(", ")}`);
});

test("search anchors resolve to real section ids on the target page", () => {
    const broken = [];
    for (const entry of entries()) {
        const [file, fragment] = entry.url.split("#");
        if (!fragment) continue;
        const target = path.join(root, file);
        if (!fs.existsSync(target)) continue;
        const html = fs.readFileSync(target, "utf8");
        if (!html.includes(`id="${fragment}"`)) broken.push(`${entry.title} -> ${entry.url}`);
    }
    assert.deepEqual(broken, [], `search entries with missing anchors: ${broken.join(", ")}`);
});

test("BOS search entry targets the BOS page, not Enterprise", () => {
    const bos = entries().find(e => e.title.startsWith("Business Operating System"));
    assert.ok(bos, "BOS entry must exist");
    assert.equal(bos.url, "bos/index.html");
});
