# Historical Milestone Archive (Phase 0–3)

This archive contains the completion logs and terminal captures from the early proof-of-concept stages of Civilizism.

## 🧩 Phase 0: Minimum Viable Mind

Focus: 2-agent sustained dialogue and context-aware interaction.
- Successfully demonstrated selective attention (agents prioritizing conversation over environmental nudges).
- Identified the "Simulated Soliloquy Syndrome" which led to the development of the SHAPE engine.

## 🏠 Phase 1: Embodied Prototype

- Focus: 4-agent cohabitation in a shared house environment.
- Implemented spatial memory (known_map) and object interaction logic.
- Observed emergent behaviors like "chair hoarding" and "loop-snacking."
- Integrated the first Streamlit-based simulation viewer for agent state inspection.

## 🏛️ Phase 2: Where SHAPE and DASP Actually Came From

- Focus: the ~year between Phase 1 and now, mostly undocumented as it happened.
- SHAPE and DASP built — personality-driven utility scoring and deterministic, offline attention scoring, replacing raw LLM calls for both.
- Personality grew from 8 hand-picked coefficients to the 43-trait `psyc_profile` (19 Schwartz + 24 HEXACO).
- Engine moved from hardcoded scenario content to a scenario-JSON-driven architecture — the precondition for every replication scenario since.
- STEME/BLOC began their move from cosine similarity to NLI.

## 🏗️ Phase 3: From Placeholder Mechanics to a World You Can Watch

- Focus: grounding the mechanics Phase 2 left as placeholders, and making runs watchable.
- Sleep and threat response rebuilt: sleep competes with everything else an agent is doing, and threat wears off with repeated exposure.
- Stateful objects, a tile-based spatial engine, and a relationship classifier that can answer "none of the above."
- Replication portfolio (Milgram, Asch, Robbers Cave, SPE) and a React frontend with a scenario builder, replay viewer, and live Deploy & Run.

Current development is open on generational transition, belief heatmaps and a key-event timeline, and steering a live run.
