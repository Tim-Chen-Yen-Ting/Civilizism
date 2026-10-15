## 🏗️ Civilizism Phase 3: From Placeholder Mechanics to a World You Can Watch

**Every item on Phase 2's "What's Next" list got built.** Sleep and threat response stopped running on placeholder numbers, objects became things with rules, agents got real positions in space, the relationship classifier learned to say "I don't know," and the Streamlit viewer was replaced by a real frontend where you can author a scenario, deploy it, and watch it run live. This stretch was written down as it happened.

### 🧩 What Got Built in Phase 3:
- ✅ **Sleep rebuilt** — agents sleep when tiredness wins out over whatever else is going on, and they need somewhere to actually do it
- ✅ **Threat habituation** — repeated exposure to the same alarm wears off instead of keeping everyone on edge forever
- ✅ **Object interaction** — food spoils, containers hold things, devices switch on and off, keys unlock their own doors, appliances cook
- ✅ **Spatial engine** — agents and objects have real positions; moving somewhere is a walk, not a teleport
- ✅ **Relationship classifier** — labels how agents see each other, and returns "unknown" when the evidence is thin
- ✅ **Frontend** — replay viewer, scenario builder, and a live Deploy & Run loop
- ✅ **Replication portfolio** — Milgram, Asch, Robbers Cave, and SPE, scored against what the original studies actually found
- ✅ Pinned model snapshot, so runs stay comparable to each other

### 😴 Sleep & Threat

Phase 2 left sleep as fatigue plus a dice roll. Now an agent's need for sleep competes with everything else going on, whether that's a plan, a conversation, or an emergency, so agents stop conking out cold in the middle of speaking. A sleepy agent also has to actually reach a bed or sofa. Waking is gradual too, and agents can lie in bed for a while before getting up (the "five more minutes" mechanic is real).

Threat got the same treatment. In a 48-hour test, one casual "collapse" was read as a real emergency and kept the whole household awake for hours. Repeated alarms now fade, though never to zero.

> *Found by running the same four people for 48 simulated hours and watching them fail to sleep over an idiom.*

### 🍳 Objects With Rules

Objects stopped being props. Food spoils, consumables run out, containers open and close, devices need power, keys fit exactly one lock, and a cooked chicken is now different from a raw one. That last one matters because two agents once contradicted each other about whether dinner was cooked, with nothing in the world to settle it.

> *Yes, a chicken was eaten raw because "heating the chicken" contains "eating." This is why we're not doing regex anymore.*

### 🗺️ A Tile Grid Under the Rooms

Every agent and object now has a real position. Agents walk between rooms and up to the things they use, can't stand on each other or on furniture, and a replay shows the route they actually took. Scenarios can lay out rooms and doors by hand, and anything left unspecified is arranged automatically.

### 🤝 Relationships That Admit Uncertainty

Friend, rival, mentor, stranger, or... none of the above? Agents now classify their relationships from what actually happened between them over time, not from any single memory. The old version confidently mislabeled people on thin evidence. This one would rather say "I don't know."

### 🖥️ A Frontend You Can Watch

Streamlit is gone. In its place:
- **Viewer** — a map you can pan and zoom, a tick scrubber, and a panel for every agent with their state, social graph, and trends
- **Builder** — design factions, individuals, and floor plans, and export a scenario
- **Deploy & Run** — one click starts a run, and the viewer follows it live, with Stop and Resume

> *I stopped reading JSON dumps. My eyes are grateful.*

### 🔭 What's Next (Phase 4):
- Generational transition: agents aging out and passing beliefs and personality on to successors
- Belief heatmaps and a key-event timeline across the population
- Steering a live run, not just starting and stopping it
