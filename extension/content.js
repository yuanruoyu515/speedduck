(() => {
  if (globalThis.__speedDuckContent) return;
  globalThis.__speedDuckContent = true;
  const api = globalThis.browser ?? chrome;
  const token = crypto.randomUUID();
  const CHANNEL = 'speedduck:1';
  let current;
  let lastReport = '';
  let connected = false;
  function sendConfig() {
    if (current) window.postMessage({ channel: CHANNEL, source: 'extension', type: 'config', config: current }, '*');
  }
  async function boot() {
    try {
      const response = await api.runtime.sendMessage({ type: 'sm:hello', token });
      if (response?.ok) { current = response.data; connected = true; sendConfig(); }
    } catch { /* Extension update / permission not yet granted. */ }
  }
  api.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'sm:ping') { reply({ alive: true }); return; }
    if (message?.type !== 'sm:config') return;
    current = message.config;
    sendConfig();
  });
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || m?.channel !== CHANNEL || m.source !== 'page') return;
    if (m.type === 'ready') { if (connected) sendConfig(); else void boot(); }
    if (m.type === 'status') {
      const count = Math.max(0, Math.min(10000, Number(m.count) || 0));
      const signature = `${count}:${!!m.limited}`;
      if (signature === lastReport) return;
      lastReport = signature;
      void api.runtime.sendMessage({ type: 'sm:report', count, limited: !!m.limited }).catch(() => {});
    }
  });
  // Opt+Shift+arrows, plus R. Never intercept typing, sliders or page-owned shortcuts.
  document.addEventListener('keydown', event => {
    if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey || event.repeat) return;
    const path = event.composedPath();
    if (path.some(el => el.isContentEditable || el.matches?.('input,textarea,select,[role="textbox"]'))) return;
    const action = { ArrowUp: 'up', ArrowDown: 'down', KeyR: 'reset' }[event.code];
    if (!action) return;
    event.preventDefault();
    void api.runtime.sendMessage({ type: 'sm:key', action }).catch(() => {});
  }, true);
  window.addEventListener('pageshow', () => { lastReport = ''; void boot(); });
  window.addEventListener('pagehide', () => {
    lastReport = '';
    void api.runtime.sendMessage({ type: 'sm:report', count: 0, limited: false }).catch(() => {});
  });
  void boot();
  // A small retry window handles a cold background worker; no permanent message polling.
  for (const delay of [350, 1200, 3000]) setTimeout(() => { if (!connected) void boot(); }, delay);
})();
