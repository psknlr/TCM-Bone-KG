<p align="center">
  <img src="assets/img/favicon.svg" width="72" alt="TCM-Bone-KG">
</p>

<h1 align="center">TCM-Bone-KG</h1>

<p align="center">
  <b>An evidence-weighted knowledge graph of osteoporosis-related bone disorders in classical Chinese medicine</b><br>
  <b>骨质疏松中医古籍证据加权知识图谱</b>
</p>

<p align="center">
  <a href="https://psknlr.github.io/TCM-Bone-KG/">Website · 网站</a> ·
  <a href="https://psknlr.github.io/TCM-Bone-KG/explorer.html">Graph explorer · 图谱浏览</a> ·
  <a href="https://psknlr.github.io/TCM-Bone-KG/browse.html">Node browser · 节点检索</a> ·
  <a href="#data--数据">Data · 数据</a>
</p>

---

## English

TCM-Bone-KG distils **516 classical Chinese medical texts** spanning ten dynasties into a graph of **1,690 nodes** and **10,434 edges** describing classical bone disorders (骨痿, 骨枯, 骨痹, 骨空 …), their syndrome patterns, phenotypes, populations, therapies, formulas, herbs, acupoints and outcomes.

Three design principles distinguish it from a plain extraction:

| Principle | What it means |
|---|---|
| **Triple Evidence Confidence (TEC)** | Every evidence triple carries a [0, 1] score combining passage relevance with recurrence, number of independent books, and dynastic spread. Rankings are stable under ±20% weight perturbation (ρ ≥ 0.998). Evidence edges are tiered E1–E4. |
| **Orthogonal modern clinical bridge** | 12 modern clinical anchors (disease context, population context, fragility/functional phenotype, assessment) sit *beside* the seven-layer classical ontology and are reached only through non-diagnostic correspondence relations. |
| **Diagnostic Boundary Constraint** | A binary gate G(c,m) sets CMS<sub>exact</sub> = 0 for every disease/syndrome → Osteoporosis pair (100% compliance), so the graph can never be read as a retrospective diagnosis. |

Key quality metrics: provenance completeness 88.2%, schema validity 100%, single-source relation rate 65.5%, bootstrap Top-10 PageRank stability 0.931 ± 0.046 (B = 300). Entity/relation precision–recall and bridge-layer Cohen's κ are **pending** a double-annotated gold set; see the limitation statement on the site and in `docs/methods_results_draft.md`.

### Website

The site is a dependency-free static build (HTML/CSS/JS) with an EN / 中文 switch, light and dark themes, charts computed from the released CSVs, an interactive CMS heatmap, an embedded force-directed graph explorer, and a node browser that inspects every edge with its TEC score and evidence tier.

**Deploy on GitHub Pages:** *Settings → Pages → Build and deployment → Source: GitHub Actions*. The workflow in `.github/workflows/pages.yml` deploys on every push to `main`. Alternatively choose *Deploy from a branch* (`main`, `/ (root)`); the `.nojekyll` file is already in place.

**Run locally:**

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

If you change any CSV under `data/`, regenerate the embedded chart data:

```bash
python3 scripts/build_kg_data.py
```

---

## 中文

TCM-Bone-KG 从横跨十个朝代的 **516 部中医古籍** 中提炼出 **1,690 个节点、10,434 条关系** 的知识图谱，系统刻画骨痿、骨枯、骨痹、骨空等古籍骨病及其证型、表型、人群、治法、方剂、中药、腧穴与转归。

区别于简单抽取的三个核心设计：

| 设计 | 含义 |
|---|---|
| **三元组证据置信度（TEC）** | 每条证据三元组拥有统一 [0,1] 尺度的评分，综合条目相关度、复现次数、独立书目数与朝代跨度。±20% 权重扰动下排序相关系数 ρ ≥ 0.998。证据边分为 E1–E4 四级。 |
| **正交的现代临床桥接层** | 12 个现代临床锚点（疾病情境、人群情境、脆性/功能表型、评估工具）与七层古典本体*并置*，仅通过非诊断性对应关系相连。 |
| **诊断边界约束** | 二值门控 G(c,m) 使全部病名/证型 → 骨质疏松症的 CMS<sub>exact</sub> = 0（合规率 100%），从数据层面杜绝回溯性诊断的解读。 |

主要质量指标：溯源完整性 88.2%，模式有效性 100%，单源关系率 65.5%，自助法 Top-10 PageRank 稳定性 0.931 ± 0.046（B = 300）。实体/关系的精确率–召回率与桥接层 Cohen's κ **尚待**双人标注金标准集完成后计算；详见网站与 `docs/methods_results_draft.md` 中的局限性说明。

### 网站

本站为无外部依赖的静态站点（HTML/CSS/JS），支持中英文切换、明暗主题，图表直接由发布的 CSV 计算生成，包含交互式 CMS 热图、内嵌的力导向图谱浏览器，以及可逐条查看 TEC 评分与证据等级的节点检索页。

**部署到 GitHub Pages：** *Settings → Pages → Build and deployment → Source: GitHub Actions*。`.github/workflows/pages.yml` 会在每次推送到 `main` 时自动部署。也可选择 *Deploy from a branch*（`main`，`/ (root)`），仓库已包含 `.nojekyll`。

**本地运行：**

```bash
python3 -m http.server 8000   # 然后打开 http://localhost:8000
```

修改 `data/` 下的 CSV 后，请重新生成内嵌图表数据：

```bash
python3 scripts/build_kg_data.py
```

---

## Data · 数据

| File | Description |
|---|---|
| `data/kg_nodes.csv` | 1,690 nodes: type, degree, betweenness, community, dynasty/year, herb category, meridian, anchor category |
| `data/kg_edges.csv` | 10,434 edges: n<sub>t</sub>, b<sub>t</sub>, R̄<sub>t</sub>, D<sub>t</sub>, S<sub>t</sub>, B<sub>t</sub>, TEC<sub>t</sub>, edge class, evidence tier, bridge/CMS fields |
| `data/osteoporosis_tcm_kg_v2.ttl` | RDF/OWL Turtle; reified statements carry TEC and edge class |
| `data/osteoporosis_tcm_kg_v2.graphml` | GraphML for Gephi / Cytoscape / NetworkX / igraph |
| `data/neo4j_import_v2.cypher` | Neo4j import script: `cat data/neo4j_import_v2.cypher \| cypher-shell -u neo4j -p <pwd>` |
| `data/cms_classical_to_modern_anchor.csv` | 216 concept × anchor rows: PHS, PCS, E<sub>c</sub>, CMS, G, CMS<sub>exact</sub> |
| `data/modern_anchor_phenotype_vectors_y_m.csv` | y<sub>m</sub>: 12 anchors × 8 phenotypes (clinical-judgment input, pending expert review) |
| `data/modern_anchor_population_vectors_u_m.csv` | u<sub>m</sub>: 12 anchors × 4 population contexts |
| `data/kg_quality_table.csv` | All quality and robustness metrics |
| `data/kg_interactive_v2.html` | Self-contained interactive network (vis-network) |
| `docs/methods_results_draft.md` | Methods §2.9–2.12 and Results §3.X |
| `assets/img/fig5_ecpb_evidence_bridge.png` | Figure 5: ontology, TEC by relation, CMS heatmap, bootstrap stability |

## Repository layout · 目录结构

```
index.html          landing page (bilingual)
explorer.html       embedded interactive graph
browse.html         node & edge browser
assets/css/site.css
assets/js/site.js   language / theme / charts
assets/js/browse.js node browser
assets/js/kg-data.js  generated by scripts/build_kg_data.py
data/               graph serialisations and tables
docs/               methods & results draft
scripts/            build helpers
```

## Citation · 引用

```bibtex
@misc{tcm_bone_kg_2026,
  title        = {TCM-Bone-KG: an evidence-weighted knowledge graph of osteoporosis-related
                  bone disorders in classical Chinese medicine, with a cross-era phenotype bridge},
  year         = {2026},
  howpublished = {\url{https://github.com/psknlr/TCM-Bone-KG}},
  note         = {Version 2. 1,690 nodes, 10,434 edges, 516 classical texts.}
}
```

---

<p align="center">
  <sub>Website designed by <b>INSTITUTE OF MEDICAL PHILOSOPHY &amp; FUTURE AI</b> · 网站设计：医学哲学与未来人工智能研究所</sub>
</p>
