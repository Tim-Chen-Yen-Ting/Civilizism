# Civilizism

**Civilizism** is a multi-agent simulation framework studying how social dynamics, belief systems, and personality emerge from individual-level cognitive mechanics — no scripted social rules, no hardcoded outcomes. Each agent perceives, remembers, reflects, and plans; the population's beliefs and social structure fall out of that, not the other way around.

**The LLM proposes; SHAPE decides.** Every agent action starts as an LLM suggestion, then gets scored and gated by a personality-driven utility engine built on Schwartz values and HEXACO traits — character is enforced by code, not by prompting the model to stay in character.

Built solo, and checked against something other than vibes: validated against four classic social-psychology studies (Milgram, Asch, Robbers Cave, Stanford Prison Experiment) in the [Replication Portfolio](#replication-portfolio) below.

> Note: This is the public-facing research journal for Civilizism. 
> Architecture, philosophy, devlogs, and sample outputs live here.
> Core simulation code is in a private development repo — 
> available on request at timchen56789@gmail.com

---

## Two Scales

**Microscopic (Cognitive Engine)** — The internal architecture of a single agent, and the majority focus of this project. Environmental stimuli and executed actions are encoded into memory, which is filtered through the agent's personality traits to generate context. This context informs LLM-assisted decision-making (actions and plans), which in turn modifies the environment and future memory states.

**Macroscopic (Social Evolution)** — Population-level dynamics emerging from parallel agent execution. Shared experiences foster belief alignment; conflicting interactions drive ideological divergence. The core objective is to observe whether coherent social structures, group identities, and institutional patterns emerge organically from individual-level cognitive mechanics — without hardcoded rules.

> *"If one can simulate an individual well, simulating a lot of them makes you a social simulation."*

---

## Information Flow

![Civilizism Information Flow](https://raw.githubusercontent.com/Tim-Chen-Yen-Ting/Civilizism/main/architecture/Civilizism_Info_Flow.png)

Memory is the hub of the simulation — not a step in a pipeline. Everything writes into it; everything reads from it. LLMs appear at exactly two points as black boxes: **action proposal generation** and **planning**. Everything else is deterministic.

Reflection and Planning are LLM-assisted, but their outputs are written back into Memory as first-class entries — indistinguishable from lived experience in future retrieval.

> *"Memory is what makes you, you. Same for agents."*

---

## Architecture

```
Civilizism/
├── Agent/                   # Microscopic Cognition
│   ├── Memory/              # Storage, Retrieval, Decay, and Clustering
│   └── Behavior/            # Perception, Planning, Action, and Reflection
├── System/                  # Infrastructure & Environment
│   ├── Environment/         # Tile-Based Spatial Engine, Object Hierarchy & Interaction
│   ├── System/              # Global Clock and Activity Logs
│   └── LLM Hub/             # Backend Wrappers and Structured Parsing
├── Frontend/                # Scenario Builder + Simulation Viewer (React)
├── Eval/                    # Replication Portfolio, Diagnosis, and Narrative Review
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

To prevent LLM drift, all action proposals are gated by a utility scoring engine. The LLM generates 5 candidate actions; SHAPE scores each against the agent's full 43-trait personality profile via:

$$\text{SHAPE} = a(\text{Habit}) + b(\text{Value}) - c(\text{Dissonance})$$

This places a mathematical reign on LLM output, ensuring the agent's character is enforced by code, not prompting.

Actions aren't limited to a single atomic move per tick. An action can carry a list of sub-steps that execute together and are scored as one coherent decision — so a guard escorting three prisoners to three different cells is one utility-scored action, not three separate ones competing for the same tick. Other agents still perceive each sub-step individually as it happens.

### 👁️ DASP — Dynamic Attention & Significance Perception

Perception is a resource-constrained process governed by emotional state. DASP manages a finite pool of perception credits per tick, where total available bandwidth is inversely proportional to emotional intensity — simulating tunnel vision under stress. Credits are distributed based on:

- **Surprisedness** — delta between stimulus and current agenda
- **Proximity** — personal relevance to the agent
- **Alignment** — semantic resonance (valence-independent) with the agent's core beliefs
- **Biological Override** — emergency events that force attention regardless of alignment

Perception also respects physical space — speech in an adjacent room propagates through acoustically permeable doors, so agents can be alerted or drawn into events without being co-located. Voices carry through walls, the way they would in a real building.

### 🧩 [BLOC](https://github.com/Tim-Chen-Yen-Ting/BLOC) — Incremental Belief Clustering

Beliefs are not discrete labels — they are evolving centroids in vector space. BLOC groups raw memory embeddings into clusters that drift as new experiences arrive, reflecting how the meaning of a belief changes over time. Opposing centroids are detected automatically and trigger internal conflict memories. Each cluster carries the natural-language tag it was seeded from plus a running net importance, so drift is legible as *which* beliefs strengthen, split, or fall away over a run — visible directly in the telemetry and the Belief Evolution view.

### 🧠 [STEME](https://github.com/Tim-Chen-Yen-Ting/STEME) — Semantic Transformation & Evaluation Mapping Engine

The semantic backbone of the entire framework. Beyond basic similarity scoring, STEME enables **Abstract Semantic Extraction** via `STEME_trait()` — anchoring abstract concepts (like *sincerity* or *power dominance*) using a structured dictionary of definitions and polar behavioral examples to compute accurate semantic coordinates. This is the fundamental translation layer between qualitative semantics and quantitative vectors, and back again.

### 🧬 Agent Personality — Genotypes & Phenotypes

Agent character is defined at two levels, both grounded in academic psychology literature.

**Genotypes** — 43 numerical coefficients spanning motivational values and behavioral traits. A personality description in natural language is encoded into coefficients at agent init via STEME, using a bipolar-pair sigmoid stretch against trait anchors; agents given no description start from Gaussian noise instead. In the other direction, `agent_str()` renders the current coefficients back into a prose self-description for prompting as a legible summary.

**Phenotypes** — Secondary traits computed from genotype combinations that directly gate agent behavior. A growing list — new phenotypes are derived as new behavioral features require gating:

| Trait | Role |
|:---:|:---:|
| `discipline` | Weight between habit and value alignment in SHAPE scoring |
| `rememberness` | How strongly recency biases memory retrieval |
| `forgetness` | Raises the pruning threshold — the higher it is, the sooner a decaying memory is dropped |
| `associative_strength` | Breadth of semantic leaps allowed during memory retrieval |
| `emotional_openness` | Sensitivity of emotion vector to incoming memory intensity |
| `conceptual_inertia` | Resistance to forming new belief clusters |
| `goal_bias` | Pull toward goal-relevant memories during planning |
| `value_weighting` | Amplification of importance during memory scoring |

### ⏳ Organic Memory & Planning

**Double-Exponential Decay** — Memory strength is the product of two independent exponential decays: one on time since last recall, stretched by the memory's own importance, and one on raw age, which importance cannot slow. Recall resets the first clock but never the second, so a memory can be kept alive by rehearsal and still fade with age. Memories falling below an erase threshold — itself raised by the agent's `forgetness` — are permanently pruned, and embeddings are quantized progressively coarser as a memory ages through tiers, so old memories survive as gist before they vanish.

**Three-Tier Planning** — Planning operates at three levels of resolution:
- **Long-term goals** — open-ended objectives generated from reflection, stored as memories and weighted in retrieval
- **Daily schedule** — broad guidelines generated at the start of each day: wake time, anchor activities, sleep
- **Tick-level execution** — a local planner recursively fills schedule gaps as time progresses, with an inspontaneous override mechanism that allows critical stimuli to rewrite the schedule mid-execution

**Human-Mimicking Physiology** — Integrated sleep pressure and circadian rhythm mechanisms that degrade reflection quality and perceptual reliability under fatigue, and trigger dream-state memory replay during sleep.

### 📐 Emotion & Belief as Continuous Fields

**Emotion** is not a discrete label. Each memory is tagged against a hierarchy of 91 fine-grained emotion labels organized into 9 families (joy, sadness, anger, fear, disgust, surprise, anticipation, trust, and a compound tier), and those tags are projected onto an 8-dimensional Plutchik vector that every new memory nudges in proportion to its emotional intensity and the agent's `emotional_openness`. The agent's current mood is the argmax over that vector, and the full normalized distribution — not just the winner — is carried in telemetry and drawn as a real-time multi-axis SVG radar chart. Compound labels enrich the projection but are not themselves a resolvable state.

**Belief** follows the same principle. Each memory's content is projected into embedding space and incrementally clustered via BLOC. The resulting centroid captures not just a label but what a belief *means* to this specific agent given their accumulated experience — and how it drifts over time.

### 🎭 Factions & Institutional Pressure

Simulations are defined entirely by a scenario file — no scenario-specific logic lives in the core engine. A scenario declares factions (each with a role instruction and a constrained action set), a global world schedule, and an environment graph, and the engine drives all agent behavior from that.

Two mechanics fall out of this that are worth calling out:

- **Identity view** — a faction can be configured to perceive another faction under a collective identity rather than as individuals (e.g. prisoners perceiving every guard simply as "Guard," never by name). This is applied purely at the perceptual layer — the underlying event log stays accurate — so de-individuation becomes something the *agent* experiences, not something the simulation fakes.
- **World schedule** — a scenario can inject institutional rhythms (meal times, roll calls, lights-out) as importance-weighted pressure that nudges agents without hard-locking their autonomy.
- **Coercive authority** — a faction can be granted the power to physically direct other agents, declared in the scenario as the factions it may target and the action verbs that constitute relocation:

  ```json
  "guard": {
    "coercion": {
      "can_target": ["prisoner"],
      "relocate_verbs": ["escort", "march", "return", "transfer"]
    }
  }
  ```

  The gate is structural, not prompt-conveyed. A faction with no `coercion` block cannot coerce at all, an attempt against a faction outside `can_target` is refused and logged as such, and relocation fires only on the declared verbs — so the engine contains no scenario vocabulary of its own. This enables role-asymmetric scenarios — guard/prisoner, employer/employee, any power-imbalanced social structure — without writing new engine code per scenario. Refused attempts are kept rather than discarded: an agent reaching for authority it does not have is itself a finding.

### 🍽️ Biological Drives

Hunger and boredom run every tick as first-class inputs to the decision engine, not cosmetic stats. Hunger accumulates over simulated hours and resets on food-related actions; boredom follows a bathtub curve shaped by how well the current activity aligns with the agent's personality. They reach behavior by different routes: hunger joins fatigue in **`survival_pressure`** (the physical bucket, normalized by per-agent tolerances), while boredom joins fatigue in **`irritability`**, damped by the agent's gentleness and patience. Both then erode `discipline`, which is the weight SHAPE places on values over habits — and a lower discipline also widens the noise term, so a hungry, bored agent is both less principled and less predictable. No scripting involved.

### 🔩 Infrastructure

- **Quantifiable character growth** — 43 genotype coefficients drift incrementally via `trait_tune()` using multiplicative momentum scaled by memory importance. Character evolves slowly and continuously as experiences shape it, not in discrete jumps.

- **Fully modular** — every subsystem (memory, perception, planning, reflection, action) is independently swappable and extensible without touching other modules. The sentence transformer model and LLM backend are fully replaceable.

- **Mature LLM integration** — structured parsing via [LiteLLM](https://github.com/BerriAI/litellm) and [Instructor](https://github.com/jxnl/instructor), with Pydantic-validated response schemas and automatic retry on validation failure.

- **Built entirely on first-principles implementations** — the cognitive architecture is novel enough that existing high-level frameworks offered no meaningful abstraction. The entire codebase relies only on: `numpy`, `math`, `uuid`, `typing`, `pydantic`, `instructor`, `litellm`, `json`, `sentence_transformers`, `sklearn.metrics.pairwise`, and `itertools`.

- **Comprehensive Telemetry & Visualization** — Historical trace execution logs natively dump environment logs, chronological memory hierarchies (`embedding_tier`), and directional relational topologies (Graphviz/DOT networks mapping dynamic trust and edge-specific dominant emotions) directly into a lightweight streamable pipeline.

> *"AI is a powerful wildhorse, but it's only a good ride if you put a mathematical reign on it."*

---

## 📊 Running the Demo Viewer

To visualize the microscopic states and emergent macroscopic properties of a simulation run, we provide an interactive web viewer built in React (`frontend/`) — a pannable/zoomable map replay, tick scrubber, and per-agent panel with social graph and trend charts.

**Usage**

```bash
cd frontend
npm install   # first time only
npm run dev
```

Then open `/viewer` and load a `run_*.json` from `simulation_runs/` (or, if you just ran a simulation via `main.py`, the dev server launches and opens straight to that run automatically).

### 🗄️ Telemetry JSON Schema (`simulation_output.json`)
Large-scale historical execution logs are serialized into an analytical JSON array mapping environment records, dynamic agent profiles, chronological memory banks, and relational states:

The artifact is versioned, and every writer and reader goes through a single schema module — a reader asking for a key the writer never wrote gets an error, not a plausible default.

```json
{
  "schema_version": 2,
  "scenario_name": "SPE",
  "first_tick": 13,
  "last_tick": 301,
  "tick_count": 288,
  "factions": { "Harris": "guard", "8612": "prisoner" },

  "activity_log": [
    { "timestep": 45, "by_who": "Ray", "content": "...", "type": "speech",
      "target": "environment", "region": "bedroom 3", "importance": 6.4 }
  ],
  "room_logs": {
    "kitchen": [ { "timestep": 46, "by_who": "Ray", "content": "...", "type": "action",
                   "target": "NA", "region": "kitchen", "importance": 3.1 } ]
  },

  "resume": {
    "tick": 301, "end_tick": 301, "density": 30, "start_tick": 13,
    "activity_log_tail": [],
    "agents": { "Ray": { "...": "full agent state for restart" } }
  },

  "agents": {
    "Ray": {
      "final_memory_log": [
        { "timestep": 188, "content": "...", "importance": 8.32, "type": "observation",
          "emotion": "gratitude", "belief": "responsibility", "embedding_tier": 1, "recency_score": 1 }
      ],
      "snapshot_log": [
        {
          "tick": 13,
          "location": "cell 1",
          "emotion": { "emotion": "trust", "intensity": 4.2 },
          "emotion_distribution": { "joy": 0.21, "trust": 0.34, "fear": 0.12, "anger": 0.08,
                                    "sadness": 0.09, "disgust": 0.05, "surprise": 0.04, "anticipation": 0.07 },
          "situation": ["Observing the environment"],
          "memory_count": 24,
          "belief_clusters": [ { "name": "responsibility", "net_importance": 650.0 } ],
          "recent_intents": ["chat", "rest"],
          "biological": { "process_s": 0.31, "irritability": 0.12, "fatigue_delta": 0.08,
                          "hunger": 0.22, "boredom": 0.5, "sleeping": false },
          "plan_queue": [],
          "last_decision": { "action": "...", "intent": "chat", "room": "cell 1",
                             "scores": { "shape_action": 0.61, "shape_intent": 0.58,
                                         "plan": 0.33, "noise": 0.5 } },
          "agent_info": {
            "summary": "An agent profile summary...",
            "core_memories": [],
            "top_goals": [],
            "top_beliefs": [ { "name": "responsibility", "net_importance": 650.0 } ],
            "phenotypes": { "discipline": 0.8, "rememberness": 0.6, "forgetness": 0.3 },
            "psyc_profile": { "power_dominance": 0.85, "sincerity": 0.41 },
            "agent_concepts": { "belief": [], "emotion": [], "social": [] },
            "social_circle": {
              "Maya": { "trust_score": 0.5, "dominant_emotion": { "joy": 1.0 }, "recent_activities": [] }
            }
          }
        }
      ]
    }
  }
}
```

`first_tick`/`last_tick` bound the ticks the artifact actually covers and `tick_count` is their difference — a resumed run starts partway along the number line, so these are three distinct values rather than one. Diagnosis output is written to a `run_<id>_diagnosis.json` sidecar, keeping the run artifact write-once.

---

## Replication Portfolio

Simulating believable agents is a claim that needs checking against something other than vibes. The portfolio pairs each scenario against a classic social-psychology study and scores runs against what that study actually found — the closest thing this project has to ground truth.

| Case | Study |
|---|---|
| Milgram Obedience | Milgram, 1963 |
| Asch Conformity | Asch, 1951/56 |
| Robbers Cave | Sherif, 1954/61 |
| Stanford Prison Experiment | Zimbardo, 1971 |

Each case publishes the study summary, the predictions it's measured against (with historical values and citations), and a generated findings report — never the raw simulation trace, which stays in the private repo.

---

## Roadmap

Near-term:
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
