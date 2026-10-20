(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Small DOM builder. Children are appended as text nodes, never parsed as HTML.
  EDR.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  };

  EDR.debounce = function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // Text of a subtree with one line per text node. Works on detached documents
  // (fetched pages) where innerText is unavailable.
  EDR.nodeText = function nodeText(root) {
    const out = [];
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode;
        if (p && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p && p.closest && p.closest('.edr-root')) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    while (walker.nextNode()) out.push(walker.currentNode.nodeValue.trim());
    return out.join('\n');
  };

  EDR.isTop = window.top === window;

  // Page-level switches live in data- attributes on <html>: EduRec rewrites the
  // <html> class list after load, which would silently drop class-based flags.
  const flags = new Set();
  EDR.flag = function flag(name, on) {
    const attr = 'data-edr-' + name;
    if (on === false) {
      flags.delete(attr);
      document.documentElement.removeAttribute(attr);
      return;
    }
    flags.add(attr);
    document.documentElement.setAttribute(attr, '');
  };
  new MutationObserver(() => {
    for (const attr of flags) if (!document.documentElement.hasAttribute(attr)) document.documentElement.setAttribute(attr, '');
  }).observe(document.documentElement, { attributes: true });

  EDR.icon = function icon(d, size) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', String(size || 18));
    svg.setAttribute('height', String(size || 18));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  };

  EDR.ui = {
    bar(value, max) {
      const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      return EDR.h('div', { class: 'edr-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value) },
        EDR.h('span', { style: { width: pct + '%' } }));
    },
    sgd(n) {
      return 'S$' + Number(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  EDR.fmtDate = function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };
})();
