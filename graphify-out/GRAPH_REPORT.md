# Graph Report - .  (2026-04-11)

## Corpus Check
- Corpus is ~1,172 words - fits in a single context window. You may not need a graph.

## Summary
- 21 nodes · 24 edges · 4 communities detected
- Extraction: 58% EXTRACTED · 42% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `Sliders.svelte Component` - 6 edges
2. `ColorStage.svelte Component` - 5 edges
3. `Dialed Project` - 4 edges
4. `GameCard.svelte Component` - 4 edges
5. `ResultView.svelte Component` - 4 edges
6. `ScoreDisplay.svelte Component` - 3 edges
7. `Guess Phase` - 3 edges
8. `App.svelte Component` - 2 edges
9. `Svelte Framework` - 2 edges
10. `HSB Color Model` - 2 edges

## Surprising Connections (you probably didn't know these)
- `GameCard.svelte Component` --routes_to--> `ResultView.svelte Component`  [INFERRED]
  README.md → README.md  _Bridges community 0 → community 2_
- `Sliders.svelte Component` --implements--> `Guess Phase`  [INFERRED]
  README.md → README.md  _Bridges community 0 → community 3_
- `Guess Phase` --flows_to--> `ResultView.svelte Component`  [INFERRED]
  README.md → README.md  _Bridges community 2 → community 3_

## Hyperedges (group relationships)
- **Game Phase Flow Components** — readme_colorstage_svelte, readme_sliders_svelte, readme_resultview_svelte, readme_endmodal_svelte [INFERRED 0.85]
- **HSB Color Model Consumers** — readme_sliders_svelte, readme_colorstage_svelte, readme_colormath_utility [EXTRACTED 1.00]
- **Key UX Design Decisions** — readme_dm_sans_font, readme_warm_background_rationale, readme_vertical_sliders_rationale, readme_score_animation_rationale, readme_adaptive_contrast_rationale [EXTRACTED 1.00]

## Communities

### Community 0 - "Game Components & Color Logic"
Cohesion: 0.36
Nodes (8): Adaptive Contrast Design Decision, App.svelte Component, ColorMath Utility Object, ColorStage.svelte Component, GameCard.svelte Component, HSB Color Model, Sliders.svelte Component, Vertical Sliders Design Decision

### Community 1 - "Project Tech Stack"
Cohesion: 0.33
Nodes (6): Dialed Project, DM Sans Font, Svelte Framework, Tailwind CSS, Vite Build Tool, Warm Background Design Decision

### Community 2 - "Score & Results Display"
Cohesion: 0.4
Nodes (5): Delta E Scoring, EndModal.svelte Component, ResultView.svelte Component, Score Count-up Animation Design Decision, ScoreDisplay.svelte Component

### Community 3 - "Game Phases"
Cohesion: 1.0
Nodes (2): Guess Phase, Memorize Phase

## Knowledge Gaps
- **9 isolated node(s):** `EndModal.svelte Component`, `Tailwind CSS`, `DM Sans Font`, `Delta E Scoring`, `Warm Background Design Decision` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Game Phases`** (2 nodes): `Guess Phase`, `Memorize Phase`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ResultView.svelte Component` connect `Score & Results Display` to `Game Components & Color Logic`, `Game Phases`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `Sliders.svelte Component` connect `Game Components & Color Logic` to `Game Phases`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `GameCard.svelte Component` connect `Game Components & Color Logic` to `Score & Results Display`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Sliders.svelte Component` (e.g. with `GameCard.svelte Component` and `Guess Phase`) actually correct?**
  _`Sliders.svelte Component` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ColorStage.svelte Component` (e.g. with `App.svelte Component` and `GameCard.svelte Component`) actually correct?**
  _`ColorStage.svelte Component` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GameCard.svelte Component` (e.g. with `App.svelte Component` and `ColorStage.svelte Component`) actually correct?**
  _`GameCard.svelte Component` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ResultView.svelte Component` (e.g. with `GameCard.svelte Component` and `ScoreDisplay.svelte Component`) actually correct?**
  _`ResultView.svelte Component` has 3 INFERRED edges - model-reasoned connections that need verification._