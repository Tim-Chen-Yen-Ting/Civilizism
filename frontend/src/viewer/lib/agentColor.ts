/**
 * Categorical palette, dark-surface steps — validated (dataviz skill's
 * validate_palette.js) against this app's actual --color-bg (#0b0e14):
 * all 8 pass lightness band, chroma floor, CVD adjacent-pair separation,
 * normal-vision floor, and contrast. Order is the CVD-safety mechanism
 * (not cosmetic) — never reorder, never generate a 9th hue.
 * Agent initials are always rendered on the token too (see AgentToken),
 * so identity never rests on color alone past the palette's own floor.
 */
const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/**
 * `orderedAgentIds` should be a stable order for the whole run (e.g.
 * Object.keys(run.agents)) so a given agent keeps the same color across
 * every render, not a hash — hashing can't preserve the palette's
 * validated adjacency order.
 */
export function getAgentColor(agentId: string, orderedAgentIds: string[]): string {
  const idx = orderedAgentIds.indexOf(agentId);
  return CATEGORICAL_DARK[(idx < 0 ? 0 : idx) % CATEGORICAL_DARK.length];
}

export function agentInitials(agentId: string): string {
  const parts = agentId.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
