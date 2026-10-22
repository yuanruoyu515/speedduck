const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8');
function area() {
  const data = {};
  return { data, async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, structuredClone(data[k])])); },
    async set(values) { Object.assign(data, structuredClone(values)); }, async remove(key) { delete data[key]; } };
}
const local = area(), session = area();
const tabs = new Map([[1, { id: 1, url: 'https://video.example/watch' }], [2, { id: 2, url: 'https://video.example/other' }], [3, { id: 3, url: 'https://other.example/' }]]);
let listener, removed, updated;
function start() {
  const api = { storage: { local, session }, runtime: { onMessage: { addListener(fn) { listener = fn; } } },
    tabs: { async get(id) { return tabs.get(id); }, async query() { return [...tabs.values()]; }, async sendMessage() {}, onRemoved: { addListener(fn) { removed = fn; } }, onUpdated: { addListener(fn) { updated = fn; } } },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} }, commands: { onCommand: { addListener() {} } } };
  vm.runInNewContext(source, { chrome: api, URL, console });
}
async function message(type, extra = {}, sender = {}) {
  const result = await new Promise(resolve => listener({ type, tabId: 1, ...extra }, sender, resolve));
  assert.equal(result.ok, true, result.error);
  return result.data;
}
const top = { tab: tabs.get(1), frameId: 0 };
(async () => {
  start();
  assert.equal((await message('sm:hello', { token: 'a' }, top)).rate, 1);
  assert.equal((await message('sm:update', { patch: { rate: 2 } })).rate, 2);
  assert.equal((await message('sm:get')).rememberSite, false);
  await message('sm:hello', { token: 'b' }, top);
  assert.equal((await message('sm:get')).rate, 1, 'no page override survives navigation');
  await message('sm:update', { patch: { rate: 2.5, rememberTab: true } });
  tabs.get(1).url = 'https://other.example/new';
  await message('sm:hello', { token: 'c' }, top);
  assert.equal((await message('sm:get')).rate, 2.5, 'remember tab crosses sites');
  start();
  assert.equal((await message('sm:get')).rate, 2.5, 'worker restart retains tab state');
  await message('sm:update', { patch: { rememberTab: false, rememberSite: true, rate: 3 } });
  await message('sm:hello', { token: 'd' }, top);
  assert.equal((await message('sm:get')).rate, 3, 'site memory survives navigation');
  assert.equal((await message('sm:get', { tabId: 3 })).rate, 3, 'site memory applies to new tab');
  assert.equal((await message('sm:get', { tabId: 2 })).rate, 1, 'unrelated site remains normal');
  tabs.get(1).url = 'https://video.example/back';
  await message('sm:hello', { token: 'e' }, top);
  assert.equal((await message('sm:get')).rate, 1, 'site memory does not cross sites');
  await message('sm:update', { patch: { rate: 2, rememberSite: true } });
  assert.equal((await message('sm:get', { tabId: 2 })).rate, 2);
  await message('sm:update', { patch: { rememberSite: false } });
  assert.equal((await message('sm:get', { tabId: 2 })).rate, 1, 'turning off site memory removes saved preference');
  await message('sm:report', { count: 2 }, top);
  await message('sm:report', { count: 3, limited: true }, { tab: tabs.get(1), frameId: 9 });
  let state = await message('sm:get');
  assert.equal(state.count, 5); assert.equal(state.limited, true);
  await message('sm:hello', { token: 'f' }, top);
  assert.equal((await message('sm:get')).count, 0, 'navigation clears stale frame reports');
  await message('sm:update', { patch: { rate: 4 } });
  updated(1, { url: 'https://video.example/spa-next' });
  await new Promise(r => setImmediate(r));
  assert.equal((await message('sm:get')).rate, 1, 'SPA navigation obeys memory preference');
  assert.equal((await message('sm:update', { patch: { rate: 100 } })).rate, 16);
  assert.equal((await message('sm:update', { patch: { rate: 0 } })).rate, .25);
  await message('sm:update', { patch: { force: false, pitch: false } });
  start(); state = await message('sm:get');
  assert.equal(state.force, false); assert.equal(state.pitch, false);
  const denied = await new Promise(resolve => listener({ type: 'sm:update', patch: { rate: 4 } }, top, resolve));
  assert.equal(denied.ok, false, 'web content cannot mutate extension settings');
  removed(1);
  await new Promise(r => setImmediate(r));
  assert.equal(session.data['tab:1'], undefined, 'closed tabs do not leak settings');
  console.log('PASS: navigation, tab/site scopes, worker restart, frames, limits, privacy, cleanup');
})().catch(e => { console.error(e); process.exitCode = 1; });
