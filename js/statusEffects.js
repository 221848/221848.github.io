/**
 * statusEffects.js – Status effect helpers (stun, etc.)
 */

import { STATUS } from './utils/constants.js';

/** Apply a status effect to a hero instance. */
export function applyStatus(hero, type, duration, source) {
  // If a same-type effect exists, refresh duration
  const existing = hero.statusEffects.find(e => e.type === type);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
  } else {
    hero.statusEffects.push({ type, duration, source });
  }
}

/** Check if hero has a given status */
export function hasStatus(hero, type) {
  return hero.statusEffects.some(e => e.type === type);
}

/** Remove a specific status from a hero */
export function removeStatus(hero, type) {
  hero.statusEffects = hero.statusEffects.filter(e => e.type !== type);
}

/**
 * Tick all status effects on hero (decrement duration, remove expired).
 * Call at ROUND_END.
 */
export function tickStatuses(hero) {
  hero.statusEffects = hero.statusEffects.filter(e => {
    e.duration--;
    return e.duration > 0;
  });
}

/** Human-readable label for a status */
export function statusLabel(effect) {
  switch (effect.type) {
    case STATUS.STUN: return `眩晕(${effect.duration}回合)`;
    default: return effect.type;
  }
}
