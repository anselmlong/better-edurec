(async function () {
  'use strict';
  const EDR = globalThis.EDR;

  // Leave sign-in, sign-out and session-expired pages alone.
  if (document.querySelector('form#login') || /[?&]cmd=(login|logout|expire)\b/.test(location.search)) { EDR.boot.clear(); return; }
  if (!EDR.store.alive()) { EDR.boot.clear(); return; }

  // Cache what the next page needs for its first paint (see boot.js).
  const remember = (prefs, on) => {
    const theme = EDR.themes.byId[prefs.theme] || EDR.themes.byId[EDR.themes.DEFAULT];
    EDR.boot.save({ on, theme: theme.id, dark: !!theme.dark, css: EDR.themes.cssFor(theme.id),
      collapsed: !!prefs.navCollapsed, sideCollapsed: !!prefs.sideCollapsed, overviewHome: prefs.overviewHome });
  };

  try {
    if (!(await EDR.store.isEnabled())) {
      EDR.boot.clear();
      EDR.boot.save({ on: false });
      if (EDR.isTop) EDR.shell.mountRestoreButton();
      return;
    }

    const prefs = await EDR.store.getPrefs();
    remember(prefs, true);
    EDR.flag('on');
    EDR.themes.apply(prefs.theme);
    EDR.flag('collapsed', !!prefs.navCollapsed);
    EDR.flag('side-collapsed', !!prefs.sideCollapsed);
    // Keep every frame (EduRec puts some reports in iframes) on the chosen theme.
    EDR.store.onPrefsChange((next) => {
      remember(next, true);
      if (document.documentElement.getAttribute('data-edr-theme') === next.theme) return;
      // Chosen elsewhere (popup, another tab): paint it in rather than snapping.
      if (EDR.isTop) EDR.paintTheme(() => EDR.themes.apply(next.theme)); else EDR.themes.apply(next.theme);
    });

    const page = EDR.routes.detectPage(location.href);
    if (EDR.isTop) {
      EDR.flag('top');
      EDR.shell.mount(page);
      EDR.keys.start();
      EDR.shell.followDeepLink();
      // The signed-in homepage shares its URL with the sign-in page, so confirm it by its form too.
      const lp = new URLSearchParams(location.search).get('lp');
      const isHome = page.key === 'home' || (document.getElementById('PT_LANDINGPAGE') && (!lp || lp === 'SA.EMPLOYEE.DEFAULT_LP'));
      // The Overview is optional: it replaces the homepage unless turned off in the
      // popup, and is always reachable from the sidebar (#overview).
      if (isHome && (prefs.overviewHome !== false || location.hash === '#overview')) EDR.overview.mount(prefs);
      else EDR.flag('home', false);
      EDR.guide.resume(page);
    }
    EDR.enhancers.start();
  } catch (err) {
    EDR.boot.clear();
    console.warn('[Better EduRec] failed to start; EduRec is unchanged.', err);
  }
})();
