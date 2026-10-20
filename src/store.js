(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Everything stays in chrome.storage.local on this device. Nothing is sent anywhere.
  const DATA = 'edr:data';
  const ENABLED = 'edr:enabled';

  const area = () => chrome.storage.local;

  async function isEnabled() {
    const got = await area().get(ENABLED);
    return got[ENABLED] !== false;
  }

  async function setEnabled(on) {
    await area().set({ [ENABLED]: !!on });
  }

  async function getData() {
    const got = await area().get(DATA);
    return got[DATA] || {};
  }

  // Saves one snapshot (e.g. "audit") with a timestamp; returns true if it changed.
  async function saveSnapshot(key, value) {
    const data = await getData();
    const prev = data[key];
    const same = prev && JSON.stringify(prev.value) === JSON.stringify(value);
    data[key] = { value, at: same ? prev.at : Date.now() };
    if (!same) await area().set({ [DATA]: data });
    return !same;
  }

  const PREFS = 'edr:prefs';

  async function getPrefs() {
    const got = await area().get(PREFS);
    return got[PREFS] || {};
  }

  // Writes are queued so two quick toggles can't overwrite each other.
  let prefsQueue = Promise.resolve();
  function setPrefs(patch) {
    prefsQueue = prefsQueue.then(async () => {
      const prefs = { ...(await getPrefs()), ...patch };
      await area().set({ [PREFS]: prefs });
    }).catch(() => {});
    return prefsQueue;
  }

  async function clearData() {
    await area().remove(DATA);
  }

  function onDataChange(fn) {
    chrome.storage.onChanged.addListener((changes, name) => {
      if (name === 'local' && changes[DATA]) fn(changes[DATA].newValue || {});
    });
  }

  EDR.store = { isEnabled, setEnabled, getData, saveSnapshot, clearData, onDataChange, getPrefs, setPrefs };
})();
