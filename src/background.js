'use strict';

// Overview setup runs in a background tab so the student's own tab never jumps
// around. EduRec can't be driven inside an iframe (its scripts reach for the top
// window), so the wizard runs as the top page of an inactive tab that this worker
// opens next to the student's tab and closes when the run ends. Needs no "tabs"
// permission: creating, removing and reading sender.tab.id are always allowed.

const SESSION_KEY = 'edr:collector';
const WIZARD_KEY = 'edr:wizard';

const getCollector = async () => (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] || null;
const setCollector = (id) => (id ? chrome.storage.session.set({ [SESSION_KEY]: id }) : chrome.storage.session.remove(SESSION_KEY));

async function closeCollector() {
  const id = await getCollector();
  await setCollector(null);
  if (id) { try { await chrome.tabs.remove(id); } catch (e) { /* already closed */ } }
}

const HANDLERS = {
  async 'collect:start'(msg, sender) {
    await closeCollector();
    const url = new URL(msg.path, 'https://myedurec.nus.edu.sg').href;
    if (!url.startsWith('https://myedurec.nus.edu.sg/')) return { ok: false };
    const opts = { url, active: false };
    if (sender.tab) { opts.index = sender.tab.index + 1; opts.openerTabId = sender.tab.id; opts.windowId = sender.tab.windowId; }
    const tab = await chrome.tabs.create(opts);
    await setCollector(tab.id);
    return { ok: true };
  },
  async 'collect:whoami'(msg, sender) {
    const id = await getCollector();
    return { collector: !!sender.tab && sender.tab.id === id };
  },
  async 'collect:end'() {
    await closeCollector();
    return { ok: true };
  }
};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const handler = msg && HANDLERS[msg.type];
  if (!handler) return false;
  handler(msg, sender).then(reply, (err) => reply({ ok: false, error: String(err) }));
  return true;
});

// Closing the setup tab by hand ends the run instead of leaving it half-done.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId !== (await getCollector())) return;
  await setCollector(null);
  await chrome.storage.local.remove(WIZARD_KEY);
});
