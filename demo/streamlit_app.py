# Demo viewer for Civilizism simulation output.
# Requires: pip install streamlit pandas
# Run with: streamlit run streamlit_app.py


import json
import math
from pathlib import Path
import streamlit as st
import pandas as pd

OUTPUT_PATH = Path(__file__).parent / "simulation_output.json"

st.set_page_config(page_title="Civilizism Viewer", layout="wide")

# ── Load ──────────────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    with open(OUTPUT_PATH, encoding="utf-8") as f:
        return json.load(f)

if not OUTPUT_PATH.exists():
    st.error("No simulation_output.json found. Run main.py first.")
    st.stop()

data = load_data()
agent_names = list(data["agents"].keys())
total_ticks = data["total_ticks"]

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("Civilizism")
    selected_agent = st.selectbox("Agent", agent_names)
    tick = st.slider("Tick", min_value=0, max_value=max(total_ticks - 1, 0), value=0)
    st.caption(f"Total ticks: {total_ticks} | Agents: {len(agent_names)}")

# helpers
def get_snapshot(agent_name, tick_idx):
    log = data["agents"][agent_name]["snapshot_log"]
    if not log:
        return {}
    exact = [s for s in log if s["tick"] == tick_idx]
    if exact:
        return exact[0]
    # fall back to nearest prior snapshot
    prior = [s for s in log if s["tick"] <= tick_idx]
    return prior[-1] if prior else log[0]

def all_snapshots(agent_name):
    return data["agents"][agent_name]["snapshot_log"]

snap = get_snapshot(selected_agent, tick)
info = snap.get("agent_info", {})

# ── Tabs ──────────────────────────────────────────────────────────────────────
tabs = st.tabs(["Agent Profile", "Belief Evolution", "Personality Evolution",
                "Emotion Timeline", "Social Graph", "Activity Log", "Memory Log"])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Agent Profile
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[0]:
    st.subheader(f"{selected_agent}  ·  tick {tick}")

    if info.get("summary"):
        st.info(info["summary"])

    col1, col2 = st.columns(2)

    with col1:
        with st.expander("Emotion", expanded=True):
            emo = snap.get("emotion", {})
            st.metric("Current emotion", emo.get("emotion", "—"))
            st.metric("Intensity", f"{emo.get('intensity', 0):.2f}")

        with st.expander("Situation"):
            situation = snap.get("situation", [])
            if situation:
                for s in situation:
                    st.markdown(f"- {s}")
            else:
                st.caption("No active situation.")

        with st.expander("Core Memories"):
            mems = info.get("core_memories", [])
            if mems:
                st.dataframe(pd.DataFrame(mems), use_container_width=True)
            else:
                st.caption("No memories yet.")

        with st.expander("Top Goals"):
            goals = info.get("top_goals", [])
            if goals:
                st.dataframe(pd.DataFrame(goals), use_container_width=True)
            else:
                st.caption("No goals yet.")

    with col2:
        with st.expander("Top Beliefs", expanded=True):
            beliefs = info.get("top_beliefs", [])
            if beliefs:
                df = pd.DataFrame(beliefs).sort_values("net_importance", ascending=False)
                st.bar_chart(df.set_index("name")["net_importance"])
            else:
                st.caption("No beliefs yet.")

        with st.expander("Phenotypes"):
            phenotypes = info.get("phenotypes", {})
            if phenotypes:
                df = pd.DataFrame(phenotypes.items(), columns=["trait", "value"])
                st.dataframe(df, use_container_width=True)

        with st.expander("Social Circle"):
            social = info.get("social_circle", {})
            if social:
                for partner, pinfo in social.items():
                    st.markdown(f"**→ {partner}**  trust: `{pinfo.get('trust_score', 0):.2f}`")
                    dom_emo = pinfo.get("dominant_emotion", {})
                    if dom_emo:
                        top_emo = max(dom_emo, key=dom_emo.get)
                        st.caption(f"Dominant emotion: {top_emo}")
                    recent = pinfo.get("recent_activities", [])
                    if recent:
                        with st.container():
                            for act in recent[:3]:
                                st.markdown(f"  - {act}")
            else:
                st.caption("No social data yet.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Belief Evolution
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[1]:
    st.subheader(f"Belief Evolution — {selected_agent}")
    snapshots = all_snapshots(selected_agent)
    if snapshots:
        belief_over_time = {}
        ticks_seen = []
        for s in snapshots:
            t = s["tick"]
            ticks_seen.append(t)
            for b in s.get("agent_info", {}).get("top_beliefs", []):
                belief_over_time.setdefault(b["name"], {})
                belief_over_time[b["name"]][t] = b["net_importance"]

        if belief_over_time:
            all_belief_names = sorted(belief_over_time.keys())
            selected_beliefs = st.multiselect(
                "Beliefs to display", all_belief_names, default=all_belief_names,
                key="belief_select"
            )
            if selected_beliefs:
                df = pd.DataFrame(
                    {b: belief_over_time[b] for b in selected_beliefs},
                    index=ticks_seen
                ).fillna(method=None).sort_index()
                df = df.reindex(sorted(df.index)).ffill()
                st.line_chart(df)
        else:
            st.caption("No belief data recorded yet.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — Personality Evolution
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[2]:
    st.subheader(f"Personality Evolution — {selected_agent}")
    snapshots = all_snapshots(selected_agent)
    if snapshots:
        sample = snapshots[0].get("agent_info", {}).get("personality_coefficients", {})
        all_traits = list(sample.keys())
        selected_traits = st.multiselect("Traits to display", all_traits, default=all_traits[:6])

        pers_over_time = {trait: {} for trait in selected_traits}
        ticks_seen = []
        for s in snapshots:
            t = s["tick"]
            ticks_seen.append(t)
            coeffs = s.get("agent_info", {}).get("personality_coefficients", {})
            for trait in selected_traits:
                if trait in coeffs:
                    pers_over_time[trait][t] = coeffs[trait]

        if pers_over_time:
            df = pd.DataFrame(pers_over_time, index=ticks_seen).ffill().sort_index()
            st.line_chart(df)
    else:
        st.caption("No personality data recorded yet.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — Emotion State
# ═══════════════════════════════════════════════════════════════════════════════
PLUTCHIK_CATS = ["joy", "trust", "anticipation", "surprise", "fear", "sadness", "disgust", "anger"]

def _radar_svg(scores: dict, label: str, size: int = 220) -> str:
    """Render a Plutchik radar chart as inline SVG."""
    n = len(PLUTCHIK_CATS)
    cx, cy, r = size // 2, size // 2, size // 2 - 30
    spoke_pts = [
        (cx + r * math.sin(2 * math.pi * i / n),
         cy - r * math.cos(2 * math.pi * i / n))
        for i in range(n)
    ]
    # grid rings
    rings = ["<circle cx='%d' cy='%d' r='%d' fill='none' stroke='#ccc' stroke-width='0.5'/>" % (cx, cy, int(r * f)) for f in [0.25, 0.5, 0.75, 1.0]]
    spokes = [f"<line x1='{cx}' y1='{cy}' x2='{px:.1f}' y2='{py:.1f}' stroke='#ccc' stroke-width='0.8'/>" for px, py in spoke_pts]
    vals = [scores.get(cat, 0.0) for cat in PLUTCHIK_CATS]
    poly_pts = " ".join(
        f"{cx + r * v * math.sin(2 * math.pi * i / n):.1f},{cy - r * v * math.cos(2 * math.pi * i / n):.1f}"
        for i, v in enumerate(vals)
    )
    polygon = f"<polygon points='{poly_pts}' fill='rgba(99,180,255,0.35)' stroke='#3a9ddd' stroke-width='1.5'/>"
    labels = []
    for i, cat in enumerate(PLUTCHIK_CATS):
        lx = cx + (r + 18) * math.sin(2 * math.pi * i / n)
        ly = cy - (r + 18) * math.cos(2 * math.pi * i / n)
        labels.append(f"<text x='{lx:.1f}' y='{ly:.1f}' text-anchor='middle' dominant-baseline='middle' font-size='9' fill='#555'>{cat}</text>")
    title = f"<text x='{cx}' y='{size - 8}' text-anchor='middle' font-size='10' fill='#333'>{label}</text>"
    body = "\n".join(rings + spokes + [polygon] + labels + [title])
    return f"<svg width='{size}' height='{size}' xmlns='http://www.w3.org/2000/svg'>{body}</svg>"

with tabs[3]:
    st.subheader(f"Emotion State  ·  tick {tick}")
    st.caption("Radar shows Plutchik category share of total emotional memory weight at selected tick.")

    cols = st.columns(len(agent_names))
    for col, aname in zip(cols, agent_names):
        asnap = get_snapshot(aname, tick)
        dist = asnap.get("emotion_distribution", {})
        dom = asnap.get("emotion", {})
        svg = _radar_svg(dist, aname)
        with col:
            st.markdown(f"**{aname}**")
            st.markdown(f"`{dom.get('emotion','—')}` · {dom.get('intensity', 0):.1f}")
            st.markdown(svg, unsafe_allow_html=True)

    st.divider()
    st.subheader("Intensity over time")
    sel_emo_agents = st.multiselect("Agents", agent_names, default=agent_names, key="emo_agents")
    for aname in sel_emo_agents:
        snaps = all_snapshots(aname)
        if not snaps:
            continue
        rows = [{"tick": s["tick"],
                 "emotion": s.get("emotion", {}).get("emotion", "neutral"),
                 "intensity": s.get("emotion", {}).get("intensity", 0.0)}
                for s in snaps]
        df = pd.DataFrame(rows).set_index("tick")
        with st.expander(aname, expanded=False):
            st.line_chart(df["intensity"], height=120)
            st.dataframe(df["emotion"].drop_duplicates(), use_container_width=True)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — Social Graph
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[4]:
    st.subheader(f"Social Graph — {selected_agent}  ·  tick {tick}")
    social = snap.get("agent_info", {}).get("social_circle", {})
    if social:
        lines = ["digraph {", '  rankdir=LR;', f'  "{selected_agent}" [shape=doublecircle];']
        for partner, pinfo in social.items():
            trust = pinfo.get("trust_score", 0)
            dom_emo = pinfo.get("dominant_emotion", {})
            label = max(dom_emo, key=dom_emo.get) if dom_emo else ""
            width = max(1, int(trust * 5))
            lines.append(f'  "{selected_agent}" -> "{partner}" '
                         f'[label="{label}\\n{trust:.2f}" penwidth={width}];')
        lines.append("}")
        st.graphviz_chart("\n".join(lines))
    else:
        st.caption("No social data at this tick.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6 — Activity Log
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[5]:
    st.subheader("Activity Log")
    log = data.get("activity_log", [])
    if log:
        df = pd.DataFrame(log)
        c1, c2, c3 = st.columns(3)
        with c1:
            agents_filter = st.multiselect("By agent", df["by_who"].unique().tolist(),
                                           default=df["by_who"].unique().tolist())
        with c2:
            types_filter = st.multiselect("Type", df["type"].unique().tolist(),
                                          default=df["type"].unique().tolist())
        with c3:
            tick_range = st.slider("Tick range", 0, total_ticks,
                                   (0, total_ticks), key="log_tick")
        filtered = df[
            df["by_who"].isin(agents_filter) &
            df["type"].isin(types_filter) &
            df["timestep"].between(*tick_range)
        ]
        st.dataframe(filtered, use_container_width=True)
    else:
        st.caption("No activity logged.")

    st.subheader("Room Logs")
    room_logs = data.get("room_logs", {})
    if room_logs:
        room = st.selectbox("Room", list(room_logs.keys()))
        st.dataframe(pd.DataFrame(room_logs[room]), use_container_width=True)
    else:
        st.caption("No room logs.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 7 — Memory Log
# ═══════════════════════════════════════════════════════════════════════════════
with tabs[6]:
    st.subheader(f"Memory Log — {selected_agent}")
    mem_log = data["agents"][selected_agent].get("final_memory_log", [])
    if mem_log:
        df = pd.DataFrame(mem_log)
        sort_by = st.selectbox("Sort by", ["importance", "timestep", "embedding_tier"], index=0)
        df = df.sort_values(sort_by, ascending=sort_by == "embedding_tier")
        type_filter = st.multiselect("Type filter", df["type"].unique().tolist(),
                                     default=df["type"].unique().tolist())
        df = df[df["type"].isin(type_filter)]
        st.dataframe(df[["timestep", "content", "importance", "type",
                          "emotion", "belief", "embedding_tier", "recency_score"]],
                     use_container_width=True)
    else:
        st.caption("No memories recorded.")
