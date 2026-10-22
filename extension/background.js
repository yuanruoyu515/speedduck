/* All durable state lives in storage; this worker may stop between any two events. */
const api = globalThis.browser ?? chrome;
const DEFAULTS = { force: true, pitch: true };
const session = api.storage.session;
const tabKey = id => `tab:${id}`;
const siteKey = host => `site:${host}`;
const clampRate = value => Math.min(16, Math.max(0.25, Math.round(Number(value) * 100) / 100));
function hostname(url) { try { return new URL(url).hostname; } catch { return ''; } }
let queue = Promise.resolve(); // Ordering only; never used as durable state.
function ordered(fn) { const previous = queue; const next = (async () => { try { await previous; } catch {} return fn(); })(); queue = next; return next; }

async function getTab(id) {
  try { return await api.tabs.get(id); } catch { return { id }; }
}
async function readTab(id) {
  const key = tabKey(id);
  return (await session.get(key))[key] ?? { rate: null, rememberTab: false, frames: {} };
}
async function config(id) {
  const tab = await getTab(id);
  const host = hostname(tab.url);
  const state = await readTab(id);
  const saved = await api.storage.local.get(['preferences', siteKey(host)]);
  const site = saved[siteKey(host)];
  const prefs = { ...DEFAULTS, ...saved.preferences };
  return { rate: state.rate ?? site?.rate ?? 1, rememberTab: state.rememberTab,
    rememberSite: !!site, host, ...prefs,
    count: Object.values(state.frames ?? {}).reduce((sum, f) => sum + f.count, 0),
    limited: Object.values(state.frames ?? {}).some(f => f.limited),
    supported: /^https?:/.test(tab.url ?? '') };
}
async function publish(id) {
  const current = await config(id);
  try { await api.tabs.sendMessage(id, { type: 'sm:config', config: current }); } catch { /* No granted page yet. */ }
  try {
    await api.action.setBadgeText({ tabId: id, text: current.rate === 1 ? '' : `${current.rate}×` });
    await api.action.setBadgeBackgroundColor({ tabId: id, color: '#087bff' });
  } catch { /* Safari may not expose badge appearance APIs. */ }
  return current;
}
async function update(id, patch) {
  const current = await config(id);
  if (!current.supported) throw new Error('请在普通网页中使用 speedduck。');
  const state = await readTab(id);
  if ('rate' in patch) {
    if (!Number.isFinite(Number(patch.rate))) throw new Error('无效倍速');
    state.rate = clampRate(patch.rate);
  }
  if ('rememberTab' in patch) { state.rememberTab = !!patch.rememberTab; state.rate ??= current.rate; }
  if ('force' in patch || 'pitch' in patch) {
    const preferences = { force: current.force, pitch: current.pitch };
    for (const key of ['force', 'pitch']) if (key in patch) preferences[key] = !!patch[key];
    await api.storage.local.set({ preferences });
  }
  if ('rememberSite' in patch) {
    if (patch.rememberSite) await api.storage.local.set({ [siteKey(current.host)]: { rate: state.rate ?? current.rate } });
    else await api.storage.local.remove(siteKey(current.host));
  } else if ('rate' in patch && current.rememberSite) {
    await api.storage.local.set({ [siteKey(current.host)]: { rate: state.rate } });
  }
  await session.set({ [tabKey(id)]: state });
  // Update other tabs on the same host, preserving explicit per-tab overrides.
  const tabs = await api.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === id || 'force' in patch || 'pitch' in patch || hostname(tab.url) === current.host) await publish(tab.id);
  }
  return config(id);
}
async function handle(message, sender) {
  const id = sender.tab?.id ?? message.tabId;
  if (!Number.isInteger(id)) throw new Error('未找到当前标签页');
  if (message.type === 'sm:hello') {
    const state = await readTab(id);
    if (sender.frameId === 0 && state.documentToken !== message.token) {
      state.documentToken = message.token;
      state.url = (await getTab(id)).url;
      state.frames = {};
      if (!state.rememberTab) state.rate = null;
      await session.set({ [tabKey(id)]: state });
      await publish(id);
    }
    return config(id);
  }
  if (message.type === 'sm:get') return config(id);
  if (message.type === 'sm:update' && !sender.tab) return update(id, message.patch ?? {});
  if (message.type === 'sm:report' && sender.tab) {
    const state = await readTab(id);
    const count = Math.max(0, Math.min(10000, Number(message.count) || 0));
    state.frames[sender.frameId ?? 0] = { count, limited: !!message.limited };
    await session.set({ [tabKey(id)]: state });
    return { ok: true };
  }
  if (message.type === 'sm:key' && sender.tab && ['up', 'down', 'reset'].includes(message.action)) {
    const current = await config(id);
    return update(id, { rate: message.action === 'reset' ? 1 : current.rate + (message.action === 'up' ? 0.25 : -0.25) });
  }
  throw new Error('Unknown request');
}
api.runtime.onMessage.addListener((message, sender, reply) => {
  if (!message?.type?.startsWith('sm:')) return false;
  // Restrict control to our extension contexts, never externally supplied messages.
  ordered(async () => {
    try { reply({ ok: true, data: await handle(message, sender) }); }
    catch (error) { reply({ ok: false, error: error.message }); }
  });
  return true;
});
api.tabs.onRemoved.addListener(id => { void ordered(() => session.remove(tabKey(id))); });
api.tabs.onUpdated.addListener((id, change) => {
  if (!change.url) return;
  void ordered(async () => {
    const state = await readTab(id);
    if (state.url === change.url) return;
    state.url = change.url;
    if (!state.rememberTab) state.rate = null;
    await session.set({ [tabKey(id)]: state });
    await publish(id);
  }).catch(() => {});
});
api.commands.onCommand.addListener(command => {
  void ordered(async () => {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const current = await config(tab.id);
    await update(tab.id, { rate: command === 'speed-reset' ? 1 : current.rate + (command === 'speed-up' ? .25 : -.25) });
  }).catch(() => {});
});
