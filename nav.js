/* Conxian site-wide navigation + footer.
 * Single source of truth for the primary IA across every page. Rendered at
 * runtime so the header cannot drift page-to-page. The auth pair, product
 * menus and console entry mirror the conventions of mainstream cloud
 * providers; the live status pill reflects the real /api/status result and
 * never claims more than the probe returns.
 */
(function () {
  "use strict";

  var CONSOLE = "https://bos.conxian-labs.com";
  var STATUS_PAGE = "/status";

  var PRODUCTS = [
    ["/docs", "Gateway", "ISO 20022 settlement and compliance middleware"],
    ["/sdk", "Enclave SDK", "Cross-platform hardware signing and attestation"],
    ["/enterprise", "Wallet", "Non-custodial Bitcoin and Stacks client"],
    ["/docs", "Core library", "Bitcoin cryptographic and proof primitives"],
    ["/research", "Nexus", "Multi-chain state verification node"],
    ["/commercial", "Market", "Machine-to-machine settlement engine"],
    ["/operators", "Platform", "Deployment and container orchestration"],
  ];

  var SOLUTIONS = [
    ["/enterprise", "Financial infrastructure", "ISO 20022 bridging and settlement"],
    ["/commercial", "Agentic commerce", "Metered machine-to-machine payments"],
    ["/sdk", "Signing and custody", "Hardware-enforced key control"],
    ["/enterprise", "Enterprise programs", "Dedicated nodes and support"],
  ];

  var DEVELOPERS = [
    ["/docs", "Documentation", "Architecture and integration guides"],
    ["/sdk", "Enclave SDK", "Install and integrate"],
    ["/docs", "Quickstart", "Local setup and first run"],
    ["/status", "Status", "Live service reachability"],
    ["https://github.com/Conxian", "GitHub", "Source and issues"],
  ];

  var COMPANY = [
    ["/about", "About", "Who builds and operates the stack"],
    ["/commercial", "Commercial", "Buyer and executive brief"],
    ["/partners", "Partners", "Ecosystem collaborations"],
    ["/operators", "Operators", "Node and infrastructure providers"],
    ["/research", "Research", "Cryptographic research surfaces"],
    ["/security", "Security", "Posture and disclosure"],
  ];

  function dropdown(label, items) {
    var rows = items
      .map(function (it) {
        var external = it[0].indexOf("http") === 0;
        return (
          '<a class="cx-menu-item" href="' + it[0] + '"' +
          (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
          '><span class="cx-mi-title">' + it[1] + '</span>' +
          '<span class="cx-mi-desc">' + it[2] + "</span></a>"
        );
      })
      .join("");
    return (
      '<div class="cx-menu">' +
      '<button class="cx-navlink" type="button" aria-haspopup="true" aria-expanded="false">' +
      label + ' <span class="cx-caret" aria-hidden="true">▾</span></button>' +
      '<div class="cx-menu-panel" role="menu">' + rows + "</div></div>"
    );
  }

  function header() {
    var el = document.getElementById("cx-nav");
    if (!el) return;
    el.innerHTML =
      '<a class="cx-skip" href="#cx-main">Skip to content</a>' +
      '<div class="cx-nav-inner">' +
      '<a class="cx-brand" href="/" aria-label="Conxian Labs home">' +
      '<span class="cx-brand-mark">C</span>' +
      '<span class="cx-brand-text">CONXIAN<em>LABS</em></span></a>' +
      '<nav class="cx-links" aria-label="Primary">' +
      dropdown("Products", PRODUCTS) +
      dropdown("Solutions", SOLUTIONS) +
      dropdown("Developers", DEVELOPERS) +
      '<a class="cx-navlink" href="/pricing">Pricing</a>' +
      dropdown("Company", COMPANY) +
      "</nav>" +
      '<div class="cx-actions">' +
      '<div class="cx-search-wrap"><input class="cx-search-input subpage-search-input" type="search" placeholder="Search documentation" aria-label="Search site" autocomplete="off"><section class="search-results subpage-search-results" aria-label="Search results" aria-live="polite"></section></div>' +
      '<a class="cx-status-pill" href="' + STATUS_PAGE + '" id="cx-status-pill">' +
      '<span class="cx-dot" id="cx-status-dot"></span><span id="cx-status-text">Status</span></a>' +
      '<a class="cx-signin" href="' + CONSOLE + '/sign-in">Sign in</a>' +
      '<a class="cx-cta" href="' + CONSOLE + '/sign-up">Get started free</a>' +
      '<button class="cx-burger" type="button" aria-label="Open menu" aria-expanded="false" id="cx-burger">☰</button>' +
      "</div></div>" +
      '<div class="cx-mobile" id="cx-mobile" hidden>' +
      '<a href="/docs">Gateway</a><a href="/sdk">Enclave SDK</a><a href="/enterprise">Wallet</a>' +
      '<a href="/docs">Core</a><a href="/research">Nexus</a><a href="/commercial">Market</a>' +
      '<a href="/pricing">Pricing</a><a href="/status">Status</a>' +
      '<a href="' + CONSOLE + '/sign-in">Sign in</a>' +
      '<a class="cx-mobile-cta" href="' + CONSOLE + '/sign-up">Get started free</a></div>';

    var burger = document.getElementById("cx-burger");
    var mobile = document.getElementById("cx-mobile");
    if (burger && mobile) {
      burger.addEventListener("click", function () {
        var open = mobile.hasAttribute("hidden");
        if (open) mobile.removeAttribute("hidden");
        else mobile.setAttribute("hidden", "");
        burger.setAttribute("aria-expanded", String(open));
      });
    }

    // Keyboard and pointer affordance for the desktop menus.
    Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (menu) {
      var btn = menu.querySelector("button");
      function close() {
        menu.classList.remove("cx-open");
        btn.setAttribute("aria-expanded", "false");
      }
      menu.addEventListener("mouseenter", function () {
        menu.classList.add("cx-open");
        btn.setAttribute("aria-expanded", "true");
      });
      menu.addEventListener("mouseleave", close);
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var willOpen = !menu.classList.contains("cx-open");
        Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (m) {
          m.classList.remove("cx-open");
        });
        menu.classList.toggle("cx-open", willOpen);
        btn.setAttribute("aria-expanded", String(willOpen));
      });
      menu.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    });
    document.addEventListener("click", function (e) {
      if (!el.contains(e.target)) {
        Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (m) {
          m.classList.remove("cx-open");
        });
      }
    });

    // Live status: fail visible. While probing, show "Checking"; on error,
    // show "Unknown" rather than a reassuring green.
    var dot = document.getElementById("cx-status-dot");
    var text = document.getElementById("cx-status-text");
    fetch("/api/status")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var overall = d && d.overall ? d.overall : "unknown";
        var label =
          overall === "operational" ? "All systems operational"
          : overall === "partial-outage" ? "Partial outage"
          : overall === "major-outage" ? "Major outage"
          : "Unknown";
        if (text) text.textContent = label;
        if (dot) dot.className = "cx-dot cx-" + overall;
      })
      .catch(function () {
        if (text) text.textContent = "Status unknown";
        if (dot) dot.className = "cx-dot cx-unknown";
      });
  }

  function footer() {
    var el = document.getElementById("cx-footer");
    if (!el) return;
    el.innerHTML =
      '<div class="cx-foot-inner">' +
      '<div class="cx-foot-brand">' +
      '<span class="cx-brand-mark">C</span>' +
      '<p>Conxian Labs builds and operates the open software surfaces around the Conxian ecosystem.</p>' +
      '<p class="cx-foot-legal">© 2026 CONXIAN LABS · Enterprise No. K2026884014</p>' +
      "</div>" +
      '<div class="cx-foot-cols">' +
      col("Products", [["/docs", "Gateway"], ["/sdk", "Enclave SDK"], ["/enterprise", "Wallet"], ["/research", "Nexus"], ["/commercial", "Market"]]) +
      col("Developers", [["/docs", "Documentation"], ["/status", "Status"], ["https://github.com/Conxian", "GitHub"], [CONSOLE + "/sign-in", "Console"]]) +
      col("Company", [["/about", "About"], ["/pricing", "Pricing"], ["/partners", "Partners"], ["/operators", "Operators"], ["/research", "Research"]]) +
      col("Legal", [["/privacy", "Privacy"], ["/terms", "Terms"], ["/security", "Security"]]) +
      "</div></div>";
  }

  function col(title, items) {
    var rows = items
      .map(function (it) {
        var external = it[0].indexOf("http") === 0;
        return '<a href="' + it[0] + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + it[1] + "</a>";
      })
      .join("");
    return '<div class="cx-foot-col"><h4>' + title + "</h4>" + rows + "</div>";
  }

  function boot() {
    header();
    footer();
    // search.js binds on DOMContentLoaded; the nav injects its input after that,
    // so re-dispatch to let search attach to the freshly rendered box.
    if (window.Search && typeof window.Search.init === "function") {
      window.Search.init();
    } else {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
