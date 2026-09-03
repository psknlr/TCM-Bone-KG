/* TCM-Bone-KG — node browser. Loads data/kg_nodes.csv eagerly and data/kg_edges.csv lazily on first selection. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = () => window.TBK;

  /* minimal RFC-4180 CSV parser (handles quoted fields with commas / newlines) */
  function parseCSV(text) {
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift();
    return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }

  let nodes = [], edges = null, edgesLoading = null, byId = {}, activeType = '', activeId = null;
  const listEl = $('#node-list'), detailEl = $('#detail'), chipsEl = $('#type-chips'), countEl = $('#count'), qEl = $('#q');

  fetch('data/kg_nodes.csv').then(r => r.text()).then(t => {
    nodes = parseCSV(t).map(n => ({ ...n, degree: +n.degree || 0, betweenness: +n.betweenness || 0 }));
    nodes.sort((a, b) => b.degree - a.degree);
    nodes.forEach(n => byId[n.node_id] = n);
    renderChips(); renderList();
    const pre = new URLSearchParams(location.search).get('node');
    if (pre && byId[pre]) select(pre);
  }).catch(() => { listEl.innerHTML = `<div class="empty">${T().t('Could not load data/kg_nodes.csv. If you opened this page from disk, serve it over HTTP instead.', '无法加载 data/kg_nodes.csv。若从本地磁盘打开，请改用 HTTP 服务器访问。')}</div>`; });

  function renderChips() {
    const counts = {};
    nodes.forEach(n => counts[n.type] = (counts[n.type] || 0) + 1);
    const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    chipsEl.innerHTML = `<button type="button" class="chip" data-type="" aria-pressed="${activeType === ''}">${T().t('All', '全部')}<small>${nodes.length}</small></button>` +
      types.map(t => `<button type="button" class="chip" data-type="${esc(t)}" aria-pressed="${activeType === t}">${esc(T().typeLabel(t))}<small>${counts[t]}</small></button>`).join('');
    chipsEl.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { activeType = b.dataset.type; renderChips(); renderList(); }));
  }

  function renderList() {
    const q = (qEl.value || '').trim().toLowerCase();
    const res = nodes.filter(n => (!activeType || n.type === activeType) && (!q || n.name.toLowerCase().includes(q) || n.node_id.toLowerCase().includes(q)));
    countEl.textContent = T().t(`${res.length.toLocaleString()} nodes · sorted by degree`, `共 ${res.length.toLocaleString()} 个节点 · 按度数排序`);
    const show = res.slice(0, 300);
    listEl.innerHTML = show.map(n =>
      `<button type="button" class="node-item" data-id="${esc(n.node_id)}" aria-current="${n.node_id === activeId}"><span><span class="t">${esc(T().typeLabel(n.type))}</span><span class="nm">${esc(n.name)}</span></span><span class="dg">${n.degree}</span></button>`
    ).join('') + (res.length > show.length ? `<div class="empty" style="padding:.8rem">${T().t(`… ${res.length - show.length} more, refine your search`, `… 还有 ${res.length - show.length} 个，请缩小检索范围`)}</div>` : '') +
      (res.length === 0 ? `<div class="empty">${T().t('No matching node.', '没有匹配的节点。')}</div>` : '');
    listEl.querySelectorAll('.node-item').forEach(b => b.addEventListener('click', () => select(b.dataset.id)));
  }
  qEl.addEventListener('input', renderList);

  function loadEdges() {
    if (edges) return Promise.resolve(edges);
    if (!edgesLoading) edgesLoading = fetch('data/kg_edges.csv').then(r => r.text()).then(t => { edges = parseCSV(t); return edges; });
    return edgesLoading;
  }

  function select(id) {
    activeId = id;
    listEl.querySelectorAll('.node-item').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === id)));
    const n = byId[id]; if (!n) return;
    safeReplaceState(id);
    renderDetail(n, null);
    loadEdges().then(E => { if (activeId === id) renderDetail(n, E); });
  }
  function safeReplaceState(id) { try { const u = new URL(location.href); u.searchParams.set('node', id); history.replaceState(null, '', u); } catch (e) { } }

  const tierClass = (e) => e.evidence_tier ? e.evidence_tier : (e.edge_class === 'bridge_score' ? 'B' : 'S');
  const tierText = (e) => e.evidence_tier ? e.evidence_tier : (e.edge_class === 'bridge_score' ? 'CMS' : T().t('struct.', '结构'));

  function renderDetail(n, E) {
    const zh = T().lang() === 'zh';
    const D = T().dict;
    const gloss = zh ? '' : (D.CONCEPT_EN[n.name] ? `<span style="color:var(--ink-3);font-family:var(--sans);font-size:1rem">${esc(D.CONCEPT_EN[n.name])}</span>` : '');
    let html = `<div class="detail-head"><h2>${esc(n.name)}</h2>${gloss}<span class="tag indigo">${esc(T().typeLabel(n.type))}</span></div>
      <div class="kv">
        <div><div class="k">${zh ? '度' : 'Degree'}</div><div class="v">${n.degree}</div></div>
        <div><div class="k">${zh ? '加权度' : 'Weighted degree'}</div><div class="v">${(+n.weighted_degree || 0).toFixed(2)}</div></div>
        <div><div class="k">${zh ? '介数中心性' : 'Betweenness'}</div><div class="v">${n.betweenness.toFixed(4)}</div></div>
        <div><div class="k">${zh ? '支持条目' : 'Passages'}</div><div class="v">${n.n_passages ? Math.round(+n.n_passages) : '—'}</div></div>
        ${n.community ? `<div><div class="k">${zh ? '社区' : 'Community'}</div><div class="v">${esc(n.community)}</div></div>` : ''}
        ${n.dynasty ? `<div><div class="k">${zh ? '朝代' : 'Dynasty'}</div><div class="v">${esc(T().dynLabel(n.dynasty))}${n.year ? ' · ' + parseInt(n.year, 10) : ''}</div></div>` : ''}
        ${n.drug_category ? `<div><div class="k">${zh ? '功效分类' : 'Herb category'}</div><div class="v">${esc(n.drug_category)}</div></div>` : ''}
        ${n.meridian ? `<div><div class="k">${zh ? '归经' : 'Meridian'}</div><div class="v">${esc(n.meridian)}</div></div>` : ''}
        ${n.anchor_category ? `<div><div class="k">${zh ? '锚点类别' : 'Anchor category'}</div><div class="v">${esc(n.anchor_category)}</div></div>` : ''}
        ${n.anchor_name_zh ? `<div><div class="k">${zh ? '中文名' : 'Chinese label'}</div><div class="v">${esc(n.anchor_name_zh)}</div></div>` : ''}
        ${n.source ? `<div><div class="k">${zh ? '来源' : 'Source'}</div><div class="v">${esc(n.source)}</div></div>` : ''}
      </div>
      <div style="font-size:.78rem;color:var(--ink-3);margin-bottom:.8rem"><code>${esc(n.node_id)}</code></div>`;

    if (!E) {
      html += `<div class="empty"><span class="loading"></span>${zh ? '正在加载 10,434 条关系边（约 2 MB，仅首次）…' : 'Loading 10,434 edges (≈2 MB, first time only)…'}</div>`;
      detailEl.innerHTML = html; return;
    }
    const out = E.filter(e => e.source_id === n.node_id), inn = E.filter(e => e.target_id === n.node_id);
    const rows = [...out.map(e => ({ e, dir: 'out' })), ...inn.map(e => ({ e, dir: 'in' }))]
      .sort((a, b) => (+b.e.TEC_t || (b.e.edge_class === 'structural' ? -1 : 0)) - (+a.e.TEC_t || (a.e.edge_class === 'structural' ? -1 : 0)));

    html += `<h3 style="font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:.6rem">${zh ? `关系边 · ${rows.length} 条（出边 ${out.length} · 入边 ${inn.length}）` : `Edges · ${rows.length} (${out.length} out · ${inn.length} in)`}</h3>`;
    if (!rows.length) { html += `<div class="empty">${zh ? '没有关系边。' : 'No edges.'}</div>`; detailEl.innerHTML = html; return; }
    html += `<div class="table-wrap" style="box-shadow:none"><table class="edge-table"><thead><tr><th></th><th>${zh ? '关系' : 'Relation'}</th><th>${zh ? '邻居节点' : 'Neighbour'}</th><th>TEC</th><th>${zh ? '等级' : 'Tier'}</th><th style="text-transform:none">n<sub>t</sub> / b<sub>t</sub></th></tr></thead><tbody>` +
      rows.slice(0, 400).map(({ e, dir }) => {
        const other = dir === 'out' ? { id: e.target_id, name: e.target, type: e.target_type } : { id: e.source_id, name: e.source, type: e.source_type };
        const tec = e.TEC_t ? (+e.TEC_t).toFixed(3) : (e.mapping_score ? `CMS ${(+e.mapping_score).toFixed(3)}` : '—');
        return `<tr><td style="color:var(--ink-3)">${dir === 'out' ? '→' : '←'}</td><td><span class="rel">${esc(T().relLabel(e.relation))}</span>${!zh && e.relation !== T().relLabel(e.relation) ? `<br><small style="color:var(--ink-3)">${esc(e.relation)}</small>` : ''}</td>
          <td><a href="?node=${encodeURIComponent(other.id)}" data-id="${esc(other.id)}" class="nb"><span style="font-family:var(--serif-cjk);font-size:1rem">${esc(other.name)}</span></a><br><small style="color:var(--ink-3)">${esc(T().typeLabel(other.type))}</small></td>
          <td class="v">${tec}</td><td><span class="tier ${tierClass(e)}">${tierText(e)}</span></td>
          <td style="font-family:var(--mono);font-size:.78rem;color:var(--ink-3)">${e.n_t ? Math.round(+e.n_t) : '—'} / ${e.b_t ? Math.round(+e.b_t) : '—'}</td></tr>`;
      }).join('') + '</tbody></table></div>' + (rows.length > 400 ? `<div class="empty">${zh ? `仅显示前 400 条，共 ${rows.length} 条。` : `Showing first 400 of ${rows.length}.`}</div>` : '');
    detailEl.innerHTML = html;
    detailEl.querySelectorAll('a.nb').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); select(a.dataset.id); detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  }

  document.addEventListener('tbk:lang', () => { if (nodes.length) { renderChips(); renderList(); } if (activeId && byId[activeId]) renderDetail(byId[activeId], edges); });
})();
