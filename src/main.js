(async function () {
  'use strict';
  const EDR = globalThis.EDR;

  // Leave the sign-in page alone.
  if (document.querySelector('form#login')) return;

  if (!(await EDR.store.isEnabled())) {
    if (EDR.isTop) EDR.shell.mountRestoreButton();
    return;
  }

  document.documentElement.classList.add('edr-on');
  const page = EDR.routes.detectPage(location.href);

  if (EDR.isTop) {
    document.documentElement.classList.add('edr-top');
    EDR.shell.mount(page);
    if (page.key === 'home') EDR.overview.mount();
  }
  EDR.enhancers.start();
})();
