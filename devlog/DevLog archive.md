# Historical Milestone Archive (Phase 0–2)

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

Current development has moved into Phase 3, focusing on grounded biological/psychological mechanics (sleep, threat response, object interaction, relationship modeling) and a real frontend for watching runs.
