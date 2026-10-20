(async function () {
  'use strict';
  const DATA = 'edr:data';
  const ENABLED = 'edr:enabled';
  const LABELS = { results: 'Results & GPA', audit: 'Degree audit', classes: 'Classes' };

  const toggle = document.getElementById('enabled');
  const list = document.getElementById('saved');

  const PREFS = 'edr:prefs';
  const got = await chrome.storage.local.get([DATA, ENABLED, PREFS]);
  toggle.checked = got[ENABLED] !== false;
  toggle.addEventListener('change', () => chrome.storage.local.set({ [ENABLED]: toggle.checked }));

  const prefs = got[PREFS] || {};
  const savePrefs = (patch) => Object.assign(prefs, patch) && chrome.storage.local.set({ [PREFS]: prefs });
  const home = document.getElementById('overviewHome');
  home.checked = prefs.overviewHome !== false;
  home.addEventListener('change', () => savePrefs({ overviewHome: home.checked }));
  const reprompt = document.getElementById('reprompt');
  reprompt.disabled = !prefs.setupDismissed;
  reprompt.addEventListener('click', () => { savePrefs({ setupDismissed: false }); reprompt.disabled = true; });

  function render(data) {
    list.replaceChildren(...Object.keys(LABELS).map((k) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      const when = document.createElement('span');
      name.textContent = LABELS[k];
      when.textContent = data[k] ? new Date(data[k].at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : 'Not yet';
      li.append(name, when);
      return li;
    }));
  }
  render(got[DATA] || {});

  document.getElementById('clear').addEventListener('click', async () => {
    await chrome.storage.local.remove([DATA, 'edr:seen']);
    render({});
  });
})();
