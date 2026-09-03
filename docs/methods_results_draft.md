# Methods §2.9–2.12 and Results §3.X (draft, ready to paste into the manuscript)

## 2.9 Evidence-weighted knowledge graph: Triple Evidence Confidence (TEC)

Every relational triple *t* = (subject, relation, object) extracted from the classical corpus was
assigned a **Triple Evidence Confidence (TEC)** score combining the entry-level relevance of its
supporting passages with three corroboration signals: how often the triple recurs, how many
independent books attest it, and how widely that attestation spreads across historical periods.

For triple *t*, let *n_t* be the number of supporting passages, *b_t* the number of distinct books
among them, R̄_t the mean of the upstream per-passage relevance score (`osteoporosis_relevance_score`,
∈[0,1]) over those passages, and *D_t* the Shannon-entropy diversity of the dynasty labels of those
passages, normalized by the log of the total number of dynasty categories observed in the included
corpus (K = 10):

> **Box 1 — Triple Evidence Confidence**
> S_t = log(1+n_t) / log(1+n_max)
> B_t = log(1+b_t) / log(1+b_max)
> D_t = H(dynasty distribution of t) / log(K),  K = 10
> **TEC_t = R̄_t · (α·S_t + β·B_t + γ·D_t)**,  α=β=γ=1/3

n_max and b_max are the corpus-wide maxima (n_max=400, b_max=152), so
TEC scores are comparable across all relation types on a single [0,1] scale. The equal-weight main
analysis (α=β=γ=1/3) was checked against four ±20%-perturbed weight sets; the resulting TEC rankings
correlated at ρ ≥ 0.9981 with the main analysis (Pearson correlation of ranks),
indicating the ranking is not an artifact of the specific weight choice.

Edges were partitioned into three classes: **evidence** edges (n=9201, 88.2% of the
graph), which carry passage-level provenance and a computed TEC_t; **structural** edges
(n=1207, 11.6%), which encode curated/definitional facts
(formula-herb composition, herb functional category, acupoint-meridian assignment, book-dynasty
assignment, and the modern clinical-guideline bridges defined in §2.11) and for which TEC is not
defined; and **bridge-score** edges (n=26), whose weight is the Cross-Era Mapping Score
defined in §2.11 rather than raw TEC.

Each evidence triple was further assigned an evidence tier: **E1** (single passage, single book,
n=4787, 52.0%), **E2** (multiple passages, single book,
n=1244, 13.5%), **E3** (multiple books, single dynasty,
n=638, 6.9%), and **E4** (multiple books, multiple
dynasties — the graph's evidentiary backbone, n=2532, 27.5%).

## 2.10 Orthogonal modern clinical bridge layer

Following the principle established earlier in this manuscript — that classical disease names cannot
be treated as retrospective diagnoses of osteoporosis — we introduce a **modern clinical bridge layer**
that sits *orthogonal* to the seven-layer classical ontology rather than extending it as an eighth
layer. The bridge layer comprises 12 **modern clinical anchors** across four
categories: disease context (Osteoporosis), population context (age-related, postmenopausal, and
pregnancy/lactation-associated osteoporosis contexts), fragility/functional phenotype (fragility
fracture, vertebral fragility fracture, functional impairment, gait instability/fall risk), and
assessment (DXA/BMD assessment, T-score, fracture-risk assessment, vertebral fracture assessment).

Classical concepts connect to this layer only through explicitly non-diagnostic relation types:
`population_context_corresponds_to` (life-stage/population correspondence), `phenotypically_corresponds_to`
(symptom-profile correspondence), and `maps_to_clinical_finding` (single-symptom-to-finding
correspondence) — never through an equivalence or "is-a" relation. Two further relations,
`requires_modern_confirmation_by` and `risk_assessed_by`, connect anchors *within* the modern layer to
the assessment tools that modern practice requires for confirmation (DXA/BMD, T-score) and risk
stratification, and are structural (guideline-derived, not text-evidence).

## 2.11 Cross-era phenotype bridging (ECPB): PHS, PCS, and the Cross-Era Mapping Score

For each classical concept *c* (disease or syndrome node, n=18) we built a TEC-weighted
phenotype profile **x_c** over K=8 observable phenotypes (functional limitation, bone
pain, fatigue, low-back pain, gait instability, fracture, kyphosis, height loss) from its
`presents_as`/`chief_complaint` edges, and a TEC-weighted population profile **u_c** over the four
population contexts from its `predisposes_to`/`commonly_shows` edges, each row-normalized to sum to 1.

For each modern anchor *m* we constructed corresponding vectors **y_m** (phenotype) and **u_m**
(population) on a {0, 0.5, 1} scale from standard clinical definitions of each anchor. **These vectors
are a clinical-judgment input, not learned from data**, and are provided in full in
`modern_anchor_phenotype_vectors_y_m.csv` and `modern_anchor_population_vectors_u_m.csv` for domain-expert
review before any claim in this manuscript relies on a specific CMS value.

> **Box 2 — Phenotype/Population Similarity and the Cross-Era Mapping Score**
> PHS(c,m) = Σ_k ω_k·min(x_ck, y_mk) / Σ_k ω_k·max(x_ck, y_mk)   (weighted Jaccard, ω_k = 1/K)
> PCS(c,m) = cosine(u_c, u_m)
> E_c = mean TEC over all evidence edges touching c
> **CMS(c,m) = E_c · (λ·PHS(c,m) + (1−λ)·PCS(c,m))**,  λ = 0.5

## 2.12 Diagnostic Boundary Constraint

Because no classical text records DXA/BMD or a T-score, any *exact diagnostic* reading of a
classical-concept-to-Osteoporosis correspondence is categorically unsupported by the source material.
We therefore gate every such interpretation with a binary Diagnostic Boundary Constraint G(c,m):

> **Box 3 — Diagnostic Boundary Constraint**
> G(c,m) = 0  if m represents an exact modern diagnostic equivalence (m = Osteoporosis, interpreted diagnostically)
> G(c,m) = 1  for all phenotype-level or population-context correspondences
> **CMS_exact(c,m) = G(c,m) · CMS(c,m)**

In the constructed graph, **100% of the 21 disease/syndrome→Osteoporosis
`phenotypically_corresponds_to` edges carry CMS_exact = 0** by this construction, formally encoding
that the phenotype-level correspondence reported for these pairs (e.g. 脾胃虚弱证–Osteoporosis,
pre-gate CMS = 0.095; 肝肾阴虚证–Osteoporosis, CMS = 0.092) is never to be read as a retrospective
diagnosis.

## 3.X Results: KG quality and robustness

The evidence-weighted graph comprises 1,690 nodes and 10,434 edges
(9,201 evidence-class with TEC computed,
1,207 structural/definitional,
26 cross-era bridge edges scored by CMS). Passage-level
**Provenance Completeness** is 88.2%; **Schema Validity** (both endpoints of every edge
resolving to a declared entity type) is 100.0%; the **Single-Source Relation Rate** — the share
of evidence triples attested by only one book — is 65.5%, with the remaining
34.5% (evidence tiers E3+E4) forming the graph's cross-corroborated backbone.

Central-node **bootstrap stability** (B=300 resamples of the 3,644 included passages,
with replacement) showed that the Top-10 PageRank set is recovered with mean Jaccard overlap
0.931 (SD 0.046), the Top-20 set with 0.992
(SD 0.019), and the full node ranking correlates with the original at mean Spearman
ρ = 0.935 (SD 0.013) — indicating the graph's central structure
(led by 骨痿 and 中药内服, betweenness 0.298 and
0.250 respectively) is not an artifact of any
single passage or book.

**Limitation, stated plainly:** Entity/Relation Precision, Recall, F1, and a bridge-layer Cohen's κ
were planned but could not be computed in this analysis session. We checked the available corpus file
most likely to serve this purpose (`20250201筛选结果_T1_T5_专家版_最终.xlsx`) and found it to be
rule-based keyword-matching output (T1–T5 category flags), not a double-annotated expert gold set —
it carries no independent second annotator and no agreement statistic despite its filename. Reporting
these metrics requires either the manuscript's own 701-entry double-annotated gold set (κ ≥ 0.75
pre-registered) or a fresh 100% expert review of the 26 new
bridge-layer relations; we recommend the latter specifically for the phenotype/population vectors in
§2.11, which are a modeling choice, not a data-derived result.
