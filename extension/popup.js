(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const $ = id => document.getElementById(id);
  let tabId;
  let state;
  let access = false;
  let sequence = Promise.resolve();
  let revision = 0;
  let refreshTimer;
  const controls = ['minus', 'plus', 'reset', 'remember-tab', 'remember-site', 'force', 'pitch', 'speed-slider', 'speed-display'];
  const rate = n => Math.min(16, Math.max(.25, Math.round(n * 100) / 100));
  function error(text) { $('error').textContent = text; $('error').hidden = !text; }
  function drawSpeed(value) {
    $('speed-value').textContent = value.toFixed(2);
    const max = value > 4 ? 16 : 4;
    $('speed-slider').max = max;
    $('range-max').textContent = `${max}x`;
    $('speed-slider').value = value;
    $('speed-slider').setAttribute('aria-valuetext', `${value} 倍速`);
    $('speed-slider').style.setProperty('--fill', `${(value - .25) / (max - .25) * 100}%`);
    for (const button of document.querySelectorAll('[data-rate]')) button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === value));
    $('minus').disabled = value <= .25 || !state?.supported;
    $('plus').disabled = value >= 16 || !state?.supported;
  }
  function render(next) {
    state = next;
    for (const id of controls) $(id).disabled = !state.supported;
    for (const button of document.querySelectorAll('[data-rate]')) button.disabled = !state.supported;
    drawSpeed(state.rate);
    for (const [id, key] of [['remember-tab', 'rememberTab'], ['remember-site', 'rememberSite'], ['force', 'force'], ['pitch', 'pitch']]) $(id).checked = state[key];
    $('site-host').textContent = state.host || '请打开视频或音频网页';
    $('site-host').title = state.host;
    $('player-count').textContent = state.count;
    $('status').textContent = !state.supported ? '请在普通网页中使用' : !access ? '请允许访问此网站，然后刷新网页' : state.limited ? '播放器可能限制当前倍速' : state.count ? `已连接 ${state.count} 个播放器${state.force ? ' · 已锁速' : ''}` : '等待网页中的视频或音频';
  }
  async function request(type, data = {}) {
    const response = await api.runtime.sendMessage({ type, tabId, ...data });
    if (!response?.ok) throw new Error(response?.error || '扩展暂时未响应，请重新打开');
    return response.data;
  }
  function update(patch) {
    clearInterval(refreshTimer);
    error('');
    if (patch.rate !== undefined) patch.rate = rate(patch.rate);
    state = { ...state, ...patch };
    drawSpeed(state.rate);
    const mine = ++revision;
    // Serialize writes so rapid slider drags cannot restore an older value after a newer one.
    const previous = sequence;
    sequence = (async () => {
      try { await previous; } catch {}
      try { const next = await request('sm:update', { patch }); if (mine === revision) render(next); }
      catch (e) { error(e.message); }
    })();
  }
  $('minus').addEventListener('click', () => update({ rate: state.rate - .25 }));
  $('plus').addEventListener('click', () => update({ rate: state.rate + .25 }));
  $('reset').addEventListener('click', () => update({ rate: 1 }));
  for (const button of document.querySelectorAll('[data-rate]')) button.addEventListener('click', () => update({ rate: Number(button.dataset.rate) }));
  let sliderTimer;
  $('speed-slider').addEventListener('input', e => {
    const value = Number(e.target.value);
    state.rate = value;
    drawSpeed(value);
    clearTimeout(sliderTimer);
    sliderTimer = setTimeout(() => update({ rate: value }), 70);
  });
  $('speed-slider').addEventListener('change', e => { clearTimeout(sliderTimer); update({ rate: Number(e.target.value) }); });
  for (const [id, key] of [['remember-tab', 'rememberTab'], ['remember-site', 'rememberSite'], ['force', 'force'], ['pitch', 'pitch']]) $(id).addEventListener('change', e => update({ [key]: e.target.checked }));
  $('details-toggle').addEventListener('click', () => {
    $('details').hidden = !$('details').hidden;
    $('details-toggle').setAttribute('aria-expanded', String(!$('details').hidden));
  });
  $('speed-display').addEventListener('click', () => {
    $('custom-form').hidden = !$('custom-form').hidden;
    if (!$('custom-form').hidden) { $('custom-speed').value = state.rate; $('custom-speed').focus(); $('custom-speed').select(); }
  });
  $('custom-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!$('custom-form').reportValidity()) return;
    update({ rate: Number($('custom-speed').value) });
    $('custom-form').hidden = true;
  });
  async function boot() {
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('请打开一个网页');
      tabId = tab.id;
      try { access = !!(await api.tabs.sendMessage(tabId, { type: 'sm:ping' }))?.alive; } catch { access = false; }
      render(await request('sm:get'));
      refreshTimer = setInterval(async () => {
        try { render(await request('sm:get')); } catch { /* Keep usable controls during worker restart. */ }
      }, 1200);
    } catch (e) {
      for (const id of controls) $(id).disabled = true;
      for (const button of document.querySelectorAll('[data-rate]')) button.disabled = true;
      error(e.message);
      $('status').textContent = '无法连接当前网页';
    }
  }
  void boot();
})();
