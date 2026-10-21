(async function () {
  'use strict';
  const EDR = globalThis.EDR;

  // Leave sign-in, sign-out and session-expired pages alone.
  if (document.querySelector('form#login') || /[?&]cmd=(login|logout|expire)\b/.test(location.search)) return;
  if (!EDR.store.alive()) return;

  try {
    if (!(await EDR.store.isEnabled())) {
      if (EDR.isTop) EDR.shell.mountRestoreButton();
      return;
    }

    const prefs = await EDR.store.getPrefs();
    EDR.flag('on');
    EDR.themes.apply(prefs.theme);
    if (prefs.navCollapsed) EDR.flag('collapsed');
    if (prefs.sideCollapsed) EDR.flag('side-collapsed');
    // Keep every frame (EduRec puts some reports in iframes) on the chosen theme.
    EDR.store.onPrefsChange((next) => EDR.themes.apply(next.theme));

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
      EDR.wizard.resume(page);
    }
    EDR.enhancers.start();
  } catch (err) {
    console.warn('[Better EduRec] failed to start; EduRec is unchanged.', err);
  }
})();
