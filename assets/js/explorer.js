/* TCM-Bone-KG — layered, expand-on-demand graph explorer.
   Nodes are arranged in horizontal bands that follow the seven-layer ontology
   (disease → syndrome → phenotype → population → therapy → formula/herb/acupoint → outcome),
   with provenance (texts, dynasties) below and the modern clinical bridge in a column on the right.
   Only a curated core is shown at first; neighbours are added on demand, ranked by TEC. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = () => window.TBK;
  const L = (en, zh) => T().t(en, zh);
  const zh = () => T().lang() === 'zh';

  /* ---------- ontology bands & palette (traditional pigment names) ---------- */
  const BAND_Y = (k) => 60 + k * 96;
  const LAYER = { '中医病名': 0, '证型': 1, '症状体征': 2, '人群': 3, '治法': 4, '方剂': 5, '功效分类': 5.75, '中药': 5.75, '腧穴': 6.5, '经络': 6.5, '外治材料': 6.5, '转归': 7.3, '古籍': 8.3, '朝代': 9.1 };
  const BANDS = [
    [0, 'L1', 'Disease', '古籍病名'], [1, 'L2', 'Syndrome', '证型'], [2, 'L3', 'Phenotype', '症状体征'], [3, 'L4', 'Population', '人群'],
    [4, 'L5', 'Therapy', '治法'], [5, 'L6', 'Formula', '方剂'], [5.75, 'L6', 'Herb', '中药 · 功效'], [6.5, 'L6', 'Acupoint · External', '腧穴 · 经络 · 外治'],
    [7.3, 'L7', 'Outcome', '转归'], [8.3, 'P', 'Classical text', '古籍'], [9.1, 'P', 'Dynasty', '朝代']
  ];
  const CORE_TYPES = new Set(['中医病名', '证型', '症状体征', '人群', '治法', '转归', '现代临床锚点']);
  const COLORS = {
    '中医病名': '#c3272b', '证型': '#d9a832', '症状体征': '#2f5d9e', '人群': '#7b4b7e', '治法': '#3b7a57', '方剂': '#b8622e', '中药': '#6f9a3c',
    '腧穴': '#3f9aa0', '外治材料': '#a58b62', '功效分类': '#8c7a3f', '经络': '#5a6b86', '转归': '#6e6a64', '古籍': '#9c8468', '朝代': '#3a3733', '现代临床锚点': '#fff6ef'
  };
  const PIGMENT = { '中医病名': '朱砂', '证型': '藤黄', '症状体征': '石青', '人群': '紫檀', '治法': '石绿', '方剂': '赭石', '中药': '竹青', '腧穴': '天青', '外治材料': '驼', '功效分类': '秋香', '经络': '黛', '转归': '墨', '古籍': '檀', '朝代': '玄', '现代临床锚点': '胭脂' };
  const ANCHOR_ORDER = ['Osteoporosis', 'Age-related osteoporosis context', 'Postmenopausal osteoporosis context', 'Pregnancy/lactation-associated osteoporosis context',
    'Fragility fracture', 'Vertebral fragility fracture', 'Functional impairment', 'Gait instability / fall risk', 'DXA/BMD assessment', 'T-score', 'Fracture-risk assessment', 'Vertebral fracture assessment'];
  const ANCHOR_SHORT = { 'Osteoporosis': 'Osteoporosis', 'Age-related osteoporosis context': 'Age-related ctx.', 'Postmenopausal osteoporosis context': 'Postmenopausal ctx.', 'Pregnancy/lactation-associated osteoporosis context': 'Pregnancy/lactation ctx.', 'Fragility fracture': 'Fragility fracture', 'Vertebral fragility fracture': 'Vertebral fragility fx.', 'Functional impairment': 'Functional impairment', 'Gait instability / fall risk': 'Gait instability / falls', 'DXA/BMD assessment': 'DXA / BMD', 'T-score': 'T-score', 'Fracture-risk assessment': 'Fracture-risk assess.', 'Vertebral fracture assessment': 'Vertebral fx. assess.' };
  const ANCHOR_ZH_SHORT = { 'Osteoporosis': '骨质疏松症', 'Age-related osteoporosis context': '老年型情境', 'Postmenopausal osteoporosis context': '绝经后情境', 'Pregnancy/lactation-associated osteoporosis context': '妊娠哺乳情境', 'Fragility fracture': '脆性骨折', 'Vertebral fragility fracture': '椎体脆性骨折', 'Functional impairment': '功能受损', 'Gait instability / fall risk': '步态不稳/跌倒', 'DXA/BMD assessment': 'DXA/BMD', 'T-score': 'T 值', 'Fracture-risk assessment': '骨折风险评估', 'Vertebral fracture assessment': '椎体骨折评估' };
  const CORE_X = [80, 1070];      // horizontal span of the classical layers
  const ANCHOR_X = 1270;          // modern bridge column

  /* ---------- state ---------- */
  let G = null, adj = [], visible = new Set(), hiddenTypes = new Set(), selected = null, preset = 'core', frozen = false;
  const filt = { minTec: 0, tiers: new Set(['E1', 'E2', 'E3', 'E4']), structural: true, bridge: true, K: 12, labels: true };
  let svg, viewport, gBands, gLinks, gNodes, sim, zoom, tip, curK = 1;
  let bandPos = {};   // populated band key → y (compacted so empty ontology rows do not waste space)
  function computeBands(nodes) {
    const keys = [...new Set(nodes.filter(n => n.t !== '现代临床锚点').map(n => LAYER[n.t] ?? 5))].sort((a, b) => a - b);
    bandPos = {}; keys.forEach((k, i) => bandPos[k] = BAND_Y(i));
  }

  const stage = $('#stage'), detail = $('#detail'), loading = $('#loading');

  /* ---------- helpers ---------- */
  const radius = (d) => d.t === '现代临床锚点' ? 11 : Math.max(6, Math.min(24, 5 + Math.sqrt(d.d) * 0.75));
  const isCore = (d) => CORE_TYPES.has(d.t);
  const weight = (e) => e[3] == null ? 0 : e[3];
  const tierOf = (e) => e[4] || (e[5] === 'b' ? 'B' : 'S');
  const edgePasses = (e) => {
    if (e[5] === 's') return filt.structural;
    if (e[5] === 'b') return filt.bridge;
    return weight(e) >= filt.minTec && filt.tiers.has(e[4]);
  };
  const nodeLabel = (d) => {
    if (d.t === '现代临床锚点') return zh() ? (ANCHOR_ZH_SHORT[d.n] || d.az || d.n) : (ANCHOR_SHORT[d.n] || d.n);
    return !isCore(d) && d.n.length > 9 ? d.n.slice(0, 8) + '…' : d.n;
  };
  const gloss = (d) => zh() ? (d.t === '现代临床锚点' ? d.n : '') : (T().dict.CONCEPT_EN[d.n] || '');
  const typeLabel = (t) => T().typeLabel(t);
  const relLabel = (r) => T().relLabel(r);

  /* neighbours of node i (by edge index), sorted by weight desc */
  function neighbours(i) {
    return adj[i].map(ei => { const e = G.edges[ei]; const j = e[0] === i ? e[1] : e[0]; return { ei, e, j, out: e[0] === i }; })
      .sort((a, b) => weight(b.e) - weight(a.e) || G.nodes[b.j].d - G.nodes[a.j].d);
  }

  /* ---------- data ---------- */
  fetch('assets/data/kg_graph.json').then(r => r.json()).then(data => {
    G = data;
    G.nodes.forEach((n, i) => { n.i = i; n.r = radius(n); });
    adj = G.nodes.map(() => []);
    G.edges.forEach((e, ei) => { adj[e[0]].push(ei); adj[e[1]].push(ei); });
    G.byName = new Map(G.nodes.map(n => [n.n, n]));
    init();
    loading.hidden = true;
    const q = new URLSearchParams(location.search).get('node');
    const start = new URLSearchParams(location.search).get('view');
    if (q && G.byName.has(q)) { focusNode(G.byName.get(q)); }
    else applyPreset(start && PRESETS[start] ? start : 'core');
  }).catch(err => { loading.innerHTML = '<div style="max-width:420px;text-align:center">' + L('Could not load assets/data/kg_graph.json. Serve the site over HTTP (e.g. <code>python3 -m http.server</code>).', '无法加载 assets/data/kg_graph.json。请通过 HTTP 服务器访问（例如 <code>python3 -m http.server</code>）。') + '</div>'; console.error(err); });

  /* ---------- presets ---------- */
  function topByWeight(i, types, k, relation) {
    return neighbours(i).filter(x => types.includes(G.nodes[x.j].t) && (!relation || x.e[2] === relation)).slice(0, k).map(x => x.j);
  }
  const PRESETS = {
    core: () => G.nodes.filter(isCore).map(n => n.i),
    bridge: () => G.nodes.filter(n => ['中医病名', '证型', '症状体征', '人群', '现代临床锚点'].includes(n.t)).map(n => n.i),
    guwei: () => {
      const gw = G.byName.get('骨痿'); const out = [gw.i];
      G.nodes.filter(n => n.t === '治法' || n.t === '转归').forEach(n => out.push(n.i));
      out.push(...topByWeight(gw.i, ['方剂'], 10), ...topByWeight(gw.i, ['中药'], 12), ...topByWeight(gw.i, ['腧穴'], 6), ...topByWeight(gw.i, ['症状体征'], 8), ...topByWeight(gw.i, ['证型'], 7));
      return out;
    },
    syndrome: () => {
      const out = [];
      G.nodes.filter(n => n.t === '证型').forEach(s => { out.push(s.i); out.push(...topByWeight(s.i, ['方剂'], 4), ...topByWeight(s.i, ['中药'], 5)); });
      G.nodes.filter(n => n.t === '症状体征').forEach(n => out.push(n.i));
      return out;
    },
    provenance: () => {
      const out = G.nodes.filter(n => n.t === '中医病名' || n.t === '朝代').map(n => n.i);
      G.nodes.filter(n => n.t === '古籍').sort((a, b) => b.d - a.d).slice(0, 18).forEach(n => out.push(n.i));
      return out;
    }
  };
  function applyPreset(name) {
    preset = name; selected = null;
    visible = new Set(PRESETS[name]());
    G.nodes.forEach(n => { n.fx = null; n.fy = null; n.px = undefined; delete n.x; delete n.y; n.expanded = false; });
    $$('.xp-preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
    closeDetail(); update(true); setTimeout(fit, 600); setTimeout(fit, 2200);
  }

  /* ---------- svg scaffold ---------- */
  function init() {
    svg = d3.select('#graph');
    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 -4 8 8').attr('refX', 7).attr('refY', 0).attr('markerWidth', 7).attr('markerHeight', 7).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto')
      .append('path').attr('d', 'M0,-3.5L8,0L0,3.5').attr('fill', 'currentColor').attr('opacity', .8);
    defs.append('marker').attr('id', 'arrow-b').attr('viewBox', '0 -4 8 8').attr('refX', 7).attr('refY', 0).attr('markerWidth', 7).attr('markerHeight', 7).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto')
      .append('path').attr('d', 'M0,-3.5L8,0L0,3.5').attr('fill', 'var(--xp-seal)');
    const f = defs.append('filter').attr('id', 'paper').attr('x', 0).attr('y', 0).attr('width', '100%').attr('height', '100%');
    f.append('feTurbulence').attr('type', 'fractalNoise').attr('baseFrequency', '0.9').attr('numOctaves', 2).attr('seed', 7).attr('result', 'n');
    f.append('feColorMatrix').attr('in', 'n').attr('type', 'saturate').attr('values', 0).attr('result', 'g');
    f.append('feComponentTransfer').attr('in', 'g').attr('result', 'p').append('feFuncA').attr('type', 'table').attr('tableValues', '0 0.07');
    f.append('feBlend').attr('in', 'SourceGraphic').attr('in2', 'p').attr('mode', 'multiply');
    const wash = defs.append('radialGradient').attr('id', 'wash').attr('cx', '85%').attr('cy', '15%').attr('r', '55%');
    wash.append('stop').attr('offset', 0).attr('stop-color', 'var(--xp-seal)').attr('stop-opacity', .07);
    wash.append('stop').attr('offset', 1).attr('stop-color', 'var(--xp-seal)').attr('stop-opacity', 0);
    svg.append('rect').attr('class', 'bg').attr('width', '100%').attr('height', '100%').attr('fill', 'var(--xp-paper)').attr('filter', 'url(#paper)');
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#wash)');

    viewport = svg.append('g').attr('class', 'viewport');
    gBands = viewport.append('g').attr('class', 'bands');
    gLinks = viewport.append('g').attr('class', 'links');
    gNodes = viewport.append('g').attr('class', 'nodes');

    zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (ev) => { viewport.attr('transform', ev.transform); curK = ev.transform.k; viewport.classed('zoomed-out', curK < 0.62).classed('zoomed-in', curK >= 1.05); });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', (ev) => { if (ev.target === svg.node() || ev.target.classList.contains('bg')) { selectNode(null); } });

    tip = d3.select('body').append('div').attr('class', 'xp-tip');

    sim = d3.forceSimulation()
      .force('link', d3.forceLink()
        /* distance = the vertical gap between the two bands, so links never fight the rows; they only pull children under parents */
        .distance(d => Math.max(56, Math.hypot(Math.abs(yTarget(d.source) - yTarget(d.target)), d.e[5] === 'b' ? 160 : 40)))
        .strength(d => (isCore(d.source) && isCore(d.target) ? .9 : .35) / Math.min(d.source.lc || 1, d.target.lc || 1)))
      .force('charge', d3.forceManyBody().strength(d => isCore(d) ? -150 : -55).distanceMax(300))
      .force('collide', d3.forceCollide(d => d.r + (isCore(d) ? 18 : 10)).iterations(2))
      .force('y', d3.forceY(d => yTarget(d)).strength(d => isCore(d) ? 1 : .7))
      .force('x', d3.forceX(d => xTarget(d)).strength(d => isCore(d) ? .4 : .3))
      .alphaDecay(.04).velocityDecay(.45)
      .on('tick', tick);

    bindControls();
    document.addEventListener('tbk:lang', () => { renderLegend(); update(false); if (selected) openDetail(selected); });
    window.addEventListener('resize', () => { /* nothing: viewBox-free, zoom handles it */ });
  }

  function yTarget(d) {
    if (d.t === '现代临床锚点') { const k = ANCHOR_ORDER.indexOf(d.n); return BAND_Y(0) + (k < 0 ? 0 : k) * 54; }
    return d.slotY != null ? d.slotY : (bandPos[LAYER[d.t] ?? 5] ?? BAND_Y(LAYER[d.t] ?? 5));
  }
  function xTarget(d) {
    if (d.t === '现代临床锚点') return ANCHOR_X;
    if (d.slotX != null) return d.slotX;
    if (d.px != null) return d.px;
    return (CORE_X[0] + CORE_X[1]) / 2;
  }
  /* assign evenly spaced slots to the core nodes of each band, ordered by degree */
  function assignSlots(nodes) {
    const byBand = {};
    nodes.forEach(n => { n.slotX = null; n.slotY = null; if (n.t !== '现代临床锚点') (byBand[LAYER[n.t]] = byBand[LAYER[n.t]] || []).push(n); });
    Object.entries(byBand).forEach(([band, list]) => {
      const core = isCore(list[0]);
      let ordered;
      if (core) {
        list.sort((a, b) => b.d - a.d);
        // interleave so the hubs sit in the middle: 1st → centre, then alternate left/right
        ordered = []; list.forEach((n, i) => i % 2 ? ordered.push(n) : ordered.unshift(n));
      } else {
        // children sit beneath the node that expanded them; unparented nodes spread by degree
        ordered = list.slice().sort((a, b) => (a.px ?? a.slotSeed ?? 0) - (b.px ?? b.slotSeed ?? 0) || b.d - a.d);
        ordered.forEach((n, i) => { if (n.px == null) n.slotSeed = CORE_X[0] + (CORE_X[1] - CORE_X[0]) * (i + .5) / ordered.length; });
        ordered.sort((a, b) => (a.px ?? a.slotSeed) - (b.px ?? b.slotSeed) || b.d - a.d);
      }
      const spacing = core ? 88 : 66, maxSpan = CORE_X[1] - CORE_X[0];
      const perRow = Math.max(1, Math.floor(maxSpan / spacing));
      const rows = Math.ceil(ordered.length / perRow);
      ordered.forEach((n, i) => {
        const row = Math.floor(i / perRow), col = i % perRow, inRow = Math.min(perRow, ordered.length - row * perRow);
        const span = Math.min(maxSpan, Math.max(0, (inRow - 1) * spacing));
        const x0 = (CORE_X[0] + CORE_X[1]) / 2 - span / 2;
        n.slotX = inRow === 1 ? (CORE_X[0] + CORE_X[1]) / 2 : x0 + span * col / (inRow - 1);
        n.slotY = (bandPos[+band] ?? BAND_Y(+band)) + (rows > 1 ? (row - (rows - 1) / 2) * 38 : 0);
      });
    });
  }

  function drawBands() {
    gBands.selectAll('*').remove();
    BANDS.filter(([k]) => bandPos[k] != null).forEach(([k, code, en, cn]) => {
      const g = gBands.append('g').attr('class', 'xp-band').attr('transform', `translate(0,${bandPos[k]})`);
      g.append('line').attr('x1', CORE_X[0] - 60).attr('x2', CORE_X[1] + 60);
      const t = g.append('text').attr('x', CORE_X[0] - 66).attr('y', -6).attr('text-anchor', 'end');
      t.append('tspan').text(code + '  ');
      t.append('tspan').attr('class', 'cjk').text(zh() ? cn : en.toUpperCase());
    });
    const b = gBands.append('g').attr('class', 'xp-band bridge');
    b.append('rect').attr('x', ANCHOR_X - 112).attr('y', BAND_Y(0) - 64).attr('width', 224).attr('height', 12 * 54 + 56);
    b.append('text').attr('x', ANCHOR_X).attr('y', BAND_Y(0) - 44).attr('text-anchor', 'middle').text(zh() ? 'M · 现代临床桥接层（正交）' : 'M · MODERN CLINICAL BRIDGE (ORTHOGONAL)');
  }

  /* ---------- rendering ---------- */
  function currentNodes() { return G.nodes.filter(n => visible.has(n.i) && !hiddenTypes.has(n.t)); }
  function currentLinks(nodes) {
    const vis = new Set(nodes.map(n => n.i)), out = [], seen = new Set();
    nodes.forEach(n => adj[n.i].forEach(ei => {
      if (seen.has(ei)) return; const e = G.edges[ei];
      if (vis.has(e[0]) && vis.has(e[1]) && edgePasses(e)) { seen.add(ei); out.push({ ei, e, source: G.nodes[e[0]], target: G.nodes[e[1]] }); }
    }));
    return out;
  }

  function update(reheat) {
    const nodes = currentNodes();
    computeBands(nodes); drawBands();
    assignSlots(nodes);
    nodes.forEach(n => { if (n.t === '现代临床锚点') { n.fx = ANCHOR_X; n.fy = yTarget(n); } });
    nodes.forEach(n => { if (n.x == null) { n.x = xTarget(n) + (Math.random() - .5) * 40; n.y = yTarget(n) + (Math.random() - .5) * 30; } });
    const links = currentLinks(nodes);
    nodes.forEach(n => n.lc = 0); links.forEach(l => { l.source.lc++; l.target.lc++; });

    const lg = gLinks.selectAll('g.lk').data(links, d => d.ei);
    lg.exit().remove();
    const le = lg.enter().append('g').attr('class', 'lk');
    le.append('path').attr('class', d => 'xp-link ' + d.e[5]);
    le.append('path').attr('class', 'xp-link-hit')
      .on('mousemove', (ev, d) => showTip(ev, linkTip(d))).on('mouseleave', hideTip);
    gLinks.selectAll('g.lk').select('.xp-link')
      .attr('stroke-width', d => d.e[5] === 'b' ? 1.4 : 0.5 + weight(d.e) * 3.6)
      .attr('stroke-opacity', d => d.e[5] === 's' ? .3 : (d.e[5] === 'b' ? .7 : .07 + weight(d.e) * .9))
      .attr('marker-end', d => d.e[5] === 'b' ? 'url(#arrow-b)' : (weight(d.e) > .2 ? 'url(#arrow)' : null))
      .style('color', 'var(--xp-ink)');

    const ng = gNodes.selectAll('g.xp-node').data(nodes, d => d.i);
    ng.exit().remove();
    const ne = ng.enter().append('g').attr('class', 'xp-node')
      .call(d3.drag().on('start', dragStart).on('drag', dragMove).on('end', dragEnd))
      .on('click', (ev, d) => { ev.stopPropagation(); if (ev.shiftKey) removeNode(d); else selectNode(d); })
      .on('dblclick', (ev, d) => { ev.stopPropagation(); expandNode(d, filt.K); })
      .on('mousemove', (ev, d) => { showTip(ev, nodeTip(d)); highlight(d); }).on('mouseleave', () => { hideTip(); highlight(null); });
    ne.append('circle').attr('class', 'pin').attr('r', 2.2).attr('cy', d => -d.r - 4);
    ne.each(function (d) {
      const g = d3.select(this);
      if (d.t === '现代临床锚点') g.append('path').attr('class', 'shape').attr('d', `M0,${-d.r}L${d.r},0L0,${d.r}L${-d.r},0Z`);
      else { g.append('circle').attr('class', 'ring').attr('r', d.r + 3.5); g.append('circle').attr('class', 'shape').attr('r', d.r); }
      g.append('text').attr('class', 'label').attr('text-anchor', 'middle');
      g.append('text').attr('class', 'gloss').attr('text-anchor', 'middle');
    });
    const all = gNodes.selectAll('g.xp-node');
    all.classed('minor', d => !isCore(d)).classed('expanded', d => d.expanded).classed('selected', d => selected && d.i === selected.i).classed('pinned', d => d.fx != null && d.t !== '现代临床锚点');
    all.select('.shape').attr('fill', d => COLORS[d.t] || '#999').attr('stroke', d => d.t === '现代临床锚点' ? 'var(--xp-seal)' : 'var(--xp-ink)');
    all.select('.ring').style('display', d => isCore(d) ? null : 'none');
    all.select('text.label').text(d => nodeLabel(d)).attr('y', d => d.r + 12).style('font-size', d => (isCore(d) ? Math.min(14, 10 + d.r * .18) : 10.5) + 'px');
    all.select('text.gloss').text(d => isCore(d) ? gloss(d) : '').attr('y', d => d.r + 22);
    viewport.classed('hide-labels', !filt.labels);

    sim.nodes(nodes); sim.force('link').links(links);
    if (!frozen) sim.alpha(reheat ? .9 : .3).restart();
    $('#st-nodes').textContent = nodes.length; $('#st-edges').textContent = links.length;
    $('#st-warn').hidden = nodes.length < 260;
  }

  function tick() {
    gNodes.selectAll('g.xp-node').attr('transform', d => `translate(${d.x},${d.y})`);
    gLinks.selectAll('g.lk').each(function (d) {
      const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len, uy = dy / len;
      const sx = d.source.x + ux * (d.source.r + 2), sy = d.source.y + uy * (d.source.r + 2);
      const tx = d.target.x - ux * (d.target.r + 5), ty = d.target.y - uy * (d.target.r + 5);
      // gentle brush-like curve
      const mx = (sx + tx) / 2 - uy * len * .06, my = (sy + ty) / 2 + ux * len * .06;
      const p = `M${sx},${sy}Q${mx},${my} ${tx},${ty}`;
      d3.select(this).selectAll('path').attr('d', p);
    });
  }

  /* ---------- interactions ---------- */
  function dragStart(ev, d) { if (!ev.active && !frozen) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; }
  function dragMove(ev, d) { d.fx = ev.x; d.fy = ev.y; if (frozen) tick(); }
  function dragEnd(ev, d) { if (!ev.active) sim.alphaTarget(0); d3.select(ev.sourceEvent.target.closest('g.xp-node')).classed('pinned', true); }

  function highlight(d) {
    const nodesSel = gNodes.selectAll('g.xp-node'), linksSel = gLinks.selectAll('.xp-link');
    if (!d) { nodesSel.classed('dim', false); linksSel.classed('dim', false).classed('hi', false); return; }
    const nb = new Set([d.i]); adj[d.i].forEach(ei => { const e = G.edges[ei]; nb.add(e[0]); nb.add(e[1]); });
    nodesSel.classed('dim', n => !nb.has(n.i));
    linksSel.classed('dim', l => l.e[0] !== d.i && l.e[1] !== d.i).classed('hi', l => l.e[0] === d.i || l.e[1] === d.i);
  }
  function selectNode(d) {
    selected = d;
    gNodes.selectAll('g.xp-node').classed('selected', n => d && n.i === d.i);
    if (d) openDetail(d); else closeDetail();
  }
  function expandNode(d, k, types, relation) {
    const cand = neighbours(d.i).filter(x => !visible.has(x.j) && edgePasses(x.e) && (!types || types.includes(G.nodes[x.j].t)) && (!relation || x.e[2] === relation)).slice(0, k);
    cand.forEach(x => { const n = G.nodes[x.j]; visible.add(n.i); n.px = d.x; n.x = d.x + (Math.random() - .5) * 60; n.y = yTarget(n) + (Math.random() - .5) * 20; });
    d.expanded = true;
    update(true);
    if (selected && selected.i === d.i) openDetail(d);
    return cand.length;
  }
  function removeNode(d) {
    visible.delete(d.i); d.expanded = false;
    if (selected && selected.i === d.i) selectNode(null);
    update(false);
  }
  function focusNode(n) {
    if (!visible.has(n.i)) { visible.add(n.i); n.x = xTarget(n); n.y = yTarget(n); expandNode(n, filt.K); }
    update(true); selectNode(n);
    setTimeout(() => centerOn(n), 500);
  }
  function centerOn(n) {
    const w = stage.clientWidth, h = stage.clientHeight, k = Math.max(curK, 1);
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - n.x * k, h / 2 - n.y * k).scale(k));
  }
  function fit() {
    const nodes = currentNodes(); if (!nodes.length) return;
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const hasClassical = nodes.some(n => n.t !== '现代临床锚点');
    const x0 = Math.min(Math.min(...xs) - 80, hasClassical ? CORE_X[0] - 175 : Infinity), x1 = Math.max(...xs) + 90, y0 = Math.min(...ys) - 70, y1 = Math.max(...ys) + 60;
    const w = stage.clientWidth, h = stage.clientHeight;
    const k = Math.min(3, .95 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - k * (x0 + x1) / 2, h / 2 - k * (y0 + y1) / 2).scale(k));
  }

  /* ---------- tooltips ---------- */
  function showTip(ev, html) { tip.html(html).classed('show', true).style('left', Math.min(innerWidth - 300, ev.clientX + 14) + 'px').style('top', (ev.clientY + 14) + 'px'); }
  function hideTip() { tip.classed('show', false); }
  function nodeTip(d) {
    const g = gloss(d);
    return `<b>${esc(d.n)}</b>${g ? ` <span style="opacity:.8">${esc(g)}</span>` : ''}<br><span class="mono">${esc(typeLabel(d.t))} · ${L('degree', '度')} ${d.d}${d.p ? ` · ${L('passages', '条目')} ${d.p}` : ''}${d.dy ? ` · ${esc(T().dynLabel(d.dy))}${d.y ? ' ' + d.y : ''}` : ''}</span><br><span class="mono" style="opacity:.7">${L('click: details · double-click: expand · shift-click: remove', '单击：详情 · 双击：展开 · Shift+单击：移除')}</span>`;
  }
  function linkTip(l) {
    const e = l.e;
    return `<b>${esc(l.source.n)}</b> → <b>${esc(l.target.n)}</b><br><span class="mono">${esc(relLabel(e[2]))}${zh() || relLabel(e[2]) === e[2] ? '' : ' · ' + esc(e[2])}</span><br><span class="mono">${e[5] === 'b' ? 'CMS ' + (e[3] ?? '—') : (e[5] === 's' ? L('structural edge · no TEC', '结构性边 · 无 TEC') : 'TEC ' + e[3] + ' · ' + e[4])}</span>`;
  }

  /* ---------- detail drawer ---------- */
  function openDetail(d) {
    const groups = {};
    neighbours(d.i).forEach(x => { const key = (x.out ? '→' : '←') + x.e[2]; (groups[key] = groups[key] || { rel: x.e[2], out: x.out, items: [] }).items.push(x); });
    const gl = Object.values(groups).sort((a, b) => b.items.length - a.items.length);
    const g = gloss(d);
    let html = `<button type="button" class="close" aria-label="Close">×</button>
      <h2>${esc(d.n)}</h2>
      <div class="gloss">${g ? esc(g) + ' · ' : ''}<span class="tag indigo" style="font-size:.7rem">${esc(typeLabel(d.t))}</span> <span style="font-family:var(--serif-cjk);color:var(--ink-3)">${PIGMENT[d.t] || ''}</span></div>
      <div class="kv">
        <div><div class="k">${L('Degree', '度')}</div><div class="v">${d.d}</div></div>
        <div><div class="k">${L('Betweenness', '介数')}</div><div class="v">${d.b.toFixed(3)}</div></div>
        ${d.p ? `<div><div class="k">${L('Passages', '支持条目')}</div><div class="v">${d.p}</div></div>` : ''}
        ${d.dy ? `<div><div class="k">${L('Dynasty', '朝代')}</div><div class="v">${esc(T().dynLabel(d.dy))}${d.y ? ' · ' + d.y : ''}</div></div>` : ''}
        ${d.dc ? `<div><div class="k">${L('Category', '功效分类')}</div><div class="v">${esc(d.dc)}</div></div>` : ''}
        ${d.me ? `<div><div class="k">${L('Meridian', '归经')}</div><div class="v">${esc(d.me)}</div></div>` : ''}
        ${d.ac ? `<div><div class="k">${L('Anchor category', '锚点类别')}</div><div class="v">${esc(d.ac)}</div></div>` : ''}
      </div>
      <div class="xp-btns">
        <button type="button" class="xp-btn primary" data-act="expand">${L(`Expand top ${filt.K}`, `展开前 ${filt.K} 个邻居`)}</button>
        <button type="button" class="xp-btn" data-act="unpin">${L('Unpin', '解除固定')}</button>
        <button type="button" class="xp-btn danger" data-act="remove">${L('Remove', '移除')}</button>
        <a class="xp-btn" href="browse.html?node=${encodeURIComponent(d.id)}">${L('All edges ↗', '全部关系 ↗')}</a>
      </div>
      <h4>${L('Neighbours by relation', '按关系分组的邻居')} · ${adj[d.i].length}</h4>`;
    gl.forEach((grp, gi) => {
      const vis = grp.items.filter(x => visible.has(x.j)).length;
      const top = grp.items.slice(0, 6);
      html += `<div class="xp-group"><div class="gh"><span class="rel">${grp.out ? '→' : '←'} ${esc(relLabel(grp.rel))}${zh() || relLabel(grp.rel) === grp.rel ? '' : `<small>${esc(grp.rel)}</small>`}</span><span class="cnt">${vis}/${grp.items.length}</span>${vis < grp.items.length ? `<button type="button" class="add" data-grp="${gi}">+ ${Math.min(filt.K, grp.items.length - vis)}</button>` : ''}</div>
        <div class="xp-chips">${top.map(x => `<span class="xp-chip${visible.has(x.j) ? ' on' : ''}" data-j="${x.j}">${esc(G.nodes[x.j].n)}<small>${x.e[3] != null ? x.e[3].toFixed(2) : '·'}</small></span>`).join('')}${grp.items.length > 6 ? `<span class="xp-chip" style="opacity:.6">… +${grp.items.length - 6}</span>` : ''}</div></div>`;
    });
    detail.innerHTML = html; detail.classList.add('open');
    $('.close', detail).onclick = () => selectNode(null);
    detail.querySelector('[data-act="expand"]').onclick = () => expandNode(d, filt.K);
    detail.querySelector('[data-act="remove"]').onclick = () => removeNode(d);
    detail.querySelector('[data-act="unpin"]').onclick = () => { d.fx = null; d.fy = null; update(false); };
    $$('.add', detail).forEach(b => b.onclick = () => { const grp = gl[+b.dataset.grp]; expandNode(d, filt.K, null, grp.rel); });
    $$('.xp-chip[data-j]', detail).forEach(c => c.onclick = () => { const n = G.nodes[+c.dataset.j]; if (visible.has(n.i)) { selectNode(n); centerOn(n); } else { visible.add(n.i); n.px = d.x; n.x = d.x + (Math.random() - .5) * 60; n.y = yTarget(n); update(true); openDetail(d); } });
  }
  function closeDetail() { detail.classList.remove('open'); }

  /* ---------- controls ---------- */
  function bindControls() {
    // presets
    $$('.xp-preset').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
    // search
    const q = $('#q'), sug = $('#suggest'); let sugIdx = -1;
    const render = () => {
      const v = q.value.trim().toLowerCase(); if (!v) { sug.classList.remove('open'); return; }
      const res = G.nodes.filter(n => n.n.toLowerCase().includes(v) || (n.az || '').includes(v)).sort((a, b) => b.d - a.d).slice(0, 12);
      sug.innerHTML = res.map((n, i) => `<button type="button" data-i="${n.i}" class="${i === sugIdx ? 'active' : ''}"><span class="nm">${esc(n.n)}</span><small>${esc(typeLabel(n.t))} · ${n.d}</small></button>`).join('');
      sug.classList.toggle('open', res.length > 0);
      $$('button', sug).forEach(b => b.onclick = () => { focusNode(G.nodes[+b.dataset.i]); q.value = ''; sug.classList.remove('open'); });
    };
    q.addEventListener('input', () => { sugIdx = -1; render(); });
    q.addEventListener('keydown', ev => {
      const items = $$('button', sug);
      if (ev.key === 'ArrowDown') { sugIdx = Math.min(items.length - 1, sugIdx + 1); render(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { sugIdx = Math.max(0, sugIdx - 1); render(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { const b = items[sugIdx >= 0 ? sugIdx : 0]; if (b) b.click(); }
      else if (ev.key === 'Escape') sug.classList.remove('open');
    });
    document.addEventListener('click', ev => { if (!ev.target.closest('.xp-search')) sug.classList.remove('open'); });
    // filters
    const tec = $('#f-tec'); tec.addEventListener('input', () => { filt.minTec = +tec.value; $('#f-tec-out').value = filt.minTec.toFixed(2); update(false); });
    $$('.tier-check input').forEach(c => c.addEventListener('change', () => { c.checked ? filt.tiers.add(c.value) : filt.tiers.delete(c.value); update(false); }));
    $('#f-structural').addEventListener('change', ev => { filt.structural = ev.target.checked; update(false); });
    $('#f-bridge').addEventListener('change', ev => { filt.bridge = ev.target.checked; update(false); });
    $('#f-k').addEventListener('change', ev => { filt.K = +ev.target.value; if (selected) openDetail(selected); });
    $('#f-labels').addEventListener('change', ev => { filt.labels = ev.target.checked; viewport.classed('hide-labels', !filt.labels); });
    // buttons
    $('#b-fit').addEventListener('click', fit);
    $('#b-freeze').addEventListener('click', ev => { frozen = !frozen; ev.currentTarget.setAttribute('aria-pressed', String(frozen)); frozen ? sim.stop() : sim.alpha(.3).restart(); });
    $('#b-expand-all').addEventListener('click', () => { currentNodes().filter(isCore).forEach(n => { if (n.t !== '现代临床锚点') expandNode(n, Math.max(2, Math.round(filt.K / 3))); }); });
    $('#b-collapse').addEventListener('click', () => { G.nodes.forEach(n => { if (!isCore(n)) visible.delete(n.i); n.expanded = false; }); update(true); });
    $('#z-in').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.4));
    $('#z-out').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.4));
    $('#z-fit').addEventListener('click', fit);
    renderLegend();
  }
  function renderLegend() {
    const counts = {}; G.nodes.forEach(n => counts[n.t] = (counts[n.t] || 0) + 1);
    const order = Object.keys(LAYER).concat(['现代临床锚点']);
    $('#legend').innerHTML = order.map(t => `<button type="button" data-t="${t}" aria-pressed="${!hiddenTypes.has(t)}"><i class="${t === '现代临床锚点' ? 'diamond' : ''}" style="background:${COLORS[t]}"></i><span>${esc(typeLabel(t))} <span style="font-family:var(--serif-cjk);color:var(--ink-3)">${PIGMENT[t]}</span></span><small>${counts[t] || 0}</small></button>`).join('');
    $$('#legend button').forEach(b => b.addEventListener('click', () => { const t = b.dataset.t; hiddenTypes.has(t) ? hiddenTypes.delete(t) : hiddenTypes.add(t); b.setAttribute('aria-pressed', String(!hiddenTypes.has(t))); update(false); }));
  }
})();
