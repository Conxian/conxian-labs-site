/**
 * Conxian Labs — Client-Side Search
 * Functional search across all site pages via homepage and sub-page search inputs.
 */
(function() {
  var PAGES = [
    { title: 'Home', desc: 'Proof-first software stack for the Conxian ecosystem: Market, Gateway, Wallet, Conxius Enclave SDK, and Core, with public portfolio and operator context.', url: 'index.html', keywords: 'market conxian-market gateway wallet sdk conxius enclave sdk core core primitives software stack portfolio ecosystem directory builder operator' },
    { title: 'SDK — Conxius Enclave SDK', desc: 'Beta/conditional open-source builder surface for cross-platform enclave and key-management boundaries, secure signing, and attestation interfaces.', url: 'sdk/index.html', keywords: 'sdk conxius enclave cross-platform keystore key management secure signing attestation trust reporting beta conditional open-source mit' },
    { title: 'Docs — Documentation', desc: 'Technical documentation for the Conxian ecosystem. Integration guides, API references, and architectural overviews for Market, Gateway, Wallet, SDK, and Core.', url: 'docs/index.html', keywords: 'documentation docs api reference integration guide architecture market conxian-market deprecated conxian' },
    { title: 'Pricing & Packaging', desc: 'Commercial packaging guidance for the free MIT SDK, Gateway sandbox and pilot paths, non-custodial Wallet integrations, and scoped enterprise engagements.', url: 'pricing/index.html', keywords: 'pricing packaging plans gateway wallet sdk sandbox pilot x402 lightning invoice stripe white-label white label onboarding metered hosted managed local self-hosted enterprise contract non-custodial custody payment' },
    { title: 'Commercial Brief', desc: 'Executive buyer brief for Market, Gateway, Wallet, Conxius Enclave SDK, and Core, with current readiness boundaries, evaluation paths, and proof links.', url: 'commercial/index.html', keywords: 'commercial buyer executive brief market conxian-market gateway wallet sdk conxius enclave core readiness maturity boundaries evaluate proof evidence pilot enterprise' },
    { title: 'Scoped Pilot Brief', desc: 'Bounded pilot narrative with scope, customer inputs, measurable success criteria, evidence checkpoints, non-goals, stages, and exit paths.', url: 'commercial/pilot/index.html', keywords: 'pilot scoped pilot buyer customer inputs success criteria evidence checkpoints stages duration bounded non-goals exit paths market gateway wallet sdk core' },
    { title: 'Partners', desc: 'Ecosystem partners, integrations, and collaborative initiatives within the Conxian network.', url: 'partners/index.html', keywords: 'partners integrations collaboration ecosystem network' },
    { title: 'Operators', desc: 'Node operators, validators, and infrastructure providers powering the Conxian network.', url: 'operators/index.html', keywords: 'operators nodes validators infrastructure providers network' },
    { title: 'Enterprise', desc: 'Deployment discovery, governance, and scoped support for Market, Gateway, Wallet, Conxius Enclave SDK, and Core.', url: 'enterprise/index.html', keywords: 'enterprise institutional sovereign deployment solutions business regulated market conxian-market' },
    { title: 'Research', desc: 'Research surfaces, technical papers, cryptographic analysis, market protocols, and protocol studies.', url: 'research/index.html', keywords: 'research papers cryptography analysis market protocol liquidity risk database topologies academic' },
    { title: 'Terms of Service', desc: 'Legal terms governing use of Conxian Labs services, SDK, and infrastructure.', url: 'terms/index.html', keywords: 'terms legal service agreement conditions' },
    { title: 'Privacy Policy', desc: 'How Conxian Labs handles data. No third-party trackers, no surveillance infrastructure.', url: 'privacy/index.html', keywords: 'privacy policy data protection no tracking' },
    { title: 'About — Conxian Labs', desc: 'Team, mission, and institutional background. Ecosystem portfolio overview and contact information.', url: 'about/index.html', keywords: 'about team mission contact institutional portfolio' },
    { title: 'Security — Conxian Labs', desc: 'Security architecture, bug bounty program, audit reports, and responsible disclosure.', url: 'security/index.html', keywords: 'security audit bug bounty disclosure vulnerability HSM verification' }
  ];

  function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ''); }

  function getBaseUrl() {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
          if (scripts[i].src.indexOf('search.js') !== -1) {
              return scripts[i].src.replace('search.js', '');
          }
      }
      return '/';
  }

  function searchFn(query) {
    var q = normalize(query);
    if (q.length < 2) return [];
    return PAGES.filter(function(p) {
      return normalize(p.title).indexOf(q) !== -1 ||
             normalize(p.desc).indexOf(q) !== -1 ||
             normalize(p.keywords).indexOf(q) !== -1;
    });
  }

  function createDropdown(wrapper) {
    // Check if one already exists in the wrapper
    var dd = wrapper.querySelector('.search-results');
    if (!dd) {
      dd = document.createElement('div');
      dd.className = 'search-results';
      dd.style.cssText = 'position:absolute;top:100%;left:0;right:0;margin-top:8px;background:#FFFFFF;border-radius:4px;box-shadow:0 10px 40px rgba(0,0,0,0.1);z-index:100;max-height:320px;overflow-y:auto;display:none;';
      wrapper.appendChild(dd);
    }
    if (dd.tagName.toLowerCase() !== 'section') {
      dd.setAttribute('role', 'region');
    }
    dd.setAttribute('aria-label', 'Search results');
    dd.setAttribute('aria-live', 'polite');
    return dd;
  }

  function renderResult(page, baseUrl) {
    var a = document.createElement('a');
    a.href = baseUrl + page.url;
    a.style.cssText = 'display:block;padding:12px 16px;text-decoration:none;border-bottom:1px solid #F0EDE8;';
    a.innerHTML = '<div style="font-family:JetBrains Mono,monospace;font-size:0.75rem;font-weight:700;color:#121212;margin-bottom:2px;">' + page.title + '</div><div style="font-family:JetBrains Mono,monospace;font-size:0.65rem;color:#555555;line-height:1.4;">' + page.desc + '</div>';
    a.addEventListener('mouseenter', function() { a.style.background = '#F5F2ED'; });
    a.addEventListener('mouseleave', function() { a.style.background = ''; });
    return a;
  }

  function setupSearch(input) {
    if (!input) return;
    var wrapper = input.closest('.relative') || input.closest('.search-bar') || input.parentElement;
    wrapper.style.position = 'relative';

    var baseUrl = getBaseUrl();
    var dd = createDropdown(wrapper);

    var selectedIndex = -1;
    var currentResults = [];

    function showResults(results) {
      dd.innerHTML = '';
      if (results.length === 0) { dd.style.display = 'none'; return; }
      results.forEach(function(p, i) {
        var el = renderResult(p, baseUrl);
        el.addEventListener('click', function() { dd.style.display = 'none'; });
        dd.appendChild(el);
      });
      dd.style.display = 'block';
      currentResults = results;
      selectedIndex = -1;
    }

    input.addEventListener('input', function() {
      showResults(searchFn(input.value));
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { dd.style.display = 'none'; input.blur(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1); updateSelection(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, -1); updateSelection(); return; }
      if (e.key === 'Enter' && selectedIndex >= 0 && currentResults[selectedIndex]) {
        e.preventDefault();
        window.location.href = baseUrl + currentResults[selectedIndex].url;
      }
    });

    function updateSelection() {
      var items = dd.children;
      for (var i = 0; i < items.length; i++) {
        items[i].style.background = i === selectedIndex ? '#F5F2ED' : '';
      }
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    input.addEventListener('blur', function() {
      setTimeout(function() { dd.style.display = 'none'; }, 200);
    });

    input.addEventListener('focus', function() {
      if (input.value.length >= 2) showResults(searchFn(input.value));
    });
  }

  function init() {
    // Homepage search
    var homeInput = document.querySelector('input[placeholder*="Search documentation"]');
    setupSearch(homeInput);
    // Sub-page searches
    var subInputs = document.querySelectorAll('.subpage-search-input');
    subInputs.forEach(function(input) { setupSearch(input); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
