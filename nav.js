/* Conxian site-wide navigation + footer.
 * Single source of truth for the primary IA across every page. Rendered at
 * runtime so the header cannot drift page-to-page. The auth pair, product
 * menus and console entry mirror the conventions of mainstream cloud
 * providers; the live status pill reflects the real /api/status result and
 * never claims more than the probe returns.
 */
(function () {
  "use strict";

  // Customer-facing auth is intentionally absent: the BOS control plane is an
  // internal operator surface and public self-serve sign-up is not enabled. The
  // nav routes a prospective customer to the gated request-access journey rather
  // than to an internal operator page.
  var CONSOLE_PAGE = "/console";
  var ACCESS_PAGE = "/get-started";
  var STATUS_PAGE = "/status";

  // Each product resolves to a distinct destination (page + in-page anchor)
  // so the seven surfaces are individually addressable rather than collapsing
  // several products onto one generic page.
  var PRODUCT_LINKS = {
    gateway: "/docs#gateway",
    sdk: "/sdk#integration-scope",
    wallet: "/enterprise#capabilities",
    core: "/docs#core",
    nexus: "/research#domains",
    market: "/commercial#market",
    platform: "/operators#platform",
  };

  var PRODUCTS = [
    [PRODUCT_LINKS.gateway, "Gateway", "ISO 20022 settlement and compliance middleware"],
    [PRODUCT_LINKS.sdk, "Enclave SDK", "Cross-platform hardware signing and attestation"],
    [PRODUCT_LINKS.wallet, "Wallet", "Non-custodial Bitcoin and Stacks client"],
    [PRODUCT_LINKS.core, "Core library", "Bitcoin cryptographic and proof primitives"],
    [PRODUCT_LINKS.nexus, "Nexus", "Multi-chain state verification node"],
    [PRODUCT_LINKS.market, "Market", "Machine-to-machine settlement engine"],
    [PRODUCT_LINKS.platform, "Platform", "Deployment and container orchestration"],
  ];

  // Every entry resolves to a distinct destination (page or in-page anchor) so
  // no menu presents two labels for the same target.
  var SOLUTIONS = [
    ["/enterprise", "Financial infrastructure", "ISO 20022 bridging and settlement"],
    ["/commercial", "Agentic commerce", "Metered machine-to-machine payments"],
    ["/sdk", "Signing and custody", "Hardware-enforced key control"],
    ["/operators", "Node operations", "Run and scale verification nodes"],
  ];

  var DEVELOPERS = [
    ["/docs", "Documentation", "Architecture and integration guides"],
    ["/sdk#integration-scope", "Enclave SDK", "Install and integrate"],
    ["/get-started", "Quickstart", "Request access and provision"],
    ["/status", "Status", "Live service reachability"],
    ["https://github.com/Conxian", "GitHub", "Source and issues"],
  ];

  var COMPANY = [
    ["/about", "About", "Who builds and operates the stack"],
    ["/commercial", "Commercial", "Buyer and executive brief"],
    ["/partners", "Partners", "Ecosystem collaborations"],
    ["/operators", "Operators", "Node and infrastructure providers"],
    ["/research", "Research", "Cryptographic research surfaces"],
    ["/bos", "BOS", "Public-safe operating model"],
    ["/security", "Security", "Posture and disclosure"],
  ];

  function dropdown(label, items) {
    var rows = items
      .map(function (it) {
        var external = it[0].indexOf("http") === 0;
        return (
          '<a class="cx-menu-item" role="menuitem" href="' + it[0] + '"' +
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
      '<a class="cx-signin" href="' + CONSOLE_PAGE + '">Console</a>' +
      '<a class="cx-cta" href="' + ACCESS_PAGE + '">Request access</a>' +
      '<button class="cx-burger" type="button" aria-label="Open menu" aria-expanded="false" id="cx-burger">☰</button>' +
      "</div></div>" +
      '<div class="cx-mobile" id="cx-mobile" hidden>' +
      '<a href="' + PRODUCT_LINKS.gateway + '">Gateway</a><a href="' + PRODUCT_LINKS.sdk + '">Enclave SDK</a><a href="' + PRODUCT_LINKS.wallet + '">Wallet</a>' +
      '<a href="' + PRODUCT_LINKS.core + '">Core</a><a href="' + PRODUCT_LINKS.nexus + '">Nexus</a><a href="' + PRODUCT_LINKS.market + '">Market</a>' +
      '<a href="/pricing">Pricing</a><a href="/status">Status</a>' +
      '<a href="' + CONSOLE_PAGE + '">Console</a>' +
      '<a class="cx-mobile-cta" href="' + ACCESS_PAGE + '">Request access</a></div>';

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

    // Desktop menus use hover-intent: a short open delay avoids flicker when the
    // pointer merely crosses a trigger, and a close grace period keeps the panel
    // open while the pointer crosses the gap between the trigger and the panel.
    // Closing instantly on mouseleave made the menu nearly impossible to enter
    // with a normal cursor path (the 8px gap between trigger and panel counted
    // as "outside" and dismissed it). The panel also carries an invisible bridge
    // (see .cx-menu-panel::before) so the pointer never leaves the hoverable area.
    var OPEN_DELAY_MS = 60;
    var CLOSE_GRACE_MS = 220;

    Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (menu) {
      var btn = menu.querySelector("button");
      var openTimer = null;
      var closeTimer = null;
      // A menu opened by hover is "pinned" once the user clicks it, so the click
      // that follows a hover keeps it open instead of toggling it shut, and a
      // pinned menu survives the pointer leaving (dismissed by Escape, a click
      // elsewhere, or focus moving out).
      var pinned = false;

      function cancel(timer) {
        if (timer) clearTimeout(timer);
        return null;
      }
      function open() {
        closeTimer = cancel(closeTimer);
        menu.classList.add("cx-open");
        btn.setAttribute("aria-expanded", "true");
      }
      function close() {
        openTimer = cancel(openTimer);
        closeTimer = cancel(closeTimer);
        pinned = false;
        menu.classList.remove("cx-open");
        btn.setAttribute("aria-expanded", "false");
      }
      function scheduleOpen() {
        closeTimer = cancel(closeTimer);
        if (menu.classList.contains("cx-open")) return;
        openTimer = setTimeout(open, OPEN_DELAY_MS);
      }
      function scheduleClose() {
        openTimer = cancel(openTimer);
        if (pinned) return;
        closeTimer = setTimeout(close, CLOSE_GRACE_MS);
      }

      menu.addEventListener("mouseenter", scheduleOpen);
      menu.addEventListener("mouseleave", scheduleClose);

      // Pointer re-entering the trigger or panel cancels a pending close.
      menu.addEventListener("mouseover", function () {
        closeTimer = cancel(closeTimer);
      });

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (!menu.classList.contains("cx-open")) {
          Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (m) {
            if (m !== menu) m.querySelector("button").setAttribute("aria-expanded", "false");
          });
          Array.prototype.forEach.call(el.querySelectorAll(".cx-menu.cx-open"), function (m) {
            if (m !== menu) m.classList.remove("cx-open");
          });
          open();
          pinned = true;
        } else if (!pinned) {
          // Opened by hover; the click pins it open rather than closing it.
          pinned = true;
        } else {
          close();
        }
        // e.detail === 0 means a keyboard-activated click; only then move focus
        // into the panel so mouse users are not given a stray focus ring.
        if (pinned && e.detail === 0) {
          var first = menu.querySelector(".cx-menu-item");
          if (first) first.focus({ preventScroll: true });
        }
      });

      // Keyboard: ArrowDown opens and moves into the items, ArrowUp walks back,
      // Escape closes and returns focus to the trigger.
      menu.addEventListener("keydown", function (e) {
        var items = Array.prototype.slice.call(menu.querySelectorAll(".cx-menu-item"));
        var index = items.indexOf(document.activeElement);
        if (e.key === "Escape") {
          close();
          btn.focus({ preventScroll: true });
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!menu.classList.contains("cx-open")) open();
          var next = items[index < 0 ? 0 : Math.min(index + 1, items.length - 1)];
          if (next) next.focus({ preventScroll: true });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (index <= 0) {
            btn.focus({ preventScroll: true });
            return;
          }
          items[index - 1].focus({ preventScroll: true });
        }
      });

      // Tab (or any focus leaving the menu) dismisses an open panel.
      menu.addEventListener("focusout", function (e) {
        if (!menu.contains(e.relatedTarget)) close();
      });
    });
    document.addEventListener("click", function (e) {
      if (!el.contains(e.target)) {
        Array.prototype.forEach.call(el.querySelectorAll(".cx-menu"), function (m) {
          m.classList.remove("cx-open");
          var b = m.querySelector("button");
          if (b) b.setAttribute("aria-expanded", "false");
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
              col("Developers", [["/docs", "Documentation"], ["/status", "Status"], ["https://github.com/Conxian", "GitHub"], ["/console", "Console"]]) +
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
