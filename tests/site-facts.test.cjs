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

test("no public page links to the private conxian-business repository", () => {
    // conxian-business is private, so every link to it 404s for a real visitor.
    // The BOS page describes its artifacts instead of linking into the internal
    // control plane (see the conxian-evidence-claims skill).
    const offenders = markup().filter(({ html }) => html.includes("github.com/Conxian/conxian-business"));
    assert.deepEqual(offenders.map(o => o.file), [], "public pages must not link to the private conxian-business repo");
});

test("org facts in AGENTS.md match the live public org", () => {
    const agents = read("AGENTS.md");
    const publicLine = agents.split("\n").find((line) => line.includes("Public org repos"));
    assert.ok(publicLine, "AGENTS.md must document the public org repos");
    assert.ok(publicLine.includes("conxian-org-site"), "conxian-org-site is public and must be listed");
    assert.match(publicLine, /conxian-business` is \*\*private\*\*/, "conxian-business must be labelled private, not listed as public");
    assert.match(agents, /conxian-org-site`\s+\*\*Apache-2\.0\*\*/, "conxian-org-site is Apache-2.0, not MIT");
});

test("every marketing page uses a surface count that matches its own list", () => {
    // The homepage enumerates six cards; the commercial brief enumerates five
    // buyer surfaces. A neighbour page must not contradict either with a stale
    // third number (partners previously said "Four").
    assert.ok(!/Four public surfaces/.test(read("partners/index.html")), "partners must not state a stale surface count");
    assert.match(read("partners/index.html"), /Five public software surfaces/);
    assert.match(read("commercial/index.html"), /Five active surfaces/);
    assert.match(read("index.html"), /cx-trust-num">6<\/span><span class="cx-trust-label">Software surfaces/);
});

test("pricing shows no figure the service catalogue does not carry", () => {
    // $200 traces to MANAGED_TIER.monthlyUsd in server.js; $2,500 was an
    // invented figure with no backing configuration.
    const html = read("pricing/index.html");
    assert.ok(!html.includes("2,500"), "pricing must not print an unbacked $2,500 figure");
    assert.ok(read("server.js").includes("monthlyUsd: 200"), "the advertised managed price must trace to the catalogue");
});

test("security page does not assert a bug bounty or blanket audits", () => {
    const html = read("security/index.html");
    assert.ok(!/bug[- ]bounty program is (currently )?(offered|live)/i.test(html), "no paid bug-bounty program exists");
    assert.ok(!/audits are commissioned for all major/i.test(html), "not every component has been audited");
    // Figures may appear only as best-effort targets; they must not read as a
    // hard default commitment (e.g. "within 48 hours" with no qualifier).
    assert.ok(!/guaranteed (acknowledgment|response|fix)/i.test(html), "no guaranteed response figures");
    if (/\b48 hours\b/.test(html)) {
        assert.match(html, /best-effort/i, "any response figure must be framed as a best-effort target");
    }
});

test("discovery surfaces do not promise self-serve provisioning", () => {
    const server = read("server.js");
    assert.ok(!/Self-serve customer journey from sign-up to running service/.test(server), "site-map must not promise self-serve sign-up");
    const llms = read("llms.txt");
    assert.ok(!/infrastructure you can provision/.test(llms), "llms.txt must not promise provisionable infrastructure");
});

test("no page sends visitor data to a third-party host", () => {
    // The CSP is img-src 'self' data:, so a third-party QR/asset host both
    // breaks the asset and leaks the payload. Invoice QR codes are rendered
    // locally from the vendored qrcode.min.js instead.
    const offenders = markup().filter(({ html }) => /api\.qrserver\.com|quickchart\.io|chart\.googleapis\.com/.test(html));
    assert.deepEqual(offenders.map(o => o.file), [], "no third-party asset host may be referenced");
    assert.ok(fs.existsSync(path.join(root, "qrcode.min.js")), "the vendored QR encoder must be present");
});

test("market maturity copy does not claim live settlement or execution", () => {
    // The commercial brief states Market settlement/execution is "not yet live";
    // the homepage and README must not contradict that with an "engine" claim.
    assert.ok(!/Machine-to-machine settlement and agentic commerce/.test(read("index.html")), "homepage market card must not claim live M2M settlement");
    assert.ok(!/active market, liquidity, and asset execution engine/.test(read("README.md")), "README must not call Market an active execution engine");
    assert.match(read("index.html"), /liquidity routing, order matching, and metered billing are not yet live/);
});

test("SDK hardware copy matches the qualification-target boundary", () => {
    // The about page says hardware-provider integration is a qualification
    // target, not production-supported signing. The homepage must agree.
    const html = read("index.html");
    assert.ok(!/hardware signing across Nitro, StrongBox, and Secure Enclave/.test(html), "homepage must not imply production hardware signing");
    assert.match(html, /qualification target, not currently production-supported signing/);
});

test("no page carries an unbounded availability or SLA promise", () => {
    const banned = [/institutional-grade uptime/i, /guaranteed uptime/i, /\b99\.9%?\b/, /twenty-four seven support/i];
    const offenders = [];
    for (const { file, html } of markup()) {
        for (const re of banned) if (re.test(html)) offenders.push(`${file}: ${re}`);
    }
    assert.deepEqual(offenders, [], "availability/SLA claims must be engagement-defined, not printed");
});
