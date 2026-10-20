(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // A skeleton of the current page for tuning the reskin: element names, ids,
  // classes and layout only. Text, input values, links and other attributes are
  // never included, so the report holds no personal data.
  const MAX_NODES = 700;
  const MAX_DEPTH = 9;
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|LINK|META|BR)$/;

  function describe(el) {
    const s = el.ownerDocument.defaultView.getComputedStyle(el);
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 5) : [];
    let line = el.tagName.toLowerCase();
    if (el.id) line += '#' + el.id.replace(/\$\d+$/, '$n');
    if (cls.length) line += '.' + cls.join('.');
    const role = el.getAttribute('role');
    if (role) line += ' [role=' + role + ']';
    const flags = [];
    if (s.display === 'none') flags.push('hidden');
    else {
      if (!/^(static)$/.test(s.position)) flags.push(s.position);
      if (/flex|grid|table/.test(s.display)) flags.push(s.display);
      if (/auto|scroll|hidden/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4) flags.push('scrolls');
      const r = el.getBoundingClientRect();
      if (r.width > 200 || r.height > 200) flags.push(Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return flags.length ? line + '  {' + flags.join(' ') + '}' : line;
  }

  function walk(root, out, budget, baseDepth) {
    const stack = [[root, baseDepth || 0]];
    while (stack.length && budget.n < MAX_NODES) {
      const [el, depth] = stack.pop();
      if (SKIP.test(el.tagName) || el.closest('.edr-root')) continue;
      out.push('  '.repeat(depth) + describe(el));
      budget.n++;
      if (el.tagName === 'IFRAME') {
        let doc = null;
        try { doc = el.contentDocument; } catch (e) { /* cross-origin */ }
        if (doc && doc.body) {
          out.push('  '.repeat(depth + 1) + '[iframe document]');
          walk(doc.body, out, budget, depth + 2);
        }
        continue;
      }
      const hidden = el.ownerDocument.defaultView.getComputedStyle(el).display === 'none';
      if (depth >= MAX_DEPTH || hidden) continue;
      const kids = [...el.children];
      for (let i = kids.length - 1; i >= 0; i--) stack.push([kids[i], depth + 1]);
    }
  }

  function classCounts(doc) {
    const counts = new Map();
    doc.querySelectorAll('*').forEach((el) => {
      if (typeof el.className !== 'string' || el.closest('.edr-root')) return;
      el.className.split(/\s+/).forEach((c) => { if (c) counts.set(c, (counts.get(c) || 0) + 1); });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(([c, n]) => c + ':' + n).join(' ');
  }

  function layoutReport() {
    const page = EDR.routes.detectPage(location.href);
    const params = new URLSearchParams(location.search);
    const out = [
      'EduRec Reskin layout report (structure only, no text or values)',
      'path: ' + location.pathname.replace(/cs90prd_\d+/, 'cs90prd_N'),
      'GComp: ' + (params.get('GComp') || '-') + '  lp: ' + (params.get('lp') || '-') + '  page: ' + page.key,
      'html: ' + document.documentElement.className,
      'viewport: ' + innerWidth + 'x' + innerHeight,
      '',
      '--- classes ---',
      classCounts(document),
      '',
      '--- tree ---'
    ];
    walk(document.body, out, { n: 0 });
    return out.join('\n');
  }

  EDR.diag = { layoutReport };
})();
