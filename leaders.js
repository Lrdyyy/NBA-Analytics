/* Offense tab: top 3 players on the selected team in each stat, from the last-10-game box scores (data/players_last10.json).
   Turnovers show up automatically once the game data has a "tov" field. */
(() => {
  const H = window.HB; if (!H) return;
  const MIN_GP = 3, MIN_3PA = 1.5;   // players need 3+ games; 3-pt % needs 1.5+ attempts a game
  const avg = (g, k) => g.reduce((s, r) => s + Number(r[k]), 0) / g.length;
  const f1 = (v) => v.toFixed(1), pc = (v) => v.toFixed(1) + '%';
  const CATS = [
    ['pts', 'Points', (g) => avg(g, 'pts'), f1], ['reb', 'Rebounds', (g) => avg(g, 'reb'), f1], ['ast', 'Assists', (g) => avg(g, 'ast'), f1],
    ['stl', 'Steals', (g) => avg(g, 'stl'), f1], ['blk', 'Blocks', (g) => avg(g, 'blk'), f1], ['tov', 'Turnovers', (g) => { const t = g.filter((r) => r.tov != null); return t.length >= 2 ? avg(t, 'tov') : null; }, f1],
    ['tpm', '3-pt made', (g) => avg(g, 'tpm'), f1], ['tpa', '3-pt attempts', (g) => avg(g, 'tpa'), f1],
    ['tpp', '3-pt %', (g) => { const a = g.reduce((s, r) => s + Number(r.tpa), 0); return a ? g.reduce((s, r) => s + Number(r.tpm), 0) / a * 100 : null; }, pc, (g) => avg(g, 'tpa') >= MIN_3PA]
  ];

  dash.draw('off_leaders', (el) => {
    el.replaceChildren();
    if (!H.sel.off) return;
    const log = H.rows('lakers_log');
    if (!log) { el.append(H.el('p', 'sub', dash.data('lakers_log').status === 'error' ? 'Player numbers not found. Make sure data/players_last10.json is uploaded.' : 'Loading player numbers…')); return; }
    const rows = log.filter((r) => r.team === H.sel.off);
    const by = {}; rows.forEach((r) => { (by[r.player] = by[r.player] || []).push(r); });
    const pl = Object.entries(by).filter(([, g]) => g.length >= MIN_GP).map(([name, g]) => ({ name, g, min: avg(g, 'min') }));
    el.append(H.el('h3', null, 'Team leaders · last 10 games'));
    const cap = H.el('p', 'sub', `Per-game averages over the team's last 10 games. Players need ${MIN_GP}+ games; 3-pt % needs ${MIN_3PA}+ attempts a game.`); cap.style.marginBottom = '8px'; el.append(cap);
    if (!pl.length) { el.append(H.el('p', 'sub', 'No player games found for this team.')); return; }
    const grid = H.el('div', 'leaders');
    CATS.forEach(([k, title, val, fmt, ok]) => {
      const box = H.el('div', 'lead'); box.append(H.el('div', 'k', title));
      if (k === 'tov' && !rows.some((r) => r.tov != null)) { box.append(H.el('div', 'none', "Turnovers aren't in the game data yet.")); grid.append(box); return; }
      const top = pl.filter((p) => !ok || ok(p.g)).map((p) => ({ p, v: val(p.g) })).filter((x) => x.v != null && !isNaN(x.v))
        .sort((a, b) => b.v - a.v || b.p.min - a.p.min).slice(0, 3);
      if (!top.length) box.append(H.el('div', 'none', k === 'tov' ? 'Not enough tracked games yet (needs 2+).' : 'No qualifying players.'));
      if (k === 'tov' && top.length) { const n = new Set(rows.filter((r) => r.tov != null).map((r) => r.date)).size; box.append(H.el('div', 'none', 'Only games since Nov 19 so far (' + n + ' tracked).')); }
      top.forEach((x, i) => {
        const row = H.el('div', 'p' + (i === 0 ? ' top' : '')); row.append(H.el('span', 'n', String(i + 1)), H.el('span', 'nm', x.p.name), H.el('span', 'v', fmt(x.v))); box.append(row);
      });
      grid.append(box);
    });
    el.append(grid);
  });

  const setTeam = H.setTeam;
  H.setTeam = (v) => { setTeam(v); dash.draw('off_leaders'); };
})();
