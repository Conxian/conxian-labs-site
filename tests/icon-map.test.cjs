const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// icons.js replaced the ~2MB Google Material Symbols CDN with inline SVGs. Any
// icon used in markup but missing from that map silently renders as literal
// text (the raw word, e.g. "monitor_heart"), which is how the homepage status
// card shipped a broken icon. This guards the map against that drift.
const root = path.join(__dirname, "..");
const iconsSource = fs.readFileSync(path.join(root, "icons.js"), "utf8");

function definedIcons() {
  const names = new Set();
  const pattern = /^\s{4}([a-z0-9_]+):\s*'<svg/gm;
  for (const match of iconsSource.matchAll(pattern)) names.add(match[1]);
  return names;
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "node_modules" || entry.name === ".git") return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

function referencedIcons() {
  const used = new Map();
  for (const file of htmlFiles(root)) {
    const html = fs.readFileSync(file, "utf8");
    const pattern = /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g;
    for (const match of html.matchAll(pattern)) {
      const name = match[1];
      if (!used.has(name)) used.set(name, []);
      used.get(name).push(path.relative(root, file));
    }
  }
  return used;
}

test("icons.js defines every icon referenced in site markup", () => {
  const defined = definedIcons();
  assert.ok(defined.size > 0, "icon map should not be empty");
  const missing = [...referencedIcons().keys()].filter(name => !defined.has(name));
  assert.deepEqual(missing, [], `icons referenced in markup but missing from icons.js: ${missing.join(", ")}`);
});

test("the homepage status card icons are covered", () => {
  const defined = definedIcons();
  // These two rendered as literal text before the fix.
  assert.ok(defined.has("bolt"), "bolt icon must be defined");
  assert.ok(defined.has("monitor_heart"), "monitor_heart icon must be defined");
});

test("every defined icon is a valid inline SVG with path data", () => {
  for (const name of definedIcons()) {
    const pattern = new RegExp(`^\\s{4}${name}:\\s*'(<svg[^']+)'`, "m");
    const svg = iconsSource.match(pattern)?.[1];
    assert.ok(svg && svg.includes("<path"), `${name} must contain an SVG path`);
    assert.ok(svg.includes('viewBox="0 -960 960 960"'), `${name} must use the Material Symbols viewBox`);
  }
});
