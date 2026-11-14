const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The public site is a proof-first surface: every claim must trace to a real
// artifact. This guards the drift that an org-wide audit found — a repo link
// that 404s, a wrong license, a retired product name, and stale deployment
// configuration — so the same mistakes cannot silently return.
const root = path.join(__dirname, "..");

function read(rel) {
    return fs.readFileSync(path.join(root, rel), "utf8");
}

function walkHtml(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkHtml(full, out);
        else if (entry.name.endsWith(".html")) out.push(full);
    }
    return out;
}

const markup = () => walkHtml(root).map(f => ({ file: path.relative(root, f), html: fs.readFileSync(f, "utf8") }));

test("no markup links to the non-existent conxian-market repository", () => {
    const offenders = markup().filter(({ html }) => html.includes("github.com/Conxian/conxian-market"));
    assert.deepEqual(offenders.map(o => o.file), [], "the market repo is Conxian/conxian_market (underscore); the hyphen path 404s");
});

test("Nexus is described as AGPL-3.0, not BUSL-1.1", () => {
    for (const file of ["about/index.html", "docs/index.html", "research/index.html"]) {
        const html = read(file);
        assert.ok(!/BUSL/i.test(html), `${file} still claims a BUSL license; the nexus LICENSE is AGPL-3.0`);
    }
    assert.match(read("about/index.html"), /AGPL-3\.0/);
});

test("the retired 'Conclave SDK' name is not used as a public product label", () => {
    const offenders = markup().filter(({ html }) => /Conclave SDK/.test(html));
    assert.deepEqual(offenders.map(o => o.file), [], "the canonical product name is Conxius Enclave SDK");
});

test("the homepage repository count matches the live public org repo count", () => {
    // 10 public, non-archived repos in the Conxian org (verified via the API).
    assert.match(read("index.html"), /cx-trust-num">10<\/span><span class="cx-trust-label">Public repositories/);
});

test("render.yaml documents the Lightning rail, not a retired Merchant-of-Record key", () => {
    const yaml = read("render.yaml");
    assert.ok(!yaml.includes("MERCHANT_CHECKOUT_URL"), "render.yaml still declares the retired card-checkout key");
    assert.ok(yaml.includes("MANAGED_BILLING_BASE_URL"), "render.yaml must declare the managed billing base");
});

test("every page uses the lightweight SVG favicon", () => {
    const offenders = markup().filter(({ html }) => /rel="icon"[^>]*\.jpg/.test(html));
    assert.deepEqual(offenders.map(o => o.file), [], "favicons must be favicon.svg, not the multi-megabyte JPEG");
});
