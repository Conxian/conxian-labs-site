/**
 * Conxian Labs — Client-Side Search
 * Adds functional search to the homepage search input.
 * Searches across all site pages by title, description, and keywords.
 */
(function() {
  var PAGES = [
    { title: 'Home', desc: 'Builder and operator layer for the Conxian ecosystem. Public portfolio, infrastructure, and ecosystem directory.', url: '/', keywords: 'portfolio ecosystem directory builder operator' },
    { title: 'SDK — Conclave SDK', desc: 'Open-source sovereign infrastructure and cryptographic primitives. High-performance enclave orchestration and settlement adapters.', url: '/sdk', keywords: 'sdk conclave cryptography primitives enclave settlement open-source mit developer' },
    { title: 'Docs — Documentation', desc: 'Technical documentation for the Conxian ecosystem. Integration guides, API references, and architectural overviews.', url: '/docs', keywords: 'documentation docs api reference integration guide architecture' },
    { title: 'Pricing', desc: 'Transparent pricing for hosted operational services and enterprise support. Open-source SDK is free (MIT).', url: '/pricing', keywords: 'pricing plans enterprise support hosted services cost' },
    { title: 'Partners', desc: 'Ecosystem partners, integrations, and collaborative initiatives within the Conxian network.', url: '/partners', keywords: 'partners integrations collaboration ecosystem network' },
    { title: 'Operators', desc: 'Node operators, validators, and infrastructure providers powering the Conxian network.', url: '/operators', keywords: 'operators nodes validators infrastructure providers network' },
    { title: 'Enterprise', desc: 'Enterprise-grade solutions, institutional services, and sovereign infrastructure deployment.', url: '/enterprise', keywords: 'enterprise institutional sovereign deployment solutions business' },
    { title: 'Research', desc: 'Research surfaces, technical papers, cryptographic analysis, and protocol studies.', url: '/research', keywords: 'research papers cryptography analysis protocol studies academic' },
    { title: 'Terms of Service', desc: 'Legal terms governing use of Conxian Labs services, SDK, and infrastructure.', url: '/terms', keywords: 'terms legal service agreement conditions' },
    { title: 'Privacy Policy', desc: 'How Conxian Labs handles data. No third-party trackers, no surveillance infrastructure.', url: '/privacy', keywords: 'privacy policy data protection gdpr no tracking' }
  ];

  function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ''); }

  function search(query) {
    var q = normalize(query);
    if (q.length < 2) return [];
    return PAGES.filter(function(p) {
      return normalize(p.title).indexOf(q) !== -1 ||
             normalize(p.desc).indexOf(q) !== -1 ||
             normalize(p.keywords).indexOf(q) !== -1;
    });
  }

  function createDropdown() {
    var dd = document.createElement('div');
    dd.className = 'search-results';
    dd.style.cssText = 'position:absolute;top:100%;left:0;right:0;margin-top:8px;background:#FFFFFF;border-radius:4px;box-shadow:0 10px 40px rgba(0,0,0,0.1);z-index:100;max-height:320px;overflow-y:auto;display:none;';
    return dd;
  }

  function renderResult(page) {
    var a = document.createElement('a');
    a.href = page.url;
    a.style.cssText = 'display:block;padding:12px 16px;text-decoration:none;border-bottom:1px solid #F0EDE8;';
    a.innerHTML = '<div style="font-family:JetBrains Mono,monospace;font-size:0.75rem;font-weight:700;color:#121212;margin-bottom:2px;">' + page.title + '</div><div style="font-family:JetBrains Mono,monospace;font-size:0.65rem;color:#555555;line-height:1.4;">' + page.desc + '</div>';
    a.addEventListener('mouseenter', function() { a.style.background = '#F5F2ED'; });
    a.addEventListener('mouseleave', function() { a.style.background = ''; });
    return a;
  }

  function init() {
    var input = document.querySelector('input[placeholder*="Search"]');
    if (!input) return;

    var wrapper = input.closest('.relative') || input.parentElement;
    wrapper.style.position = 'relative';

    var dd = createDropdown();
    wrapper.appendChild(dd);

    var selectedIndex = -1;
    var currentResults = [];

    function showResults(results) {
      dd.innerHTML = '';
      if (results.length === 0) { dd.style.display = 'none'; return; }
      results.forEach(function(p, i) {
        var el = renderResult(p);
        el.addEventListener('click', function() { dd.style.display = 'none'; });
        dd.appendChild(el);
      });
      dd.style.display = 'block';
      currentResults = results;
      selectedIndex = -1;
    }

    input.addEventListener('input', function() {
      showResults(search(input.value));
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { dd.style.display = 'none'; input.blur(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1); updateSelection(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, -1); updateSelection(); return; }
      if (e.key === 'Enter' && selectedIndex >= 0 && currentResults[selectedIndex]) {
        e.preventDefault();
        window.location.href = currentResults[selectedIndex].url;
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
      if (input.value.length >= 2) showResults(search(input.value));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
