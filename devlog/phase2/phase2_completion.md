## 🏛️ Civilizism Phase 2: Where SHAPE and DASP Actually Came From

**Almost everything the project's README currently leads with got built in the ~year between Phase 1 and now, and none of it got written down as it happened.** Phase 1's `agtCore.py` was a 532-line prototype: 8 hand-picked coefficients, a made-up trust formula, no SHAPE, no DASP, one hardcoded scenario. This is that undocumented stretch, reconstructed after the fact.

### 🧩 What Got Built in Phase 2:
- ✅ **SHAPE** — personality-driven utility scoring (Habit/Value/Dissonance), replacing whatever the LLM felt like doing
- ✅ **DASP** — deterministic, offline importance scoring (SPAB), replacing per-event LLM calls
- ✅ **43-trait `psyc_profile`** (19 Schwartz + 24 HEXACO), replacing 8 hand-picked coefficients
- ✅ **Scenario-JSON-driven engine** — no more forking the codebase per scenario
- ✅ Biological pipeline v1 — hunger, boredom, irritability, fatigue, all interacting
- ✅ STEME/BLOC begin the cosine-similarity → NLI migration
- ✅ Concurrent agent execution, run resume, a real serialization layer

### 🛡️ SHAPE

Personality-driven utility scoring: every action proposal gets weighed against the agent's full 43-trait profile before it's allowed to execute. Character enforced by code, not by prompting the model to stay in character.

> *Hardest part of the implementation was the literature review.*

### 👁️ DASP

Perception became a resource-constrained process. A finite per-tick credit pool, scored deterministically (SPAB: Surprisedness/Proximity/Alignment/Biological override) — no LLM call needed to decide what an agent notices.

> *I guess I'm not the only one getting tunnel-visioned anymore — my agents too now :)*

### 🎭 Scenario-Driven Architecture

The engine stopped hardcoding scenario content directly into itself. A scenario is now a JSON file — factions, world schedule, environment graph — and the engine drives all agent behavior from that. The precondition for every replication scenario (Milgram, Asch, Robbers Cave, SPE) sharing one engine instead of one fork each.

> *What drives tech progression? Laziness, obviously.*

### 🔭 What's Next (Phase 3):
- Sleep and threat-response actually grounded in real signals instead of placeholder deltas
- A real object-interaction model and a spatial engine wired into the live sim
- A relationship classifier that can say "I don't know" instead of confidently guessing wrong
- An actual frontend, so you can watch a run instead of reading a JSON dump
