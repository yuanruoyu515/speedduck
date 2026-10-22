/* Runs at document_start in the page world. No extension APIs or private data cross this bridge. */
(() => {
  if (globalThis.__speedDuckPage) return;
  Object.defineProperty(globalThis, '__speedDuckPage', { value: true });
  const CHANNEL = 'speedduck:1';
  let settings = { rate: 1, force: false, pitch: true };
  let configured = false;
  let applying = false;
  let reportTimer;
  const media = new Set();
  const roots = new WeakSet();
  const proto = HTMLMediaElement.prototype;
  const descriptors = Object.fromEntries(['playbackRate', 'defaultPlaybackRate'].map(key => [key, Object.getOwnPropertyDescriptor(proto, key)]));
  const pitchDescriptor = Object.getOwnPropertyDescriptor(proto, 'preservesPitch') ?? Object.getOwnPropertyDescriptor(proto, 'webkitPreservesPitch');
  const originalAttachShadow = Element.prototype.attachShadow;

  function post(type, data = {}) { window.postMessage({ channel: CHANNEL, source: 'page', type, ...data }, '*'); }
  function nativeRate(el) { try { return descriptors.playbackRate.get.call(el); } catch { return NaN; } }
  function enforce(el) {
    if (!configured || applying) return;
    applying = true;
    try {
      for (const key of ['defaultPlaybackRate', 'playbackRate']) {
        const d = descriptors[key];
        if (d && Math.abs(d.get.call(el) - settings.rate) > .001) d.set.call(el, settings.rate);
      }
      if (pitchDescriptor?.set) pitchDescriptor.set.call(el, settings.pitch);
    } catch { /* Some live / protected streams reject playbackRate. Expose that in status. */ }
    finally { applying = false; }
  }
  function report() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => {
      let limited = false;
      for (const el of media) {
        if (!el.isConnected) { media.delete(el); continue; }
        if (configured && Math.abs(nativeRate(el) - settings.rate) > .01) limited = true;
      }
      post('status', { count: media.size, limited });
    }, 90);
  }
  function track(el) {
    if (media.has(el)) return;
    media.add(el);
    for (const type of ['play', 'playing', 'loadedmetadata', 'canplay', 'emptied', 'ratechange']) {
      el.addEventListener(type, () => {
        if (settings.force || type !== 'ratechange') enforce(el);
        report();
      });
    }
    enforce(el);
    report();
  }
  function scan(node) {
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.matches?.('video,audio')) track(node);
    for (const el of node.querySelectorAll?.('video,audio') ?? []) track(el);
    if (node.shadowRoot) watch(node.shadowRoot);
    for (const el of node.querySelectorAll?.('*') ?? []) if (el.shadowRoot) watch(el.shadowRoot);
  }
  function watch(root) {
    if (roots.has(root)) return;
    roots.add(root);
    const observer = new MutationObserver(records => {
      // Coalesce subtrees; avoid repeatedly scanning the same newly inserted descendants.
      const added = new Set();
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) added.add(node);
      for (const node of added) if (!added.has(node.parentNode)) scan(node);
      report();
    });
    observer.observe(root, { childList: true, subtree: true });
    scan(root);
  }
  for (const key of Object.keys(descriptors)) {
    const d = descriptors[key];
    if (!d?.configurable || !d.set) continue;
    Object.defineProperty(proto, key, {
      ...d,
      set(value) {
        return d.set.call(this, configured && settings.force ? settings.rate : value);
      }
    });
  }
  // Capture even closed roots created after document_start; do not change their visibility.
  Element.prototype.attachShadow = function (...args) {
    const root = Reflect.apply(originalAttachShadow, this, args);
    watch(root);
    return root;
  };
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || m?.channel !== CHANNEL || m.source !== 'extension' || m.type !== 'config') return;
    if (!Number.isFinite(m.config?.rate) || m.config.rate < .25 || m.config.rate > 16) return;
    settings = { rate: m.config.rate, force: !!m.config.force, pitch: !!m.config.pitch };
    configured = true;
    for (const el of media) enforce(el);
    report();
  });
  watch(document);
  // Covers native controls, saved original setters and unusual player code. No full DOM polling.
  setInterval(() => {
    for (const el of media) {
      if (!el.isConnected) media.delete(el);
      else if (settings.force) enforce(el);
    }
    report();
  }, 650);
  window.addEventListener('pageshow', () => { post('ready'); report(); });
  post('ready');
})();
