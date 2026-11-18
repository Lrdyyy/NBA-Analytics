/* Tiny stand-in for the Claude dashboard runtime: loads the data files, runs calcs, redraws. */
window.dash = (() => {
  const DATA = { teams: 'data/nba_defense_2026_27.json', offense: 'data/nba_offense_2026_27.json', lakers_log: 'data/players_last10.json' };
  const store = {}, calcs = {}, draws = {}, order = [];
  const api = {
    colors: ['var(--chart-1)'],
    data: (id) => store[id] || { status: 'loading', data: null },
    calc: (id, def) => { calcs[id] = def; },
    draw: (name, fn) => {
      if (fn) { if (!draws[name]) order.push(name); draws[name] = fn; }
      const f = draws[name]; if (!f) return;
      document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => { try { f(el); } catch (e) { console.error('draw', name, e); } });
    },
    setLink: (h) => { try { history.replaceState(null, '', '#' + h); } catch (e) { /* ignore */ } },
    redrawAll: () => order.forEach((n) => api.draw(n)),
    updated: null
  };
  const runCalcs = () => Object.entries(calcs).forEach(([id, def]) => {
    const ins = def.inputs.map((i) => store[i]);
    if (ins.every((d) => d && d.status === 'ok')) {
      try { store[id] = { status: 'ok', data: def.fn(...ins.map((d) => d.data)) }; } catch (e) { console.error('calc', id, e); store[id] = { status: 'error', data: null }; }
    }
  });
  api.load = async () => {
    const stamp = Date.now();
    await Promise.all(Object.entries(DATA).map(async ([id, url]) => {
      try {
        const r = await fetch(url + '?t=' + stamp, { cache: 'no-store' });
        const j = await r.json();
        store[id] = { status: 'ok', data: j.rows || j };
      } catch (e) { store[id] = store[id] && store[id].status === 'ok' ? store[id] : { status: 'error', data: null }; }
    }));
    try { const m = await (await fetch('data/updated.json?t=' + stamp, { cache: 'no-store' })).json(); api.updated = m; } catch (e) { /* optional */ }
    runCalcs(); api.redrawAll();
    const u = document.getElementById('updated');
    if (u && api.updated && api.updated.at) u.textContent = 'Data updated ' + new Date(api.updated.at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) + ' PH time';
  };
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(api.redrawAll, 200); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') api.load(); });
  return api;
})();
