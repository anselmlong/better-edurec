(async function () {
  'use strict';
  const EDR = globalThis.EDR;

  // Leave the sign-in page alone.
  if (document.querySelector('form#login')) return;

  if (!(await EDR.store.isEnabled())) {
    if (EDR.isTop) EDR.shell.mountRestoreButton();
    return;
  }

  EDR.flag('on');
  const prefs = await EDR.store.getPrefs();
  if (prefs.navCollapsed) EDR.flag('collapsed');
  if (prefs.sideCollapsed) EDR.flag('side-collapsed');
  const page = EDR.routes.detectPage(location.href);

  if (EDR.isTop) {
    EDR.flag('top');
    EDR.shell.mount(page);
    // The signed-in homepage shares its URL with the sign-in page, so confirm it by its form too.
    const lp = new URLSearchParams(location.search).get('lp');
    const isHome = page.key === 'home' || (document.getElementById('PT_LANDINGPAGE') && (!lp || lp === 'SA.EMPLOYEE.DEFAULT_LP'));
    if (isHome) EDR.overview.mount();
  }
  EDR.enhancers.start();
})();
