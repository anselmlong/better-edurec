(async function () {
  'use strict';
  const DATA = 'edr:data';
  const ENABLED = 'edr:enabled';
  const LABELS = { results: 'Results & GPA', audit: 'Degree audit', classes: 'Classes', finaid: 'Financial aid' };

  const toggle = document.getElementById('enabled');
  const list = document.getElementById('saved');

  const got = await chrome.storage.local.get([DATA, ENABLED]);
  toggle.checked = got[ENABLED] !== false;
  toggle.addEventListener('change', () => chrome.storage.local.set({ [ENABLED]: toggle.checked }));

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
    await chrome.storage.local.remove(DATA);
    render({});
  });
})();
