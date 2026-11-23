/* Defense by position: fantasy points each team allows per game to PG / SG / SF / PF / C.
   Two places: the Team defense deep dive (selected team) and the Matchup lookup (both teams, for the opponent's position).
   Data: data/defense_by_position.json (FantasyTeamAdvice DvP). */
(() => {
  const H = window.HB; if (!H) return;
  const POS = [['pg', 'PG · Point guard', 'point guards'], ['sg', 'SG · Shooting guard', 'shooting guards'], ['sf', 'SF · Small forward', 'small forwards'], ['pf', 'PF · Power forward', 'power forwards'], ['c', 'C · Center', 'centers']];
  const NAME = (r) => { const tm = (H.rows('teams') || []).find((d) => d.team === r.team); return tm ? tm.name : r.team; };
  H.pos = null;   // opponent position picked by the user (shared by both blocks)
  const redraw = () => { dash.draw('def_pos'); dash.draw('lk_pos'); };

  /* Missing or unreadable data file: say which file, instead of a vague error */
  const missing = (el) => {
    const st = dash.data('defpos').status;
    el.append(H.el('p', 'sub', st === 'error' ? 'Position numbers not found. Make sure data/defense_by_position.json is uploaded to the data folder of your repo.' : 'Loading position numbers…'));
  };

  /* PG · SG · SF · PF · C buttons */
  const picker = (cur, hint) => {
    const box = H.el('div'); box.append(H.el('p', 'sub', hint));
    const tabs = H.el('div', 'tabs'); tabs.setAttribute('role', 'tablist'); tabs.style.margin = '4px 0 10px';
    POS.forEach(([k, lab]) => {
      const b = H.el('button', 'tab', k.toUpperCase()); b.type = 'button'; b.title = lab.split(' · ')[1]; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', k === cur ? 'true' : 'false'); b.onclick = () => { H.pos = k; redraw(); };
      tabs.append(b);
    });
    box.append(tabs); return box;
  };

  /* One tile: how much this team gives up to a position, vs the league */
  const tile = (t, r, k, extra) => {
    const lab = POS.find((p) => p[0] === k), rk = r[k + '_rk'], avg = d3.mean(t, (d) => d[k]), diff = r[k] - avg;
    const d = H.el('div', 'tile'); d.append(H.el('div', 'k', `${NAME(r)} give up to ${lab[2]}`));
    d.append(H.el('div', 'v', H.N(r[k])));
    d.append(H.el('div', 'r ' + H.C(rk), `#${rk} of 30${extra || ''}`));
    d.append(H.el('div', 'k', `league avg ${H.N(avg)} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})`));
    return d;
  };

  const CAPTION = 'Fantasy points allowed per game to each position (points, rebounds, assists, steals, blocks and 3s combined, so not raw points). Rank 1 = fewest allowed. Source: FantasyTeamAdvice, Nov 22.';

  /* ---------- Team defense deep dive ---------- */
  dash.draw('def_pos', (el) => {
    el.replaceChildren();
    if (!H.sel.def) return;
    const t = H.rows('defpos');
    if (!t) { missing(el); return; }
    const r = t.find((d) => d.team === H.sel.def); if (!r) return;

    el.append(H.el('h3', null, 'Points given up by position'));
    const byRk = POS.slice().sort((a, b) => r[b[0] + '_rk'] - r[a[0] + '_rk']);   // worst coverage first
    const worst = byRk[0], best = byRk[byRk.length - 1], soft = byRk.filter((p) => r[p[0] + '_rk'] >= 21);
    const lede = H.el('p', 'lede');
    if (soft.length) {
      lede.append('Weakest coverage: ', H.el('b', 'bad', `${worst[2]} (#${r[worst[0] + '_rk']} of 30, ${H.N(r[worst[0]])} a game)`));
      if (soft.length > 1) lede.append('. Also soft against ', soft.slice(1).map((p) => `${p[2]} (#${r[p[0] + '_rk']})`).join(', '));
    } else {
      lede.append(`No position is in the bottom 10. Softest spot: ${worst[2]} (#${r[worst[0] + '_rk']} of 30)`);
    }
    if (r[best[0] + '_rk'] <= 10) lede.append('. Toughest against ', H.el('b', 'good', `${best[2]} (#${r[best[0] + '_rk']})`));
    lede.append('.');
    el.append(lede);

    /* Pick the opponent's position; starts on the team's weakest one */
    const cur = H.pos || worst[0];
    el.append(picker(cur, "Pick the opponent's position to see what this team gives up to it"));
    const tiles = H.el('div', 'tiles'); tiles.append(tile(t, r, cur, cur === worst[0] ? ' · their weakest position' : '')); el.append(tiles);

    const cap = H.el('p', 'sub', CAPTION + ' Line = league average for that position.'); cap.style.margin = '4px 0 10px'; el.append(cap);
    const maxV = Math.max(...t.map((d) => Math.max(...POS.map((p) => d[p[0]]))));
    POS.forEach(([k, lab]) => {
      const rk = r[k + '_rk'], row = H.el('div', 'srcrow'); row.style.gridTemplateColumns = '10.5em 1fr 7em';
      const l = H.el('div', k === worst[0] && soft.length ? 'bad' : null, lab); if (k === cur) l.style.fontWeight = '700'; row.append(l);
      const bar = H.el('div', 'bar'), fill = H.el('div', 'fill');
      fill.style.width = (r[k] / maxV * 100) + '%'; fill.style.background = rk <= 10 ? 'var(--color-ok)' : rk >= 21 ? 'var(--cds-chart-status-critical)' : dash.colors[0]; bar.append(fill);
      const av = H.el('div', 'avg'); av.style.left = (d3.mean(t, (d) => d[k]) / maxV * 100) + '%'; bar.append(av); row.append(bar);
      const v = H.el('div'); v.append(H.N(r[k]) + ' '); v.append(H.el('span', H.C(rk), '(#' + rk + ')')); row.append(v);
      el.append(row);
    });
  });

  /* ---------- Matchup lookup: both teams vs the opponent's position ---------- */
  dash.draw('lk_pos', (el) => {
    el.replaceChildren();
    if (!H.a && !H.b) return;
    const t = H.rows('defpos');
    el.append(H.el('h3', null, "Defense vs the opponent's position"));
    if (!t) { missing(el); return; }
    el.append(picker(H.pos, 'Pick a position to see what each defense gives up to it'));
    if (!H.pos) return;
    const tiles = H.el('div', 'tiles');
    [H.a, H.b].forEach((code) => { const r = code && t.find((d) => d.team === code); if (r) tiles.append(tile(t, r, H.pos)); });
    el.append(tiles);
    const cap = H.el('p', 'sub', CAPTION); el.append(cap);
  });

  /* Redraw when the team changes (dropdown or matchup lookup) or the opponent changes */
  const setTeam = H.setTeam;
  H.setTeam = (v) => { setTeam(v); redraw(); };
  document.querySelectorAll('[data-draw="lk_b"]').forEach((s) => s.addEventListener('change', () => setTimeout(() => dash.draw('lk_pos'), 0)));
})();
