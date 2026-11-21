{
const H = window.HB;
const PL = H.plx = { team: '', sel: null, opp: '', metric: 'pts', sort: ['min', false] };
PL.TEAMS = [['LAL', 'Los Angeles Lakers'], ['SAS', 'San Antonio Spurs'], ['NYK', 'New York Knicks'], ['PHI', 'Philadelphia 76ers'], ['GSW', 'Golden State Warriors'], ['TOR', 'Toronto Raptors'], ['DET', 'Detroit Pistons'], ['BOS', 'Boston Celtics'], ['ATL', 'Atlanta Hawks'], ['BKN', 'Brooklyn Nets'], ['CHA', 'Charlotte Hornets'], ['CHI', 'Chicago Bulls'], ['CLE', 'Cleveland Cavaliers'], ['DAL', 'Dallas Mavericks'], ['DEN', 'Denver Nuggets'], ['HOU', 'Houston Rockets'], ['IND', 'Indiana Pacers'], ['LAC', 'LA Clippers'], ['MEM', 'Memphis Grizzlies'], ['MIA', 'Miami Heat'], ['MIL', 'Milwaukee Bucks'], ['MIN', 'Minnesota Timberwolves'], ['NOP', 'New Orleans Pelicans'], ['OKC', 'Oklahoma City Thunder'], ['ORL', 'Orlando Magic'], ['PHX', 'Phoenix Suns'], ['POR', 'Portland Trail Blazers'], ['SAC', 'Sacramento Kings'], ['UTA', 'Utah Jazz'], ['WAS', 'Washington Wizards']];
PL.METRICS = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['tpm', '3s made'], ['tpa', '3s attempted'], ['stl', 'Steals'], ['blk', 'Blocks'], ['min', 'Minutes']];
PL.fmtDate = (s) => d3.utcFormat('%b %-d')(new Date(s + 'T00:00:00Z'));
PL.players = () => { const p = H.rows('player_avgs'); return p && p.filter((r) => !PL.team || r.team === PL.team).sort((x, y) => y.gp * y.min - x.gp * x.min); };
PL.games = (all) => { const d = H.rows('lakers_log'); if (!d) return null; return d.filter((r) => r.team === PL.team && r.player === PL.sel && (all || !PL.opp || r.opp === PL.opp)).sort((a, b) => a.date.localeCompare(b.date)); };
PL.redraw = () => ['pl_team', 'pl_pick', 'pl_opp', 'pl_summary', 'pl_tiles', 'pl_chart', 'pl_log'].forEach((n) => dash.draw(n));

H.showCat = (name) => {
  document.querySelectorAll('.hb [data-cat]').forEach((b) => b.setAttribute('aria-selected', b.getAttribute('data-cat') === name ? 'true' : 'false'));
  document.querySelectorAll('.hb [data-catpanel]').forEach((p) => { p.hidden = p.getAttribute('data-catpanel') !== name; });
  dash.setLink(name === 'players' ? 'players' : H.tab);
  dash.redrawAll();
};
document.querySelectorAll('.hb [data-cat]').forEach((b) => b.addEventListener('click', () => H.showCat(b.getAttribute('data-cat'))));
if (location.hash === '#players') H.showCat('players');

dash.draw('pl_team', (sel) => {
  const ph = new Option('Pick a team…', ''); ph.disabled = true;
  sel.replaceChildren(ph, ...PL.TEAMS.map(([k, n]) => new Option(n, k)));
  sel.value = PL.team; sel.classList.toggle('ph', !PL.team);
  sel.onchange = () => { PL.team = sel.value; PL.sel = null; PL.opp = ''; PL.redraw(); dash.draw('pl_roster'); };
});

dash.draw('pl_pick', (sel) => {
  const p = PL.team ? PL.players() : null;
  const ph = new Option(PL.team ? 'Pick a player…' : 'Pick a team first…', ''); ph.disabled = true;
  if (!p || !p.length) { PL.sel = null; sel.replaceChildren(ph); sel.value = ''; sel.classList.add('ph'); return; }
  if (PL.sel && !p.some((r) => r.player === PL.sel)) PL.sel = null;
  sel.replaceChildren(ph, ...p.map((r) => new Option(`${r.player} (${r.gp} GP)`, r.player)));
  sel.value = PL.sel || ''; sel.classList.toggle('ph', !PL.sel);
  sel.onchange = () => { PL.sel = sel.value; PL.opp = ''; PL.redraw(); };
});

dash.draw('pl_opp', (sel) => {
  const g = PL.sel && PL.games(true);
  if (!g) { const o = new Option('Pick an opponent…', ''); o.disabled = true; sel.replaceChildren(o); sel.value = ''; sel.classList.add('ph'); return; }
  const seen = new Map(); g.forEach((r) => seen.set(r.opp, r));
  if (PL.opp && !seen.has(PL.opp)) PL.opp = '';
  sel.classList.toggle('ph', !PL.opp);
  sel.replaceChildren(new Option('Pick an opponent… (all games)', ''), ...[...seen.values()].sort((a, b) => a.opp_name.localeCompare(b.opp_name)).map((r) => new Option(`${r.opp_name} (D #${r.opp_def_rank})`, r.opp)));
  sel.value = PL.opp; sel.onchange = () => { PL.opp = sel.value; sel.classList.toggle('ph', !PL.opp); ['pl_summary', 'pl_chart', 'pl_log'].forEach((n) => dash.draw(n)); };
});

dash.draw('pl_summary', (el) => {
  const g = PL.sel && PL.games(false);
  if (!g || !g.length) { el.textContent = PL.team ? 'Pick a player to see his numbers.' : 'Pick a team and a player to see his numbers.'; return; }
  const M = (t, f, r) => H.M(String(t), 'lakers_log', f, 'key=' + r.key);
  if (PL.opp) {
    const parts = [];
    g.forEach((r, i) => {
      if (i) parts.push(' ');
      parts.push('vs the ', M(r.opp_name, 'opp_name', r), ' on ', PL.fmtDate(r.date), ' (', M(r.result, 'result', r), ', their defense ranks #', M(r.opp_def_rank, 'opp_def_rank', r), '): ',
        M(r.pts, 'pts', r), ' pts, ', M(r.reb, 'reb', r), ' reb, ', M(r.ast, 'ast', r), ' ast, ', M(r.tpm, 'tpm', r), '-', M(r.tpa, 'tpa', r), ' from three, ',
        M(r.stl, 'stl', r), ' stl, ', M(r.blk, 'blk', r), ' blk in ', M(r.min, 'min', r), ' min.');
    });
    el.replaceChildren(...parts);
    return;
  }
  const best = g.reduce((a, b) => (+b.pts > +a.pts ? b : a)), low = g.reduce((a, b) => (+b.pts < +a.pts ? b : a));
  el.replaceChildren('Best scoring game: ', M(best.pts, 'pts', best), ' vs the ', M(best.opp_name, 'opp_name', best), ' (defense #', M(best.opp_def_rank, 'opp_def_rank', best), '). Lowest: ',
    M(low.pts, 'pts', low), ' vs the ', M(low.opp_name, 'opp_name', low), ' (defense #', M(low.opp_def_rank, 'opp_def_rank', low), ').');
});

dash.draw('pl_tiles', (el) => {
  const p = PL.players(), r = p && PL.sel && p.find((x) => x.player === PL.sel);
  if (!r) { el.replaceChildren(); return; }
  const W = 'player=' + r.player;
  el.replaceChildren(...[['Games played', 'gp', (v) => String(v)], ['Minutes', 'min', H.N], ['Points', 'pts', H.N], ['Rebounds', 'reb', H.N], ['Assists', 'ast', H.N], ['3s made', 'tpm', H.N], ['3s attempted', 'tpa', H.N], ['3P%', 'tpp', H.P], ['Steals', 'stl', H.N], ['Blocks', 'blk', H.N]].map(([k, f, fm]) => {
    const d = H.el('div', 'tile'); d.append(H.el('div', 'k', k + (f === 'gp' ? '' : ' (last-10 avg)'))); const v = H.el('div', 'v'); v.append(H.M(fm(r[f]), 'player_avgs', f, W)); d.append(v); return d;
  }));
});

dash.draw('pl_metric', (sel) => {
  sel.replaceChildren(...PL.METRICS.map(([k, l]) => new Option(l, k)));
  sel.value = PL.metric; sel.onchange = () => { PL.metric = sel.value; dash.draw('pl_chart'); };
});

dash.draw('pl_chart', (el) => {
  const g = PL.sel && PL.games(true);
  if (!g) { el.textContent = dash.data('lakers_log').status === 'error' ? 'Failed to load' : 'The chart appears once you pick a player.'; return; }
  el.replaceChildren();
  const k = PL.metric, label = (PL.METRICS.find((m) => m[0] === k) || [k, k])[1];
  const W = el.clientWidth || 360, Hh = 260, m = { t: 18, r: 8, b: 44, l: 34 };
  const x = d3.scaleBand().domain(g.map((r) => r.key)).range([m.l, W - m.r]).padding(0.25);
  const y = d3.scaleLinear().domain([0, (d3.max(g, (r) => +r[k]) || 1) * 1.15]).nice().range([Hh - m.b, m.t]);
  const avg = d3.mean(g, (r) => +r[k]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', Hh).attr('viewBox', `0 0 ${W} ${Hh}`).attr('role', 'img').attr('aria-label', `${label} by game for ${PL.sel}, last 10 ${PL.team} games`);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)))
    .call((s) => s.selectAll('line').style('stroke', 'var(--cds-chart-grid)')).call((s) => s.select('.domain').remove());
  const byKey = new Map(g.map((r) => [r.key, r]));
  const xa = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${Hh - m.b})`).call(d3.axisBottom(x).tickSize(0).tickFormat((key) => byKey.get(key).opp));
  xa.select('.domain').remove(); xa.selectAll('text').attr('dy', '1.1em');
  if (x.step() >= 46) xa.selectAll('.tick').append('text').attr('y', 24).attr('dy', '0.9em').attr('text-anchor', 'middle').style('fill', 'var(--cds-text-secondary)').style('font-size', '10px').text((key) => d3.utcFormat('%-m/%-d')(new Date(byKey.get(key).date + 'T00:00:00Z')));
  if (x.step() < 30) xa.selectAll('text').style('font-size', '9px');
  const color = (r) => (r.opp_def_rank <= 10 ? 'var(--cds-chart-status-critical)' : r.opp_def_rank >= 21 ? 'var(--color-ok)' : dash.colors[0]);
  const op = (r) => (!PL.opp || r.opp === PL.opp ? 1 : 0.25);
  const bars = svg.append('g').selectAll('rect').data(g).join('rect').attr('x', (r) => x(r.key)).attr('width', x.bandwidth()).attr('y', (r) => y(+r[k])).attr('height', (r) => y(0) - y(+r[k])).attr('rx', 2).style('fill', color).style('opacity', op);
  if (x.step() >= 40) svg.append('g').selectAll('text').data(g).join('text').attr('x', (r) => x(r.key) + x.bandwidth() / 2).attr('y', (r) => y(+r[k]) - 4).attr('text-anchor', 'middle').style('fill', 'var(--cds-text-secondary)').style('font-size', '11px').style('opacity', op).text((r) => r[k]);
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(avg)).attr('y2', y(avg)).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3');
  const tip = d3.select(el).append('div').attr('class', 'tip').style('display', 'none');
  const show = (ev, r) => {
    const [px, py] = d3.pointer(ev, el);
    tip.style('display', null).text(`${PL.fmtDate(r.date)} ${r.home_away === 'Home' ? 'vs' : '@'} ${r.opp} (${r.result}) · D #${r.opp_def_rank} · ${r.pts} pts, ${r.reb} reb, ${r.ast} ast, ${r.tpm}-${r.tpa} 3PT, ${r.stl} stl, ${r.blk} blk`);
    const tw = tip.node().offsetWidth; tip.style('left', Math.max(0, Math.min(px + 10, el.clientWidth - tw)) + 'px').style('top', Math.max(0, py - 40) + 'px');
  };
  bars.on('pointermove', show).on('pointerleave', () => tip.style('display', 'none')).on('click', show);
});

dash.draw('pl_log', (tb) => {
  const g = PL.sel && PL.games(false); if (!g) { tb.replaceChildren(); return; }
  const cols = ['date', 'opp', 'home_away', 'result', 'opp_def_rank', 'min', 'pts', 'reb', 'ast', 'tpm', 'tpa', 'stl', 'blk'];
  tb.replaceChildren(...g.slice().reverse().map((r) => {
    const tr = H.el('tr'); tr.dataset.key = r.key;
    cols.forEach((c) => tr.append(H.el('td', c === 'opp_def_rank' ? (r[c] <= 10 ? 'bad' : r[c] >= 21 ? 'good' : 'mid') : null, c === 'date' ? PL.fmtDate(r.date) : c === 'opp_def_rank' ? '#' + r[c] : String(r[c]))));
    return tr;
  }));
});

dash.draw('pl_roster', (tb) => {
  const p = PL.players(); if (!p) { tb.replaceChildren(); return; }
  const [k, asc] = PL.sort;
  const rows = p.slice().sort((a, b) => { const x = a[k], y = b[k]; const v = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return asc ? v : -v; });
  tb.replaceChildren(...rows.map((r) => {
    const tr = H.el('tr'); tr.dataset.key = r.player;
    ['player', 'gp', 'min', 'pts', 'reb', 'ast', 'tpm', 'tpa', 'tpp', 'stl', 'blk'].forEach((c) => {
      const td = H.el('td');
      if (c === 'player') { const a = H.el('a', null, r.player); a.href = '#pl-player'; a.addEventListener('click', () => { PL.team = r.team; PL.sel = r.player; PL.opp = ''; PL.redraw(); dash.draw('pl_roster'); }); td.append(a); }
      else td.textContent = c === 'gp' ? String(r.gp) : c === 'tpp' ? H.P(r.tpp) : H.N(r[c]);
      tr.append(td);
    });
    return tr;
  }));
});

document.querySelectorAll('.hb th[data-pk]').forEach((th) => th.addEventListener('click', () => {
  const k = th.getAttribute('data-pk');
  PL.sort = PL.sort[0] === k ? [k, !PL.sort[1]] : [k, k === 'player'];
  dash.draw('pl_roster');
}));

/* Fold-down sections: redraw charts at their real width when opened */
document.querySelectorAll('.hb details.fold').forEach((d) => d.addEventListener('toggle', () => {
  if (d.open) d.querySelectorAll('[data-draw]').forEach((e) => dash.draw(e.getAttribute('data-draw')));
}));

/* Quick check: type a team + player, press Show */
PL.q = { ran: false, t: '', p: '' };
PL.ALIAS = { sixers: 'PHI', dubs: 'GSW', knicks: 'NYK', spurs: 'SAS', lakers: 'LAL', raps: 'TOR', pistons: 'DET', celtics: 'BOS', boston: 'BOS', philly: 'PHI', golden: 'GSW', 'new york': 'NYK', 'san antonio': 'SAS', toronto: 'TOR', detroit: 'DET', philadelphia: 'PHI', '76ers': 'PHI', warriors: 'GSW', 'golden state': 'GSW', raptors: 'TOR', hawks: 'ATL', atlanta: 'ATL', nets: 'BKN', brooklyn: 'BKN', hornets: 'CHA', charlotte: 'CHA', bulls: 'CHI', chicago: 'CHI', cavaliers: 'CLE', cleveland: 'CLE', mavericks: 'DAL', dallas: 'DAL', nuggets: 'DEN', denver: 'DEN', rockets: 'HOU', houston: 'HOU', pacers: 'IND', indiana: 'IND', clippers: 'LAC', la: 'LAC', grizzlies: 'MEM', memphis: 'MEM', heat: 'MIA', miami: 'MIA', bucks: 'MIL', milwaukee: 'MIL', timberwolves: 'MIN', minnesota: 'MIN', pelicans: 'NOP', 'new orleans': 'NOP', thunder: 'OKC', 'oklahoma city': 'OKC', magic: 'ORL', orlando: 'ORL', suns: 'PHX', phoenix: 'PHX', blazers: 'POR', portland: 'POR', 'trail blazers': 'POR', kings: 'SAC', sacramento: 'SAC', jazz: 'UTA', utah: 'UTA', wizards: 'WAS', washington: 'WAS', wolves: 'MIN', 't-wolves': 'MIN', cavs: 'CLE', mavs: 'DAL', clips: 'LAC', 'la clippers': 'LAC', nola: 'NOP', pels: 'NOP' };
PL.lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
PL.findTeam = (raw) => {
  const s = raw.trim().toLowerCase(); if (!s) return null;
  if (PL.ALIAS[s]) return PL.TEAMS.find((t) => t[0] === PL.ALIAS[s]);
  return PL.TEAMS.find(([k, n]) => k.toLowerCase() === s || n.toLowerCase() === s)
    || PL.TEAMS.find(([, n]) => n.toLowerCase().includes(s))
    || PL.TEAMS.find(([, n]) => { const nick = n.toLowerCase().split(' ').pop(); return PL.lev(s, nick) <= 2; }) || null;
};
PL.fold = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
PL.findPlayers = (team, raw) => {
  const s = PL.fold(raw.trim()), p = (H.rows('player_avgs') || []).filter((r) => r.team === team);
  if (!s) return [];
  const exact = p.filter((r) => PL.fold(r.player) === s); if (exact.length) return exact;
  const sub = p.filter((r) => PL.fold(r.player).includes(s)); if (sub.length) return sub;
  return p.filter((r) => PL.fold(r.player).split(' ').some((w) => PL.lev(s, w) <= 2) || PL.lev(s, PL.fold(r.player)) <= 3);
};
PL.runQ = () => { PL.q = { ran: true, t: document.getElementById('q-team').value, p: document.getElementById('q-player').value }; 
dash.draw('q_out'); dash.draw('q_ou'); };
PL.qPlayer = () => { if (!PL.q.ran) return null; const tm = PL.findTeam(PL.q.t); if (!tm) return null; const f = PL.findPlayers(tm[0], PL.q.p); return f.length === 1 ? f[0] : null; };
PL.OU = { pts: 'points', reb: 'rebounds', ast: 'assists', pra: 'pts + reb + ast', tpm: '3s made', tpa: '3s attempted', stl: 'steals', blk: 'blocks', min: 'minutes' };
PL.val = (r, k) => (k === 'pra' ? +r.pts + +r.reb + +r.ast : +r[k]);
document.getElementById('q-line').addEventListener('change', (e) => { const v = e.target.value; if (v !== '' && !isNaN(+v)) { e.target.value = Math.floor(+v) + 0.5; dash.draw('q_ou'); } });
['q-stat', 'q-line'].forEach((id) => document.getElementById(id).addEventListener('input', () => dash.draw('q_ou')));

dash.draw('q_ou', (el) => {
  el.replaceChildren();
  const A = PL.qPlayer(), log = H.rows('lakers_log');
  if (!A || !log) { el.append(H.el('p', 'sub', 'Run a quick check above, then pick a stat and type a line.')); return; }
  const k = document.getElementById('q-stat').value, lab = PL.OU[k];
  const g = log.filter((r) => r.player === A.player).sort((a, b) => a.date.localeCompare(b.date));
  const avg = d3.mean(g, (r) => PL.val(r, k));
  const raw = document.getElementById('q-line').value, typed = raw !== '' && !isNaN(+raw);
  const line = typed ? Math.floor(+raw) + 0.5 : Math.floor(avg) + 0.5;
  const over = g.filter((r) => PL.val(r, k) > line).length, under = g.filter((r) => PL.val(r, k) < line).length, push = g.length - over - under;
  const s = H.el('p', 'lede');
  s.append(`${A.player} vs ${line} ${lab}${typed ? '' : ' (his average, rounded — type your own line)'}: `);
  s.append(H.el('b', 'good', `over in ${over} of ${g.length}`), ' (' + Math.round(over / g.length * 100) + '%) · ', H.el('b', 'bad', `under in ${under}`), push ? ` · ${push} push` : '', ` · his last-10 average is ${H.N(avg)}.`);
  el.append(s);
  const W = el.clientWidth || 360, Hh = 240, m = { t: 18, r: 8, b: 30, l: 34 };
  const x = d3.scaleBand().domain(g.map((r) => r.key)).range([m.l, W - m.r]).padding(0.25);
  const y = d3.scaleLinear().domain([0, Math.max(line, d3.max(g, (r) => PL.val(r, k)) || 1) * 1.15]).nice().range([Hh - m.b, m.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', Hh).attr('viewBox', `0 0 ${W} ${Hh}`).attr('role', 'img').attr('aria-label', `${A.player} ${lab} by game against a line of ${line}`);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)))
    .call((q) => q.selectAll('line').style('stroke', 'var(--cds-chart-grid)')).call((q) => q.select('.domain').remove());
  const byKey = new Map(g.map((r) => [r.key, r]));
  const xa = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${Hh - m.b})`).call(d3.axisBottom(x).tickSize(0).tickFormat((key) => byKey.get(key).opp));
  xa.select('.domain').remove(); xa.selectAll('text').attr('dy', '1.1em'); if (x.step() < 30) xa.selectAll('text').style('font-size', '9px');
  const col = (r) => { const v = PL.val(r, k); return v > line ? 'var(--color-ok)' : v < line ? 'var(--cds-chart-status-critical)' : 'var(--cds-chart-reference)'; };
  const bars = svg.append('g').selectAll('rect').data(g).join('rect').attr('x', (r) => x(r.key)).attr('width', x.bandwidth()).attr('y', (r) => y(PL.val(r, k))).attr('height', (r) => y(0) - y(PL.val(r, k))).attr('rx', 2).style('fill', col);
  if (x.step() >= 40) svg.append('g').selectAll('text').data(g).join('text').attr('x', (r) => x(r.key) + x.bandwidth() / 2).attr('y', (r) => y(PL.val(r, k)) - 4).attr('text-anchor', 'middle').style('fill', 'var(--cds-text-secondary)').style('font-size', '11px').text((r) => PL.val(r, k));
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(line)).attr('y2', y(line)).style('stroke', 'var(--color-fg)').style('stroke-width', 1.5).style('stroke-dasharray', '5 3');
  const tip = d3.select(el).append('div').attr('class', 'tip').style('display', 'none');
  const show = (ev, r) => { const [px, py] = d3.pointer(ev, el); const v = PL.val(r, k); tip.style('display', null).text(`${PL.fmtDate(r.date)} ${r.home_away === 'Home' ? 'vs' : '@'} ${r.opp} · ${v} ${lab} · ${v > line ? 'OVER' : v < line ? 'UNDER' : 'PUSH'} ${line}`); const tw = tip.node().offsetWidth; tip.style('left', Math.max(0, Math.min(px + 10, el.clientWidth - tw)) + 'px').style('top', Math.max(0, py - 40) + 'px'); };
  bars.on('pointermove', show).on('pointerleave', () => tip.style('display', 'none')).on('click', show);
  el.append(H.el('p', 'sub', 'Green = over the line · red = under · dashed line = your line. Tap a bar for the game.'));
});
document.getElementById('q-go').addEventListener('click', PL.runQ);
['q-team', 'q-player'].forEach((id) => document.getElementById(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') PL.runQ(); }));

/* Custom dropdown (replaces <datalist>): opens BELOW the field, scrolls the field into view above the keyboard. */
(() => {
  const mk = (id, getItems) => {
    const inp = document.getElementById(id);
    const wrap = document.createElement('div'); wrap.className = 'cb';
    inp.parentNode.insertBefore(wrap, inp); wrap.append(inp);
    const ul = document.createElement('ul'); ul.className = 'cb-list'; ul.setAttribute('role', 'listbox'); ul.hidden = true; wrap.append(ul);
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false');
    let act = -1, typed = false;
    ul.addEventListener('mousedown', (ev) => ev.preventDefault());
    const fit = () => {
      const vv = window.visualViewport, top = inp.getBoundingClientRect().bottom, vh = vv ? vv.height : window.innerHeight;
      ul.style.maxHeight = Math.max(180, Math.min(520, vh - top - 8)) + 'px';
    };
    const close = () => { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); act = -1; };
    const pick = (v) => { inp.value = v; typed = false; close(); inp.dispatchEvent(new Event('change')); if (id === 'q-team') { document.getElementById('q-player').value = ''; } };
    const open = () => {
      const q = typed ? inp.value.trim().toLowerCase() : '';
      const items = getItems(q).slice(0, 600);
      ul.replaceChildren(...items.map((v) => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.textContent = v; li.addEventListener('click', () => pick(v)); return li; }));
      if (!items.length) { close(); return; }
      ul.hidden = false; inp.setAttribute('aria-expanded', 'true'); act = -1; fit();
    };
    const lift = () => setTimeout(() => { inp.scrollIntoView({ block: 'start', behavior: 'smooth' }); [300, 600, 1000].forEach((ms) => setTimeout(() => { if (!ul.hidden) fit(); }, ms)); }, 250);
    window.addEventListener('scroll', () => { if (!ul.hidden) fit(); }, { passive: true });
    window.addEventListener('resize', () => { if (!ul.hidden) fit(); });
    inp.addEventListener('focus', () => { typed = false; open(); lift(); });
    inp.addEventListener('click', () => { typed = false; open(); });
    inp.addEventListener('input', () => { typed = true; open(); });
    inp.addEventListener('blur', () => setTimeout(close, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (!ul.hidden) fit(); });
    inp.addEventListener('keydown', (e) => {
      const lis = [...ul.children];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (ul.hidden) open(); if (!lis.length) return; e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis.forEach((l, i) => l.classList.toggle('on', i === act)); lis[act].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && act >= 0 && !ul.hidden) { e.preventDefault(); e.stopImmediatePropagation(); pick(lis[act].textContent); }
      else if (e.key === 'Escape') close();
    }, true);
  };
  mk('q-team', (q) => PL.TEAMS.filter(([a, n]) => !q || n.toLowerCase().includes(q) || a.toLowerCase().startsWith(q) || Object.entries(PL.ALIAS).some(([k, v]) => v === a && k.includes(q))).map(([, n]) => n));
  mk('q-player', (q) => {
    const p = H.rows('player_avgs'); if (!p) return [];
    const t = PL.findTeam(document.getElementById('q-team').value || '');
    return p.filter((r) => (!t || r.team === t[0]) && (!q || PL.fold(r.player).includes(PL.fold(q)))).sort((a, b) => b.gp * b.min - a.gp * a.min).map((r) => r.player);
  });
})();

dash.draw('q_out', (el) => {
  el.replaceChildren();
  if (!PL.q.ran) { el.append(H.el('p', 'sub', 'Results show here.')); return; }
  const avgs = H.rows('player_avgs'), log = H.rows('lakers_log');
  if (!avgs || !log) { el.textContent = '—'; return; }
  const tm = PL.findTeam(PL.q.t);
  const status = (ok, txt) => { const p = H.el('p', 'qstat ' + (ok ? 'good' : 'bad'), (ok ? '✓ ' : '✗ ') + txt); el.append(p); };
  if (!tm) { status(false, `Team: no match for “${PL.q.t.trim() || '(blank)'}”.`); el.append(H.el('p', 'sub', 'Teams in the data: ' + PL.TEAMS.map((t) => t[1]).join(', ') + '.')); return; }
  status(true, 'Team: ' + tm[1]);
  const found = PL.findPlayers(tm[0], PL.q.p);
  if (!found.length) { status(false, `Player: no ${tm[1]} player matches “${PL.q.p.trim() || '(blank)'}” in their last 10 games.`); el.append(H.el('p', 'sub', 'Their players: ' + avgs.filter((r) => r.team === tm[0]).map((r) => r.player).join(', ') + '.')); return; }
  if (found.length > 1) { status(false, 'Player: more than one match — type more of the name: ' + found.map((r) => r.player).join(', ') + '.'); return; }
  const A = found[0], WP = 'player=' + A.player;
  status(true, 'Player: ' + A.player);
  el.append(H.el('h3', null, `${A.player} — last-10 averages (${A.gp} games played)`));
  const tiles = H.el('div', 'tiles one');
  [['PTS', 'pts', H.N], ['REB', 'reb', H.N], ['AST', 'ast', H.N], ['3PM', 'tpm', H.N], ['3PA', 'tpa', H.N], ['3P%', 'tpp', H.P], ['STL', 'stl', H.N], ['BLK', 'blk', H.N], ['MIN', 'min', H.N]].forEach(([k, f, fm]) => {
    const d = H.el('div', 'tile'); d.append(H.el('div', 'k', k)); const v = H.el('div', 'v'); v.append(H.M(fm(A[f]), 'player_avgs', f, WP)); d.append(v); tiles.append(d);
  });
  el.append(tiles);
  const games = log.filter((r) => r.player === A.player).sort((a, b) => b.date.localeCompare(a.date));
  const w = H.el('div', 'tw'), tb = H.el('table'); tb.dataset.source = 'lakers_log'; tb.dataset.rowKey = 'key';
  const hr = H.el('tr'); [['date', 'Date'], ['opp', 'Opp'], ['result', 'Result'], ['min', 'MIN'], ['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['tpm', '3PM'], ['tpa', '3PA'], ['stl', 'STL'], ['blk', 'BLK']].forEach(([f, l]) => { const h = H.el('th', null, l); h.dataset.field = f; hr.append(h); });
  const th = H.el('thead'); th.append(hr); tb.append(th); const bd = H.el('tbody');
  games.forEach((g) => { const tr = H.el('tr'); tr.dataset.key = g.key; ['date', 'opp', 'result', 'min', 'pts', 'reb', 'ast', 'tpm', 'tpa', 'stl', 'blk'].forEach((f) => tr.append(H.el('td', null, f === 'date' ? PL.fmtDate(g.date) : f === 'opp' ? (g.home_away === 'Home' ? 'vs ' : '@ ') + g.opp : String(g[f])))); bd.append(tr); });
  tb.append(bd); w.append(tb); el.append(w);
  const b = H.el('button', 'qbtn ghost', 'Open in the full player view ↓');
  b.addEventListener('click', () => { PL.team = A.team; PL.sel = A.player; PL.opp = ''; PL.redraw(); dash.draw('pl_roster'); document.getElementById('pl-player').scrollIntoView({ behavior: 'smooth' }); });
  el.append(b);
});
}
