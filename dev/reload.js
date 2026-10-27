// Development only: reloads the unpacked extension when its files change. Open
// EduRec tabs keep the old scripts until their next page load: reloading an
// EduRec page signs you out ("UnAuthorized Token"), so this never does. It asks the harness
// server (npm run harness) for a version stamp; with no server running it does
// nothing. The store build leaves this file and the "background" key out
// (scripts/build.mjs).
const PORTS = [8765, 8766, 8767];
let seen = null;
let pending = null; // a new stamp, waiting for the files to stop changing

async function stamp() {
  for (const port of PORTS) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/__dev/version', { cache: 'no-store' });
      if (r.ok) return (await r.text()).trim();
    } catch (e) { /* no server on this port */ }
  }
  return null;
}

async function poll() {
  // An extension API call keeps this service worker from being stopped while idle.
  chrome.runtime.getPlatformInfo(() => {});
  const v = await stamp();
  // Reload once a changed stamp holds for two polls, not on every save in a run of edits.
  if (v && seen && v !== seen) {
    if (v === pending) {
      chrome.runtime.reload();
      return;
    }
    pending = v;
  } else if (v) seen = v;
  setTimeout(poll, 1500);
}

// Listeners so Chrome starts the worker at browser start and after a reload.
chrome.runtime.onStartup.addListener(() => {});
chrome.runtime.onInstalled.addListener(() => {});
poll();
