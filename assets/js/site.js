/* TCM-Bone-KG — site behaviour: language, theme, navigation, charts.
   No external dependencies. Works on GitHub Pages and from file://. */
(function () {
  'use strict';

  const root = document.documentElement;

  /* ---------- helpers ---------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };

  /* ---------- language ---------- */
  const LANGS = ['en', 'zh'];
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    const stored = safe(() => localStorage.getItem('tbk-lang'));
    if (LANGS.includes(stored)) return stored;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }
  function applyLang(lang, persist) {
    root.setAttribute('lang', lang === 'zh' ? 'zh' : 'en');
    if (persist) safe(() => localStorage.setItem('tbk-lang', lang));
    $$('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    // attribute-level translations (placeholder / title / aria-label)
    $$('[data-en-placeholder]').forEach(el => el.placeholder = el.dataset[lang + 'Placeholder'] || '');
    $$('[data-en-title]').forEach(el => el.title = el.dataset[lang + 'Title'] || '');
    const t = $('title');
    if (t && t.dataset[lang]) t.textContent = t.dataset[lang];
    document.dispatchEvent(new CustomEvent('tbk:lang', { detail: { lang } }));
  }
  window.TBK = window.TBK || {};
  window.TBK.lang = () => root.getAttribute('lang') === 'zh' ? 'zh' : 'en';
  window.TBK.t = (en, zh) => (window.TBK.lang() === 'zh' ? zh : en);

  /* ---------- theme ---------- */
  function detectTheme() {
    const stored = safe(() => localStorage.getItem('tbk-theme'));
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) safe(() => localStorage.setItem('tbk-theme', theme));
    $$('.theme-btn').forEach(b => b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'));
  }

  applyLang(detectLang(), false);
  applyTheme(detectTheme(), false);

  document.addEventListener('DOMContentLoaded', () => {
    $$('.lang-switch button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang, true)));
    $$('.theme-btn').forEach(b => b.addEventListener('click', () => applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true)));
    applyLang(window.TBK.lang(), false); // sync buttons after DOM is ready

    /* mobile menu */
    const mb = $('.menu-btn'), links = $('.nav-links');
    if (mb && links) {
      mb.addEventListener('click', () => { const o = links.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });
      links.addEventListener('click', e => { if (e.target.tagName === 'A') links.classList.remove('open'); });
    }

    /* active section highlight */
    const secs = $$('section[id]');
    const navA = $$('.nav-links a[href^="#"]');
    if (secs.length && navA.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) navA.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      secs.forEach(s => io.observe(s));
    }

    /* reveal on scroll */
    const rv = $$('.reveal');
    if (rv.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const io2 = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io2.unobserve(en.target); } }), { threshold: 0.02, rootMargin: '0px 0px -4% 0px' });
      rv.forEach(el => io2.observe(el));
      // safety net: never leave content hidden (print, odd scroll containers, very tall pages)
      addEventListener('beforeprint', () => rv.forEach(el => el.classList.add('in')));
      setTimeout(() => rv.forEach(el => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('in'); }), 1200);
    } else rv.forEach(el => el.classList.add('in'));

    /* back to top */
    const tt = $('.to-top');
    if (tt) {
      addEventListener('scroll', () => tt.classList.toggle('show', scrollY > 600), { passive: true });
      tt.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /* charts (index only) */
    if (window.KG_DATA && $('#chart-node-types')) {
      renderCharts();
      document.addEventListener('tbk:lang', renderCharts);
    }
  });

  /* ---------- bilingual dictionaries for data labels ---------- */
  const TYPE_EN = {
    '古籍': 'Classical text', '方剂': 'Formula', '中药': 'Herb', '腧穴': 'Acupoint', '外治材料': 'External agent',
    '经络': 'Meridian', '功效分类': 'Herb category', '现代临床锚点': 'Modern clinical anchor', '中医病名': 'TCM disease',
    '朝代': 'Dynasty', '症状体征': 'Symptom / sign', '证型': 'Syndrome pattern', '人群': 'Population', '治法': 'Therapy', '转归': 'Outcome'
  };
  const REL_EN = {
    '载有': 'cites (text→herb/formula)', '用方': 'uses formula', '用药': 'uses herb', '记载': 'records (text→disease)', '配伍': 'co-prescribed with',
    '可取穴': 'may use acupoint', '取穴': 'selects acupoint', '属于朝代': 'belongs to dynasty', '功效归类': 'herb category', '外用': 'external application',
    '归经': 'meridian of', '包含药物': 'contains herb', '加减化裁': 'modified from', '含药': 'composed of', '治以': 'treated by method',
    '辨为': 'diagnosed as syndrome', '表现为': 'presents as symptom', '转归为': 'outcome is', '主要症状': 'chief complaint',
    'population_context_corresponds_to': 'population-context bridge', '易患': 'predisposes to', '多见证型': 'commonly shows syndrome',
    'phenotypically_corresponds_to': 'phenotype bridge', 'maps_to_clinical_finding': 'maps to clinical finding',
    'requires_modern_confirmation_by': 'requires modern confirmation', 'risk_assessed_by': 'risk assessed by'
  };
  const REL_ZH = {
    'population_context_corresponds_to': '人群情境对应', 'phenotypically_corresponds_to': '表型对应', 'maps_to_clinical_finding': '映射至临床发现',
    'requires_modern_confirmation_by': '需现代确诊', 'risk_assessed_by': '风险评估'
  };
  const DYN_EN = {
    '秦汉': 'Qin–Han', '魏晋南北朝': 'Wei–Jin & N–S', '隋唐五代': 'Sui–Tang–Five Dyn.', '宋': 'Song', '金元': 'Jin–Yuan', '明': 'Ming',
    '清': 'Qing', '民国': 'Republican', '现代': 'Modern', '未知': 'Unknown'
  };
  const DYN_ORDER = ['秦汉', '魏晋南北朝', '隋唐五代', '宋', '金元', '明', '清', '民国', '现代', '未知'];
  const CONCEPT_EN = {
    '骨痿': 'gu wei · bone wilting', '骨枯': 'gu ku · bone desiccation', '骨痹': 'gu bi · bone impediment', '骨空': 'gu kong · bone hollowness',
    '骨极': 'gu ji · bone exhaustion', '骨虚': 'gu xu · bone deficiency', '骨折': 'gu zhe · fracture', '骨蚀': 'gu shi · bone erosion',
    '骨断': 'gu duan · bone breakage', '骨缩': 'gu suo · bone shrinkage', '骨疏': 'gu shu · bone rarefaction',
    '肝肾阴虚证': 'liver–kidney yin deficiency', '肾阳虚证': 'kidney yang deficiency', '肾虚血瘀证': 'kidney deficiency + blood stasis',
    '脾胃虚弱证': 'spleen–stomach weakness', '脾肾阳虚证': 'spleen–kidney yang deficiency', '血瘀气滞证': 'blood stasis + qi stagnation',
    '风寒湿痹证': 'wind-cold-damp bi', '中药内服': 'oral herbal medicine', '中药外用': 'topical herbal therapy', '针刺': 'acupuncture', '艾灸': 'moxibustion',
    '活动受限': 'functional limitation', '骨痛': 'bone pain', '腰背痛': 'low-back pain', '步态不稳': 'gait instability', '乏力': 'fatigue',
    '驼背': 'kyphosis', '身高变矮': 'height loss', '清': 'Qing dynasty'
  };
  const ANCHOR_ZH = {
    'Osteoporosis': '骨质疏松症', 'Age-related osteoporosis context': '老年型情境', 'Postmenopausal osteoporosis context': '绝经后情境',
    'Pregnancy/lactation-associated osteoporosis context': '妊娠-哺乳情境', 'Fragility fracture': '脆性骨折', 'Vertebral fragility fracture': '椎体脆性骨折',
    'Functional impairment': '功能受损', 'Gait instability / fall risk': '步态不稳/跌倒风险', 'DXA/BMD assessment': 'DXA/BMD 评估',
    'T-score': 'T 值', 'Fracture-risk assessment': '骨折风险评估', 'Vertebral fracture assessment': '椎体骨折评估'
  };
  const ANCHOR_SHORT_EN = {
    'Osteoporosis': 'Osteoporosis', 'Age-related osteoporosis context': 'Age-related ctx.', 'Postmenopausal osteoporosis context': 'Postmenopausal ctx.',
    'Pregnancy/lactation-associated osteoporosis context': 'Pregnancy / lactation ctx.', 'Fragility fracture': 'Fragility fracture',
    'Vertebral fragility fracture': 'Vertebral fragility fx.', 'Functional impairment': 'Functional impairment', 'Gait instability / fall risk': 'Gait instability / falls'
  };
  window.TBK.dict = { TYPE_EN, REL_EN, REL_ZH, DYN_EN, CONCEPT_EN, ANCHOR_ZH };

  const typeLabel = (t) => window.TBK.lang() === 'zh' ? t : (TYPE_EN[t] || t);
  const relLabel = (r) => window.TBK.lang() === 'zh' ? (REL_ZH[r] || r) : (REL_EN[r] || r);
  const dynLabel = (d) => window.TBK.lang() === 'zh' ? d : (DYN_EN[d] || d);
  window.TBK.typeLabel = typeLabel; window.TBK.relLabel = relLabel; window.TBK.dynLabel = dynLabel;

  /* ---------- charts ---------- */
  function bars(el, rows, color) {
    const max = Math.max(...rows.map(r => r[1]));
    el.innerHTML = rows.map(([l, v]) =>
      `<div class="bar-row"><span class="lbl" title="${l}">${l}</span><span class="trk"><span class="fill" style="width:0%;background:${color || 'var(--indigo)'}"></span></span><span class="val">${fmt(v)}</span></div>`
    ).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.fill', el).forEach((f, i) => f.style.width = (rows[i][1] / max * 100).toFixed(1) + '%');
    }));
  }

  function renderCharts() {
    const D = window.KG_DATA;
    const zh = window.TBK.lang() === 'zh';

    bars($('#chart-node-types'), D.nodeTypes.map(([t, n]) => [typeLabel(t), n]));
    bars($('#chart-relations'), D.relations.slice(0, 12).map(([r, n]) => [relLabel(r), n]), 'var(--cinnabar)');

    /* evidence tiers stacked bar */
    const tiers = D.tiers, total = tiers.E1 + tiers.E2 + tiers.E3 + tiers.E4;
    const tierCols = { E1: 'var(--paper-3)', E2: 'var(--gold)', E3: 'var(--sage)', E4: 'var(--indigo)' };
    const tierTxt = {
      E1: zh ? '单条目 · 单书' : 'single passage · single book', E2: zh ? '多条目 · 单书' : 'multi-passage · single book',
      E3: zh ? '多书 · 单朝代' : 'multi-book · single dynasty', E4: zh ? '多书 · 多朝代（骨干）' : 'multi-book · multi-dynasty (backbone)'
    };
    const st = $('#chart-tiers');
    if (st) {
      st.innerHTML = '<div class="stack">' + ['E1', 'E2', 'E3', 'E4'].map(k => `<span style="width:${(tiers[k] / total * 100).toFixed(1)}%;background:${tierCols[k]}" title="${k}: ${fmt(tiers[k])}"></span>`).join('') + '</div>' +
        '<div class="legend">' + ['E1', 'E2', 'E3', 'E4'].map(k => `<span><i style="background:${tierCols[k]}"></i><b>${k}</b> ${(tiers[k] / total * 100).toFixed(1)}% · ${tierTxt[k]}</span>`).join('') + '</div>';
    }

    /* edge classes */
    const ec = $('#chart-classes');
    if (ec) {
      const C = D.edgeClass, tot = C.evidence + C.structural + C.bridge_score;
      const cols = { evidence: 'var(--indigo)', structural: 'var(--gold)', bridge_score: 'var(--cinnabar)' };
      const txt = { evidence: zh ? '证据类 · 计算 TEC' : 'evidence · TEC computed', structural: zh ? '结构类 · 定义性' : 'structural · definitional', bridge_score: zh ? '桥接评分类 · CMS' : 'bridge-score · CMS' };
      ec.innerHTML = '<div class="stack">' + Object.keys(cols).map(k => `<span style="width:${Math.max(0.6, C[k] / tot * 100).toFixed(1)}%;background:${cols[k]}" title="${k}: ${fmt(C[k])}"></span>`).join('') + '</div>' +
        '<div class="legend">' + Object.keys(cols).map(k => `<span><i style="background:${cols[k]}"></i><b>${fmt(C[k])}</b> · ${(C[k] / tot * 100).toFixed(1)}% · ${txt[k]}</span>`).join('') + '</div>';
    }

    /* TEC histogram */
    const h = $('#chart-tec');
    if (h) {
      const mx = Math.max(...D.tecHist);
      h.innerHTML = '<div class="hist">' + D.tecHist.map(v => `<div style="height:${Math.max(1.5, v / mx * 100)}%" data-v="${fmt(v)}"></div>`).join('') + '</div>' +
        '<div class="hist-axis">' + D.tecHist.map((_, i) => `<span>${(i / 10).toFixed(1)}</span>`).join('') + '</div>';
    }

    /* dynasty timeline */
    const tl = $('#chart-dynasty');
    if (tl) {
      const m = Object.fromEntries(D.dynasties);
      const mx = Math.max(...Object.values(m));
      tl.innerHTML = '<div class="timeline">' + DYN_ORDER.filter(d => m[d]).map(d =>
        `<div class="t"><div class="b" style="height:${Math.max(1.5, m[d] / mx * 100)}%" data-v="${m[d]}"></div><div class="n" title="${dynLabel(d)}">${dynLabel(d)}</div></div>`).join('') + '</div>';
    }

    /* central nodes */
    const rk = $('#rank-central');
    if (rk) {
      rk.innerHTML = D.topNodes.slice(0, 10).map(n =>
        `<li><span class="nm">${n.name}<small>${zh ? n.type : (CONCEPT_EN[n.name] || typeLabel(n.type))}</small></span><span class="mt">${zh ? '介数' : 'betweenness'} ${n.betweenness.toFixed(3)} · ${zh ? '度' : 'deg'} ${n.degree}</span></li>`).join('');
    }
    const topLists = [['#rank-herbs', D.herbs], ['#rank-formulas', D.formulas], ['#rank-books', D.books]];
    topLists.forEach(([sel, list]) => {
      const el = $(sel); if (!el) return;
      el.innerHTML = list.slice(0, 8).map(n =>
        `<li><span class="nm">${n.name}${n.dynasty ? `<small>${dynLabel(n.dynasty)}${n.year ? ' · ' + parseInt(n.year, 10) : ''}</small>` : ''}</span><span class="mt">${zh ? '度' : 'deg'} ${n.degree}</span></li>`).join('');
    });

    /* CMS heatmap */
    renderHeatmap();

    /* downloads size labels */
    $$('[data-file]').forEach(a => {
      const f = D.files.find(x => x.name === a.dataset.file);
      const s = $('.sz', a);
      if (f && s) s.textContent = f.bytes > 1e6 ? (f.bytes / 1e6).toFixed(1) + ' MB' : Math.round(f.bytes / 1e3) + ' KB';
    });
  }

  function heatColor(v, max) {
    // ivory → amber → cinnabar → deep wine
    const t = Math.min(1, v / max);
    const stops = [[255, 247, 221], [245, 179, 74], [200, 53, 43], [110, 15, 30]];
    const p = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), f = p - i;
    const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * f));
    return { bg: `rgb(${c.join(',')})`, fg: t > .55 ? '#fff' : '#1c1b1a' };
  }

  function renderHeatmap() {
    const host = $('#heatmap'); if (!host) return;
    const D = window.KG_DATA, zh = window.TBK.lang() === 'zh';
    const anchors = ['Osteoporosis', 'Age-related osteoporosis context', 'Postmenopausal osteoporosis context', 'Pregnancy/lactation-associated osteoporosis context',
      'Fragility fracture', 'Vertebral fragility fracture', 'Functional impairment', 'Gait instability / fall risk'];
    const byC = {};
    D.cms.forEach(r => { (byC[r.classical_concept] = byC[r.classical_concept] || {})[r.modern_anchor] = r; });
    const concepts = Object.keys(byC).sort((a, b) => Math.max(...anchors.map(m => byC[b][m]?.CMS || 0)) - Math.max(...anchors.map(m => byC[a][m]?.CMS || 0)));
    const max = Math.max(...D.cms.filter(r => anchors.includes(r.modern_anchor)).map(r => r.CMS));
    let html = `<div class="heat" style="grid-template-columns: 130px repeat(${anchors.length}, 1fr)"><div></div>` +
      anchors.map(a => `<div class="h">${zh ? (ANCHOR_ZH[a] || a) : (ANCHOR_SHORT_EN[a] || a)}</div>`).join('');
    concepts.forEach(c => {
      html += `<div class="r" title="${CONCEPT_EN[c] || ''}">${c}</div>`;
      anchors.forEach(a => {
        const r = byC[c][a]; if (!r) { html += '<div class="c"></div>'; return; }
        const col = heatColor(r.CMS, max);
        html += `<div class="c${r.G === 0 ? ' gated' : ''}" style="background:${col.bg};color:${col.fg}" data-c="${c}" data-a="${a}">${r.CMS.toFixed(2)}</div>`;
      });
    });
    html += '</div>';
    host.innerHTML = html;

    /* tooltip */
    let tip = $('.tooltip'); if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip); }
    host.onmousemove = (e) => {
      const cell = e.target.closest('.c[data-c]'); if (!cell) { tip.classList.remove('show'); return; }
      const r = byC[cell.dataset.c][cell.dataset.a];
      const gated = r.G === 0;
      tip.innerHTML = `<b>${cell.dataset.c}</b> → ${zh ? (ANCHOR_ZH[r.modern_anchor] || r.modern_anchor) : r.modern_anchor}<br>` +
        `PHS ${r.PHS.toFixed(3)} · PCS ${r.PCS.toFixed(3)} · E<sub>c</sub> ${r.E_c.toFixed(3)}<br>` +
        `CMS <b>${r.CMS.toFixed(4)}</b> · G = ${r.G} · CMS<sub>exact</sub> = ${r.CMS_exact.toFixed(4)}` +
        (gated ? `<br><span style="color:#f0a89b">${zh ? '诊断边界约束：不得读作回溯性诊断' : 'Diagnostic Boundary Constraint: never a retrospective diagnosis'}</span>` : '');
      tip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + 'px';
      tip.style.top = (e.clientY + 16) + 'px';
      tip.classList.add('show');
    };
    host.onmouseleave = () => tip.classList.remove('show');
  }
})();
