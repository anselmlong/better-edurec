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

  // Rendered text of a subtree, one line per text node. Hidden text is skipped:
  // EduRec repeats each column name as a display:none label inside every grid
  // cell ("Units Taken 4.00 Grade B+"), which would otherwise break parsing.
  EDR.nodeText = function nodeText(root) {
    const out = [];
    const live = !!root.ownerDocument.defaultView;
    const seen = new Map();
    const visible = (el) => {
      if (!live) return true;
      if (!seen.has(el)) {
        seen.set(el, el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.getClientRects().length > 0);
      }
      return seen.get(el);
    };
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('.edr-root')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return visible(p) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) out.push(walker.currentNode.nodeValue.trim());
    return out.join('\n');
  };

  EDR.isTop = typeof window !== 'undefined' && window.top === window;

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
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      for (const attr of flags) if (!document.documentElement.hasAttribute(attr)) document.documentElement.setAttribute(attr, '');
    }).observe(document.documentElement, { attributes: true });
  }

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

  // "just now", "12 min ago", "3 days ago": how fresh a saved summary is.
  EDR.ago = function ago(ts, now) {
    const s = Math.max(0, Math.round(((now || Date.now()) - ts) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' min ago';
    const hrs = Math.round(m / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(hrs / 24);
    if (d < 30) return d + (d === 1 ? ' day ago' : ' days ago');
    return 'on ' + new Date(ts).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  EDR.fmtDate = function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };
})();
