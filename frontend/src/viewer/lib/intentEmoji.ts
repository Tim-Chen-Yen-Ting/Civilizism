import type { AgentSnapshot } from '../../types/run';

/** Exact 12-value Literal from sysMod/central_llm.py's AgentAction.intent (central_llm.py:155), confirmed via source read. */
export type AgentIntent =
  | 'chat'
  | 'connect'
  | 'work'
  | 'create'
  | 'explore'
  | 'rest'
  | 'avoid'
  | 'eat'
  | 'consume'
  | 'prepare'
  | 'tend'
  | 'cook';

export const INTENT_EMOJI: Record<AgentIntent, string> = {
  chat: '💬',
  connect: '🤝',
  work: '🛠️',
  create: '🎨',
  explore: '🧭',
  rest: '😴',
  avoid: '🚫',
  eat: '🍽️',
  consume: '🥤',
  prepare: '🍳',
  tend: '🌱',
  cook: '👩‍🍳',
};

function isKnownIntent(value: string): value is AgentIntent {
  return value in INTENT_EMOJI;
}

/**
 * activity_log entries do not carry `intent` (confirmed empty across every
 * sample). The only source is last_decision.intent, with the last entry of
 * recent_intents as a fallback for a tick with no last_decision yet (rare:
 * before an agent's first decision).
 */
export function currentIntent(snapshot: AgentSnapshot | null): string | null {
  if (!snapshot) return null;
  if (snapshot.last_decision?.intent) return snapshot.last_decision.intent;
  const recent = snapshot.recent_intents;
  if (recent && recent.length > 0) return recent[recent.length - 1];
  return null;
}

export function intentEmoji(intent: string | null): string | null {
  if (!intent) return null;
  return isKnownIntent(intent) ? INTENT_EMOJI[intent] : null;
}
