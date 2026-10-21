(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Everything stays in chrome.storage.local on this device. Nothing is sent anywhere.
  const DATA = 'edr:data';
  const ENABLED = 'edr:enabled';

  // After the extension reloads, already-open tabs keep running old content
  // scripts whose chrome.* APIs throw. Treat that as 'no data' instead of crashing.
  const alive = () => { try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; } };
  const NOOP = { get: async () => ({}), set: async () => {}, remove: async () => {} };
  const area = () => (alive() ? chrome.storage.local : NOOP);

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

  // When each summary was last read from its page (even if unchanged). The setup
  // guide waits on this; it's separate from saveSnapshot's change timestamp.
  const SEEN = 'edr:seen';
  async function getSeen() {
    return (await area().get(SEEN))[SEEN] || {};
  }
  let seenQueue = Promise.resolve();
  function markSeen(key) {
    seenQueue = seenQueue.then(async () => {
      await area().set({ [SEEN]: { ...(await getSeen()), [key]: Date.now() } });
    }).catch(() => {});
    return seenQueue;
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

  function onChange(key, fn) {
    if (!alive()) return;
    chrome.storage.onChanged.addListener((changes, name) => {
      if (name === 'local' && changes[key]) fn(changes[key].newValue || {});
    });
  }
  const onDataChange = (fn) => onChange(DATA, fn);
  const onPrefsChange = (fn) => onChange(PREFS, fn);

  EDR.store = { alive, isEnabled, setEnabled, getData, saveSnapshot, clearData, onDataChange, onPrefsChange, getPrefs, setPrefs, getSeen, markSeen };
})();
