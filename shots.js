/* Shot chart for the Players tab: where a player shoots from, how often, and how well.
   Reads data/shots_last10.json (built by tools/fetch_shots.py from NBA.com shot locations).
   Court units are feet, basket at (0,0), baseline at y = -4.75, NBA "left" side = negative x. */
{
const H = window.HB, PL = H.plx;
const S = PL.shots = { mode: 'vol', dots: false };

S.ZONES = [
  { id: 0, name: 'At the rim', title: 'At the rim', short: 'Rim', lx: 0, ly: 1.2 },
  { id: 1, name: 'Paint (outside the restricted area)', title: 'Paint', short: 'Paint', lx: 0, ly: 10 },
  { id: 2, name: 'Mid-range, left side', title: 'Left mid-range', short: 'Mid L', lx: -15, ly: 3 },
  { id: 3, name: 'Mid-range, middle (elbows / free-throw line)', title: 'Middle mid-range', short: 'Mid C', lx: 0, ly: 18.5 },
  { id: 4, name: 'Mid-range, right side', title: 'Right mid-range', short: 'Mid R', lx: 15, ly: 3 },
  { id: 5, name: 'Left corner 3', title: 'Left corner 3', short: 'L corner 3', lx: -23.5, ly: 2 },
  { id: 6, name: 'Right corner 3', title: 'Right corner 3', short: 'R corner 3', lx: 23.5, ly: 2 },
  { id: 7, name: 'Above-the-break 3, left wing', title: 'Left wing 3', short: 'L wing 3', lx: -18, ly: 22 },
  { id: 8, name: 'Above-the-break 3, top of the key', title: 'Top-of-key 3', short: 'Top 3', lx: 0, ly: 27.5 },
  { id: 9, name: 'Above-the-break 3, right wing', title: 'Right wing 3', short: 'R wing 3', lx: 18, ly: 22 }
];
S.WEDGE = 25;              // degrees either side of straight-on that count as "middle"
S.Y0 = -4.75; S.Y1 = 31;   // drawn part of the half court (baseline to ~31 ft out)
S.CORNER_Y = Math.sqrt(23.75 * 23.75 - 22 * 22); // where the corner 3 line meets the arc (~8.95 ft)

S.data = () => { const d = dash.data('shots'); return d.status === 'ok' && d.data && d.data.players ? d.data : null; };
S.fold = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
S.find = (team, player) => {
  const D = S.data(); if (!D) return null;
  if (D.players[team + '|' + player]) return D.players[team + '|' + player];
  const want = S.fold(player);
  const k = Object.keys(D.players).find((key) => key.startsWith(team + '|') && S.fold(key.slice(team.length + 1)) === want);
  return k ? D.players[k] : null;
};

/* Per-zone totals for one player; dates = optional Set of game dates to keep */
S.tally = (P, dates) => {
  const z = S.ZONES.map((Z) => ({ ...Z, fga: 0, fgm: 0 }));
  let back = 0, games = new Set();
  const shots = P.s.filter((s) => !dates || dates.has(P.dates[s[4]]));
  shots.forEach((s) => { games.add(s[4]); if (s[3] < 0) { back++; return; } z[s[3]].fga++; z[s[3]].fgm += s[2]; });
  const fga = d3.sum(z, (r) => r.fga), fgm = d3.sum(z, (r) => r.fgm);
  z.forEach((r) => { r.pct = r.fga ? r.fgm / r.fga * 100 : null; r.share = fga ? r.fga / fga * 100 : 0; });
  return { z, shots, fga, fgm, back, games: games.size };
};

/* Most / best / weakest. Best & weakest need enough tries to mean something. */
S.verdict = (T) => {
  const used = T.z.filter((r) => r.fga > 0);
  if (!used.length) return null;
  const most = used.slice().sort((a, b) => b.fga - a.fga || b.pct - a.pct)[0];
  const minA = Math.max(4, Math.ceil(T.fga * 0.08));
  const q = used.filter((r) => r.fga >= minA);
  const best = q.length >= 2 ? q.slice().sort((a, b) => b.pct - a.pct || b.fga - a.fga)[0] : null;
  const weak = q.length >= 2 ? q.slice().sort((a, b) => a.pct - b.pct || b.fga - a.fga)[0] : null;
  return { most, best, weak: weak && best && weak.id !== best.id ? weak : null, minA };
};

S.pct = (v) => (v == null ? '—' : v.toFixed(1) + '%');

/* Zone shapes in court feet, as SVG path strings once projected */
S.courtSvg = (root, W) => {
  const s = W / 50, Hh = (S.Y1 - S.Y0) * s;
  const X = (x) => (x + 25) * s, Y = (y) => (S.Y1 - y) * s;
  const P = (pts) => 'M' + pts.map(([x, y]) => X(x) + ',' + Y(y)).join('L') + 'Z';
  const arcR = 23.75 * s;
  const three = `M${X(-22)},${Y(S.Y0)}L${X(-22)},${Y(S.CORNER_Y)}A${arcR},${arcR} 0 0 1 ${X(22)},${Y(S.CORNER_Y)}L${X(22)},${Y(S.Y0)}Z`;
  const court = P([[-25, S.Y0], [-25, S.Y1], [25, S.Y1], [25, S.Y0]]);
  const paint = P([[-8, S.Y0], [-8, 14.25], [8, 14.25], [8, S.Y0]]);
  const rim = (r) => `M${X(-r)},${Y(0)}A${r * s},${r * s} 0 1 0 ${X(r)},${Y(0)}A${r * s},${r * s} 0 1 0 ${X(-r)},${Y(0)}Z`;
  const t = Math.tan(S.WEDGE * Math.PI / 180), far = 200;
  const wedge = {
    C: P([[0, 0], [-far * t, far], [far * t, far]]),
    L: P([[0, 0], [-far * t, far], [-far, far], [-far, -10], [0, -10]]),
    R: P([[0, 0], [far * t, far], [far, far], [far, -10], [0, -10]])
  };
  const defs = root.append('defs');
  const uid = 'sc' + Math.random().toString(36).slice(2, 8);
  const clip = (name, d) => { defs.append('clipPath').attr('id', uid + name).append('path').attr('d', d); return `url(#${uid}${name})`; };
  const cl = {
    L: clip('L', wedge.L), C: clip('C', wedge.C), R: clip('R', wedge.R),
    low: clip('low', P([[-30, -10], [-30, S.CORNER_Y], [30, S.CORNER_Y], [30, -10]])),
    high: clip('high', P([[-30, S.CORNER_Y], [-30, 60], [30, 60], [30, S.CORNER_Y]])),
    left: clip('left', P([[-30, -10], [-30, 60], [0, 60], [0, -10]])),
    right: clip('right', P([[0, -10], [0, 60], [30, 60], [30, -10]])),
    court: clip('court', court)
  };
  /* one <path> per zone, wrapped in the clip groups that carve it out */
  const zonePath = (id) => {
    const g = root.append('g');
    const nest = (clips) => clips.reduce((acc, c) => acc.append('g').attr('clip-path', c), g);
    let leaf;
    if (id === 0) leaf = g.append('path').attr('d', rim(4));
    else if (id === 1) leaf = g.append('path').attr('d', paint + rim(4)).attr('fill-rule', 'evenodd');
    else if (id <= 4) leaf = nest([[cl.L, cl.C, cl.R][id - 2]]).append('path').attr('d', three + paint).attr('fill-rule', 'evenodd');
    else if (id <= 6) leaf = nest([cl.low, id === 5 ? cl.left : cl.right]).append('path').attr('d', court + three).attr('fill-rule', 'evenodd');
    else leaf = nest([cl.high, [cl.L, cl.C, cl.R][id - 7]]).append('path').attr('d', court + three).attr('fill-rule', 'evenodd');
    return leaf;
  };
  return { s, Hh, X, Y, zonePath, lines: { three, paint, court }, clipCourt: cl.court };
};

S.render = (el, team, player, dates, title) => {
  el.replaceChildren();
  const st = dash.data('shots').status;
  if (st === 'loading') { el.append(H.el('p', 'sub', 'Loading shot locations…')); return; }
  if (!S.data()) { el.append(H.el('p', 'sub', 'Shot locations aren\'t loaded yet — add data/shots_last10.json (run tools/fetch_shots.py) to turn this chart on.')); return; }
  const P = S.find(team, player);
  if (!P || !P.s.length) { el.append(H.el('p', 'sub', `No shot locations on file for ${player} in these games.`)); return; }
  const T = S.tally(P, dates);
  if (!T.fga) { el.append(H.el('p', 'sub', `${player} took no shots in the selected game${dates && dates.size === 1 ? '' : 's'}.`)); return; }
  const V = S.verdict(T), L = S.data().league || null;

  if (title) el.append(H.el('h3', null, title));

  /* Headline: most / best / weakest */
  const cards = H.el('div', 'tiles shotv');
  const card = (k, r, cls, extra) => {
    const d = H.el('div', 'tile ' + (cls || '')); d.append(H.el('div', 'k', k));
    if (!r) { d.append(H.el('div', 'v', '—'), H.el('div', 'r', extra || `Not enough tries yet (needs ${V.minA}+ in a spot)`)); return d; }
    d.append(H.el('div', 'v', r.title));
    d.append(H.el('div', 'r', `${r.fgm}/${r.fga} · ${S.pct(r.pct)} FG · ${r.share.toFixed(0)}% of his shots`));
    return d;
  };
  cards.append(card('Shoots the most from', V.most, 'most'), card('Best spot', V.best, 'best'), card('Weakest spot', V.weak, 'weak', V.best ? 'No clearly weaker spot' : undefined));
  el.append(cards);

  /* Mode buttons */
  const bar = H.el('div', 'row shotbar');
  const btn = (txt, on, fn) => { const b = H.el('button', 'qbtn ghost' + (on ? ' on' : ''), txt); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.addEventListener('click', fn); return b; };
  bar.append(
    btn('Where he shoots', S.mode === 'vol', () => { S.mode = 'vol'; S.redraw(); }),
    btn('How well (FG%)', S.mode === 'acc', () => { S.mode = 'acc'; S.redraw(); }),
    btn(S.dots ? 'Hide every shot' : 'Show every shot', S.dots, () => { S.dots = !S.dots; S.redraw(); })
  );
  el.append(bar);

  /* Court */
  const box = H.el('div', 'shotcourt'); el.append(box);
  const W = Math.min(box.clientWidth || el.clientWidth || 360, 560);
  const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${(S.Y1 - S.Y0) * W / 50}`)
    .attr('role', 'img').attr('aria-label', `Shot chart for ${player}: ${T.fga} shots in ${T.games} games. Most from ${V.most.name}.`);
  const C = S.courtSvg(svg, W);
  const maxShare = d3.max(T.z, (r) => r.share) || 1;
  const leagueAvg = (id) => (L && L[id] && L[id][0] ? L[id][1] / L[id][0] * 100 : null);
  const fill = (r) => {
    if (!r.fga) return 'transparent';
    if (S.mode === 'vol') return 'var(--chart-1)';
    const a = leagueAvg(r.id); if (a == null) return 'var(--cds-chart-reference)';
    return r.pct >= a + 3 ? 'var(--color-ok)' : r.pct <= a - 3 ? 'var(--cds-chart-status-critical)' : 'var(--cds-chart-reference)';
  };
  const opac = (r) => (!r.fga ? 0 : S.mode === 'vol' ? 0.12 + 0.78 * (r.share / maxShare) : 0.2 + 0.55 * Math.min(1, r.fga / Math.max(V.minA, 1)));
  const tip = d3.select(box).append('div').attr('class', 'tip').style('display', 'none');
  const show = (ev, r) => {
    const [px, py] = d3.pointer(ev, box), a = leagueAvg(r.id);
    tip.style('display', null).text(`${r.name}: ${r.fgm}/${r.fga} (${S.pct(r.pct)}) · ${r.share.toFixed(0)}% of his shots` + (a != null && r.fga ? ` · all players in this data: ${a.toFixed(1)}%` : ''));
    const tw = tip.node().offsetWidth; tip.style('left', Math.max(0, Math.min(px + 10, box.clientWidth - tw)) + 'px').style('top', Math.max(0, py - 44) + 'px');
  };
  T.z.forEach((r) => {
    C.zonePath(r.id).attr('class', 'zone').style('fill', fill(r)).style('fill-opacity', opac(r))
      .style('stroke', 'var(--cds-chart-axis)').style('stroke-width', 0.75)
      .on('pointermove', (ev) => show(ev, r)).on('pointerleave', () => tip.style('display', 'none')).on('click', (ev) => show(ev, r));
  });
  /* Court lines */
  const ln = svg.append('g').attr('class', 'courtln').style('fill', 'none').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.2).style('pointer-events', 'none');
  ln.append('path').attr('d', C.lines.court);
  ln.append('path').attr('d', C.lines.three);
  ln.append('path').attr('d', C.lines.paint);
  ln.append('circle').attr('cx', C.X(0)).attr('cy', C.Y(14.25)).attr('r', 6 * C.s);
  ln.append('circle').attr('cx', C.X(0)).attr('cy', C.Y(0)).attr('r', 0.75 * C.s).style('stroke', 'var(--color-bad)');
  ln.append('line').attr('x1', C.X(-3)).attr('x2', C.X(3)).attr('y1', C.Y(-1)).attr('y2', C.Y(-1)).style('stroke-width', 2);
  /* Every shot */
  if (S.dots) {
    const dg = svg.append('g').attr('clip-path', C.clipCourt).style('pointer-events', 'none');
    const r = Math.max(2, C.s * 0.45);
    T.shots.forEach((sh) => {
      const x = C.X(sh[0] / 10), y = C.Y(sh[1] / 10);
      if (sh[2]) dg.append('circle').attr('cx', x).attr('cy', y).attr('r', r).style('fill', 'none').style('stroke', 'var(--color-ok)').style('stroke-width', 1.5);
      else dg.append('path').attr('d', `M${x - r},${y - r}L${x + r},${y + r}M${x - r},${y + r}L${x + r},${y - r}`).style('stroke', 'var(--color-bad)').style('stroke-width', 1.4);
    });
  }
  /* Zone labels */
  const lab = svg.append('g').style('pointer-events', 'none').attr('text-anchor', 'middle');
  const fs = Math.max(9, Math.min(13, C.s * 1.3));
  T.z.forEach((r) => {
    if (!r.fga) return;
    const corner = r.id === 5 || r.id === 6;
    const x = C.X(r.lx), y = C.Y(r.ly);
    const t = lab.append('text').attr('x', x).attr('y', y).style('font-size', (corner ? fs * 0.8 : fs) + 'px').style('fill', 'var(--color-fg)').style('font-variant-numeric', 'tabular-nums')
      .style('paint-order', 'stroke').style('stroke', 'var(--color-panel)').style('stroke-width', 3);
    t.append('tspan').attr('x', x).attr('dy', 0).style('font-weight', 600).text(`${r.fgm}/${r.fga}`);
    t.append('tspan').attr('x', x).attr('dy', '1.15em').text(corner ? Math.round(r.pct) + '%' : S.pct(r.pct));
  });
  /* Legend */
  el.append(H.el('p', 'sub', S.mode === 'vol'
    ? 'Darker blue = more of his shots come from there. Numbers are makes/attempts and FG%. Tap a zone for details.'
    : 'Green = 3+ points better than all players in this data from that spot · red = 3+ points worse · grey = about average. Tap a zone for details.'));
  if (S.dots) el.append(H.el('p', 'sub', 'Green circle = made · red × = missed.'));

  /* Table */
  const w = H.el('div', 'tw'), tb = H.el('table', 'shottab');
  const hr = H.el('tr'); ['Zone', 'FGM', 'FGA', 'FG%', 'Share', 'All-player FG%'].forEach((h) => hr.append(H.el('th', null, h)));
  const th = H.el('thead'); th.append(hr); tb.append(th);
  const bd = H.el('tbody');
  T.z.slice().sort((a, b) => b.fga - a.fga).forEach((r) => {
    if (!r.fga) return;
    const a = leagueAvg(r.id), tr = H.el('tr');
    const cls = a == null ? null : r.pct >= a + 3 ? 'good' : r.pct <= a - 3 ? 'bad' : 'mid';
    tr.append(H.el('td', null, r.title), H.el('td', null, String(r.fgm)), H.el('td', null, String(r.fga)), H.el('td', cls, S.pct(r.pct)), H.el('td', null, r.share.toFixed(1) + '%'), H.el('td', 'mid', a == null ? '—' : a.toFixed(1) + '%'));
    bd.append(tr);
  });
  const tr = H.el('tr', 'tot'); const tp = T.fgm / T.fga * 100;
  tr.append(H.el('td', null, 'Total' + (T.back ? ` (${T.back} backcourt heave${T.back === 1 ? "" : "s"} not counted)` : '')), H.el('td', null, String(T.fgm)), H.el('td', null, String(T.fga)), H.el('td', null, S.pct(tp)), H.el('td', null, '100%'), H.el('td', null, ''));
  bd.append(tr); tb.append(bd); w.append(tb); el.append(w);
  const meta = S.data().meta || {};
  el.append(H.el('p', 'sub', `${T.fga} field-goal attempts over ${T.games} game${T.games === 1 ? '' : 's'}. Source: ${meta.source || 'NBA.com shot locations'}${meta.through ? ', through ' + PL.fmtDate(meta.through) : ''}.`));
};

S.redraw = () => ['q_shots', 'pl_shots'].forEach((n) => dash.draw(n));

dash.draw('q_shots', (el) => {
  const A = PL.qPlayer && PL.qPlayer();
  if (!A) { el.replaceChildren(); return; }
  S.render(el, A.team, A.player, null, `${A.player} — shot chart (last 10)`);
});

dash.draw('pl_shots', (el) => {
  if (!PL.team || !PL.sel) { el.replaceChildren(H.el('p', 'sub', 'The shot chart appears once you pick a player.')); return; }
  const g = PL.games(false);
  const dates = PL.opp && g ? new Set(g.map((r) => r.date)) : null;
  S.render(el, PL.team, PL.sel, dates, null);
});
}
