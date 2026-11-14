const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const app = require("../server.js");

// The repository is public and its Express server served the repository root
// wholesale, which published server code, CI configuration and internal
// operations documents (AGENTS.md, progress.md, DOMAIN_CUTOVER.md) that carried
// internal provider resource identifiers. These guards keep the public static
// surface to web assets only and keep provider identifiers out of the repo.
const root = path.join(__dirname, "..");

let server, base;
before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
});

const DENIED = [
    "/AGENTS.md", "/README.md", "/DOMAIN_CUTOVER.md", "/progress.md",
    "/CONTRIBUTING.md", "/SECURITY.md", "/GOVERNANCE.md", "/SUPPORT.md",
    "/REPO_OWNERSHIP.md", "/server.js", "/package.json", "/package-lock.json",
    "/render.yaml", "/tailwind.config.js", "/playwright.config.ts",
    "/CNAME", "/LICENSE", "/CODEOWNERS",
    "/scripts/branch_promotion_policy.py",
    "/tests/site-facts.test.cjs",
    "/.github/workflows/ci.yml",
    "/openspec/README.md",
];

const ALLOWED = [
    "/", "/index.html", "/404.html", "/privacy.html",
    "/robots.txt", "/sitemap.xml", "/favicon.svg", "/llms.txt",
    "/.well-known/security.txt",
    "/css/common.css", "/css/tailwind.css",
    "/nav.js", "/search.js", "/logger.js", "/icons.js", "/qrcode.min.js",
    "/fonts/fonts.css", "/about", "/sdk", "/pricing", "/commercial/pilot",
];

test("internal documents and server-side files are not served", async () => {
    const exposed = [];
    for (const p of DENIED) {
        const res = await fetch(base + p);
        if (res.status !== 404) exposed.push(`${p} -> ${res.status}`);
    }
    assert.deepEqual(exposed, [], "internal files must return 404, never the file contents");
});

test("public web assets and routes are still served", async () => {
    const missing = [];
    for (const p of ALLOWED) {
        const res = await fetch(base + p);
        if (res.status !== 200) missing.push(`${p} -> ${res.status}`);
    }
    assert.deepEqual(missing, [], "real public assets must keep serving");
});

test("no markdown file is reachable over HTTP, whatever its case", async () => {
    for (const p of ["/AGENTS.md", "/AGENTS.MD", "/Agents.md", "/readme.md"]) {
        const res = await fetch(base + p);
        assert.equal(res.status, 404, `${p} must not be served`);
    }
});

test("path traversal cannot reach a denied file", async () => {
    for (const p of ["/css/../AGENTS.md", "/css/%2e%2e/AGENTS.md", "/%2e%2e/server.js"]) {
        const res = await fetch(base + p);
        assert.equal(res.status, 404, `${p} must not be served`);
    }
});

test("no tracked file republishes internal provider resource identifiers", () => {
    // Neon organization/project refs, the Supabase org ref, and Render
    // service/workspace ids. The inventory is retained privately in
    // .github-private/restricted/2026-11-14/, not in this public repository.
    // Patterns are assembled from fragments so this guard does not itself
    // reintroduce the identifiers it is written to forbid.
    const patterns = [
        new RegExp("org-" + "silent-" + "sun-\\d+"),
        new RegExp("dmhmarjq" + "zgodyovlhamv"),
        new RegExp("sparkling-" + "sunset-\\d+"),
        new RegExp("weathered-" + "night-\\d+"),
        new RegExp("noisy-" + "flower-\\d+"),
        new RegExp("small-" + "math-\\d+"),
        new RegExp("noisy-" + "cloud-\\d+"),
        new RegExp("orange-" + "paper-\\d+"),
        /\bsrv-[a-z0-9]{8,}\b/,
        /\btea-[a-z0-9]{8,}\b/,
    ];
    const offenders = [];
    const skip = new Set(["node_modules", ".git", ".openhands", "test-results"]);
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (skip.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else {
                const text = fs.readFileSync(full, "utf8");
                for (const re of patterns) {
                    if (re.test(text)) offenders.push(`${path.relative(root, full)}: ${re}`);
                }
            }
        }
    };
    walk(root);
    assert.deepEqual(offenders, [], "internal provider identifiers must not appear in the public repo");
});
