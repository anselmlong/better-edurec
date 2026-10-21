(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Small DOM builder. Children are appended as text nodes, never parsed as HTML.
  EDR.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      // setProperty, not Object.assign: assigning el.style['--c'] silently drops custom properties.
      else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) el.style.setProperty(p.startsWith('--') ? p : p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), val);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  };

  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // One highlight per list that travels to the hovered or focused item instead of
  // each item lighting up on its own. Interruptible: a new target starts from
  // wherever the highlight is mid-flight. Returns { sync(el), hide() } for lists
  // that re-render (the palette) or drive the target themselves.
  EDR.glide = function glide(container, itemSelector, opts) {
    const o = opts || {};
    const pill = EDR.h('span', { class: 'edr-glide' + (o.className ? ' ' + o.className : ''), 'aria-hidden': 'true' });
    let current = null;
    let anim = null;

    function attach() {
      if (pill.parentNode !== container) container.prepend(pill);
      container.classList.add('edr-has-glide');
    }

    function moveTo(el) {
      attach();
      if (!el || !el.isConnected || !el.getClientRects().length) { hide(); return; }
      const c = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = r.left - c.left + container.scrollLeft - container.clientLeft;
      const y = r.top - c.top + container.scrollTop - container.clientTop;
      const to = 'translate(' + x + 'px, ' + y + 'px)';
      const glideFrom = current && pill.classList.contains('is-on') && !reducedMotion();
      const from = glideFrom ? getComputedStyle(pill).transform : null;
      const fromSize = glideFrom ? [pill.offsetWidth, pill.offsetHeight] : null;
      if (anim) anim.cancel();
      pill.style.transform = to;
      pill.style.width = r.width + 'px';
      pill.style.height = r.height + 'px';
      if (from && from !== 'none') {
        anim = pill.animate([
          { transform: from, width: fromSize[0] + 'px', height: fromSize[1] + 'px' },
          { transform: to, width: r.width + 'px', height: r.height + 'px' }
        ], { duration: o.duration || 280, easing: EASE_OUT });
      }
      pill.classList.add('is-on');
      current = el;
    }

    function hide() {
      pill.classList.remove('is-on');
      current = null;
    }

    if (!o.manual) {
      const target = (e) => e.target.closest && e.target.closest(itemSelector);
      container.addEventListener('pointerover', (e) => { const el = target(e); if (el && container.contains(el) && el !== current) moveTo(el); });
      container.addEventListener('pointerleave', () => {
        const focused = container.querySelector(itemSelector + ':focus-visible');
        if (focused) moveTo(focused); else hide();
      });
      container.addEventListener('focusin', (e) => { const el = target(e); if (el && el.matches(':focus-visible')) moveTo(el); });
      container.addEventListener('focusout', (e) => { if (!container.contains(e.relatedTarget) && !container.matches(':hover')) hide(); });
    }
    attach();
    return { sync: moveTo, hide, el: pill };
  };

  // Paints a theme change in as a circle growing from the control that chose it,
  // using a view transition. Falls back to an instant swap.
  let themeTransition = null;
  EDR.paintTheme = function paintTheme(apply, origin) {
    if (!document.startViewTransition || reducedMotion() || document.hidden) { apply(); return; }
    if (themeTransition) themeTransition.skipTransition();
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    if (origin && origin.getBoundingClientRect) {
      const r = origin.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.classList.add('edr-painting');
    const t = document.startViewTransition(apply);
    themeTransition = t;
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 460, easing: EASE_OUT, pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
    t.finished.finally(() => {
      if (themeTransition === t) themeTransition = null;
      document.documentElement.classList.remove('edr-painting');
    });
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
