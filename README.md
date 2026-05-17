# Civilizism

**Civilizism** is a multi-agent simulation framework for studying the emergence of social dynamics, belief systems, and personality evolution at scale. At the microscopic level, each agent perceives their environment, forms memories, reflects on experience, plans their days, and slowly becomes who their experiences have made them. At the macroscopic level, agents interact, share and conflict over beliefs, and drive each other's personality drift — the goal being to simulate how civilizations, social norms, and collective identity emerge from the bottom up.

> *"Can we simulate a society not just by what people do, but by how they think?"*

---

## Two Scales

**Microscopic (Cognitive Engine)** — The internal architecture of a single agent, and the majority focus of this project. Environmental stimuli and executed actions are encoded into memory, which is filtered through the agent's personality traits to generate context. This context informs LLM-assisted decision-making (actions and plans), which in turn modifies the environment and future memory states.

**Macroscopic (Social Evolution)** — Population-level dynamics emerging from parallel agent execution. Shared experiences foster belief alignment; conflicting interactions drive ideological divergence. The core objective is to observe whether coherent social structures, group identities, and institutional patterns emerge organically from individual-level cognitive mechanics — without hardcoded rules.

> *"If one can simulate an individual well, simulating a lot of them makes you a social simulation."*

---

## Information Flow

![Civilizism Information Flow](https://github.com/Tim-Chen-Yen-Ting/Civilizism/blob/main/architecture/Civilizism_Info_Flow.png)

Memory is the hub of the simulation — not a step in a pipeline. Everything writes into it; everything reads from it. LLMs appear at exactly two points as black boxes: **action proposal generation** and **planning**. Everything else is deterministic.

The LLM proposes; SHAPE decides. Reflection and Planning are LLM-assisted but their outputs are written back into Memory as first-class entries, making them indistinguishable from lived experience in future retrieval.

> *"Memory is what makes you, you. Same for agents."*

---

## Architecture

```
Civilizism/
├── Agent/                   # Microscopic Cognition
│   ├── Memory/              # Storage, Retrieval, Decay, and Clustering
│   └── Behavior/            # Perception, Planning, Action, and Reflection
├── System/                  # Infrastructure & Environment
│   ├── Environment/         # Spatial Mapping and Object Logic
│   ├── System/              # Global Clock and Activity Logs
│   └── LLM Hub/             # Backend Wrappers and Structured Parsing
└── Tool/                    # Research Utility Engines
    ├── STEME/               # Semantic Transformation Engine → github.com/Tim-Chen-Yen-Ting/STEME
    └── BLOC/                # Belief Clustering Engine      → github.com/Tim-Chen-Yen-Ting/BLOC
```

> ⚠️ **Note:** Core simulation logic lives in a private development repo.
> This public repo contains architecture documentation, research engines
> (STEME, BLOC), benchmarks, and sample outputs. Full codebase available
> on request — timchen56789@gmail.com

---

## Technical Highlights

### 🛡️ SHAPE — Personality-Driven Utility Maximization

To prevent LLM drift, all action proposals are gated by a deterministic utility scoring engine. The LLM generates 5 candidate actions; SHAPE scores each against the agent's full personality profile via:

$$U = a(\text{Habit}) + b(\text{Value}) - c(\text{Dissonance})$$

This places a mathematical reign on LLM output, ensuring the agent's character is enforced by code, not prompting.

### 👁️ DASP — Dynamic Attention & Significance Perception

Perception is a resource-constrained process governed by emotional state. DASP manages a finite pool of perception credits per tick, where total available bandwidth is inversely proportional to emotional intensity — simulating tunnel vision under stress. Credits are distributed based on:

- **Surprisedness** — delta between stimulus and current agenda
- **Proximity** — personal relevance to the agent
- **Alignment** — semantic resonance (valence-independent) with the agent's core beliefs
- **Biological Override** — emergency events that force attention regardless of alignment

### 🧩 [BLOC](https://github.com/Tim-Chen-Yen-Ting/BLOC) — Incremental Belief Clustering

Beliefs are not discrete labels — they are evolving centroids in vector space. BLOC groups raw memory embeddings into clusters that drift as new experiences arrive, reflecting how the meaning of a belief changes over time. Opposing centroids are detected automatically and trigger internal conflict memories. Crucially, these centroids are reversible: `inverse_embed()` in `stemeKit.py` maps any centroid back into semantically significant natural language statements, making ideological drift human-readable.

### 🧠 [STEME](https://github.com/Tim-Chen-Yen-Ting/STEME) — Semantic Transformation & Evaluation Mapping Engine

The semantic backbone of the entire framework. Beyond basic similarity scoring, STEME enables **Abstract Semantic Extraction** via `STEME_trait()` — anchoring abstract concepts (like *sincerity* or *power dominance*) using a structured dictionary of definitions and polar behavioral examples to compute accurate semantic coordinates. This is the fundamental translation layer between qualitative semantics and quantitative vectors, and back again.

### 🧬 Agent Personality — Genotypes & Phenotypes

Agent character is defined at two levels, both grounded in academic psychology literature.

**Genotypes** — 43 numerical coefficients spanning motivational values and behavioral traits. These coefficients form a reversible map: a personality description in natural language can be encoded into coefficients via STEME, and decoded back into semantically meaningful personality statements via `agent_str()`.

**Phenotypes** — Secondary traits computed from genotype combinations that directly gate agent behavior. A growing list — new phenotypes are derived as new behavioral features require gating:

| Trait | Role |
|:---:|:---:|
| `discipline` | Weight between habit and value alignment in SHAPE scoring |
| `rememberness` | How strongly recency biases memory retrieval |
| `forgetness` | Pruning threshold — memories that decay below this are dropped |
| `associative_strength` | Breadth of semantic leaps allowed during memory retrieval |
| `emotional_openness` | Sensitivity of emotion vector to incoming memory intensity |
| `conceptual_inertia` | Resistance to forming new belief clusters |
| `goal_bias` | Pull toward goal-relevant memories during planning |
| `value_weighting` | Amplification of importance during memory scoring |

### ⏳ Organic Memory & Planning

**Double-Exponential Decay** — Memories fade along two independent decay curves: passive decay proportional to age, and an active importance-weighted recall bump whenever a memory is retrieved. Memories that fall below the agent's `forgetness` threshold are permanently pruned, mirroring human long-term forgetting.

**Three-Tier Planning** — Planning operates at three levels of resolution:
- **Long-term goals** — open-ended objectives generated from reflection, stored as memories and weighted in retrieval
- **Daily schedule** — broad guidelines generated at the start of each day: wake time, anchor activities, sleep
- **Tick-level execution** — a local planner recursively fills schedule gaps as time progresses, with an inspontaneous override mechanism that allows critical stimuli to rewrite the schedule mid-execution

**Human-Mimicking Physiology** — Integrated sleep pressure and circadian rhythm mechanisms that degrade reflection quality and perceptual reliability under fatigue, and trigger dream-state memory replay during sleep.

### 📐 Emotion & Belief as Continuous Fields

**Emotion** is not a discrete label. It is maintained as a continuous vector in embedding space, nudged by every memory proportional to emotional intensity and `emotional_openness`. The current emotion state is resolved on demand by nearest-neighbor lookup against 96 fine-grained emotion labels across 9 families (joy, sadness, anger, fear, disgust, surprise, anticipation, trust, compound).

**Belief** follows the same principle. Each memory's content is projected into embedding space and incrementally clustered via BLOC. The resulting centroid captures not just a label but what a belief *means* to this specific agent given their accumulated experience — and how it drifts over time.

### 🔩 Infrastructure

- **Quantifiable character growth** — 43 genotype coefficients drift incrementally via `trait_tune()` using multiplicative momentum scaled by memory importance. Character evolves slowly and continuously as experiences shape it, not in discrete jumps.

- **Fully modular** — every subsystem (memory, perception, planning, reflection, action) is independently swappable and extensible without touching other modules. The sentence transformer model and LLM backend are fully replaceable.

- **Mature LLM integration** — structured parsing via [LiteLLM](https://github.com/BerriAI/litellm) and [Instructor](https://github.com/jxnl/instructor), with Pydantic-validated response schemas and automatic retry on validation failure.

- **Built entirely on first-principles implementations** — the cognitive architecture is novel enough that existing high-level frameworks offered no meaningful abstraction. The entire codebase relies only on: `numpy`, `math`, `uuid`, `typing`, `pydantic`, `instructor`, `litellm`, `json`, `sentence_transformers`, `sklearn.metrics.pairwise`, and `itertools`.

> *"AI is a powerful wildhorse, but it's only a good ride if you put a mathematical reign on it."*

---

## Roadmap

Near-term:
- Biological drives (hunger, thirst, physical pressure) feeding into action utility
- Generational transition and belief inheritance across agent generations
- Social heatmaps for macroscopic visualization of belief convergence across populations

> *"Watch how I die from frontend, finetuning, and midterms."*

---

## About

Developed solo by **Tim Chen** — Statistics & Data Science, UCLA '27.  

Building at the intersection of cognitive science, systems architecture, and AI.

[LinkedIn](https://www.linkedin.com/in/yen-ting-tim-chen-303276329?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app) | [GitHub](https://github.com/Tim-Chen-Yen-Ting) 

---

## License

MIT — free to explore, cite, or contribute with proper credit.
