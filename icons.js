/**
 * Conxian Labs — Inline SVG Icon Replacement
 * Eliminates the Google Material Symbols CDN (~2MB) by replacing
 * <span class="material-symbols-outlined">icon_name</span>
 * with lightweight inline SVGs.
 */
(function() {
  const ICONS = {
    search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>',
    terminal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm120-40-56-56 84-84-84-84 56-56 140 140-140 140Zm200 0v-80h240v80H480Z"/></svg>',
    arrow_forward: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/></svg>',
    fingerprint: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-120q-134 0-227-93t-93-227q0-134 93-227t227-93q134 0 227 93t93 227q0 22-2 42.5t-6 41.5l-78-26q2-14 4-28.5t2-29.5q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70q24 0 47-4.5t45-13.5l26 78q-28 10-57.5 14.5T480-120Zm0-160q-67 0-113.5-46.5T320-440q0-67 46.5-113.5T480-600q67 0 113.5 46.5T640-440q0 21-5 40.5T621-362l-72-30q2-12 2.5-23.5t.5-24.5q0-30-21-51t-51-21q-30 0-51 21t-21 51q0 30 21 51t51 21q13 0 24.5-2.5T528-374l30 72q-15 10-32.5 16t-37.5 6Z"/></svg>',
    account_tree: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M600-120v-120H440v-400h-80v120H120v-320h240v120h240v-120h240v320H600v-120h-80v320h80v-120h240v320H600Z"/></svg>',
    source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M320-240 80-480l240-240 57 57-184 183 183 183-56 57Zm320 0-57-57 184-183-184-183 57-57 240 240-240 240Z"/></svg>',
    history_edu: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M320-160q-117 0-198.5-81.5T40-440q0-107 70.5-187.5T288-720h-88v-80h240v240h-80v-100q-70 2-119 51t-49 119q0 70 49 119t119 49q32 0 60.5-11t51.5-32l58 56q-34 32-76.5 50.5T320-160Zm216-40L376-360l56-56 104 104 216-216 56 56-272 272Z"/></svg>',
    gavel: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-80h480v80H160Zm226-194L160-540l84-86 228 226-86 86Zm254-254L414-796l86-84 226 226-86 86Zm172 408L302-670l56-56 510 510-56 56Z"/></svg>',
    menu: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>'
  };

  function replaceIcons() {
    document.querySelectorAll('.material-symbols-outlined').forEach(function(el) {
      var name = el.textContent.trim();
      var svg = ICONS[name];
      if (svg) {
        // Clone the source element so caller-supplied classes, data attributes,
        // and accessibility attributes survive the inline SVG replacement.
        var wrapper = el.cloneNode(false);
        wrapper.innerHTML = svg;
        var icon = wrapper.querySelector('svg');
        icon.setAttribute('width', '1em');
        icon.setAttribute('height', '1em');
        el.parentNode.replaceChild(wrapper, el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceIcons);
  } else {
    replaceIcons();
  }
})();
