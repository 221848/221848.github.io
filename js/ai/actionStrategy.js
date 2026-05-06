/**
 * ai/actionStrategy.js – Greedy action strategy for computer AI.
 *
 * Priority:
 * 1. Has stun → skip
 * 2. Skill can kill enemy → use it
 * 3. Normal attack can kill enemy (adjacent) → attack
 * 4. Usable damage skill exists → use highest-damage skill
 * 5. Enemy is adjacent → attack
 * 6. Move toward enemy (BFS)
 * 7. Skip (no action available)
 */

import { state } from '../state.js';
import { heroAt, moveCells, attackCells, reachableCells, enemyInDirection } from '../board.js';
import { hasStatus } from '../statusEffects.js';
import { STATUS, DIR_KEYS, DIRECTIONS, TARGET } from '../utils/constants.js';
import { getHeroConfig, getSkillConfig, isSkillUsable } from '../heroes/index.js';
import { manhattan, adjacentCells, inBounds, bfsReachable } from '../utils/helpers.js';
import { calcActionsForHero } from '../actions.js';

/** Decide a single action for the computer hero. Returns an action descriptor. */
export function decideAction(hero, enemyHero) {
  // 1. Stunned → skip
  if (hasStatus(hero, STATUS.STUN)) {
    return { type: 'skip', reason: 'stunned' };
  }

  const adjacent = attackCells(hero);
  const canAttackEnemy = adjacent.some(p => {
    const t = heroAt(p.col, p.row);
    return t && t !== hero && t.alive;
  });

  // Check skills
  const cfg = getHeroConfig(hero.heroId);
  const usableSkills = cfg.skills.filter(s => isSkillUsable(hero, s.id, state).ok);

  // 2. Skill that could kill enemy
  const killSkill = findKillSkill(hero, enemyHero, usableSkills);
  if (killSkill) {
    return { type: 'skill', skillId: killSkill.skillId, target: killSkill.target };
  }

  // 3. Adjacent → normal attack kills
  if (canAttackEnemy && hero.atk >= enemyHero.hp) {
    const t = adjacent.find(p => heroAt(p.col, p.row) === enemyHero);
    if (t) return { type: 'attack', col: t.col, row: t.row };
  }

  // 4. Best damage skill
  const dmgSkill = findBestDamageSkill(hero, enemyHero, usableSkills);
  if (dmgSkill) {
    return { type: 'skill', skillId: dmgSkill.skillId, target: dmgSkill.target };
  }

  // 5. Adjacent attack
  if (canAttackEnemy) {
    const t = adjacent.find(p => heroAt(p.col, p.row) === enemyHero);
    if (t) return { type: 'attack', col: t.col, row: t.row };
  }

  // 6. Move toward enemy
  const moveTarget = moveToward(hero, enemyHero);
  if (moveTarget) return { type: 'move', col: moveTarget.col, row: moveTarget.row };

  // 7. Skip
  return { type: 'skip', reason: 'no action' };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function findKillSkill(hero, enemy, usableSkills) {
  for (const s of usableSkills) {
    const result = estimateSkillDamage(hero, enemy, s);
    if (result !== null && result.damage >= enemy.hp) return { skillId: s.id, target: result.target };
  }
  return null;
}

function findBestDamageSkill(hero, enemy, usableSkills) {
  let best = null;
  for (const s of usableSkills) {
    const result = estimateSkillDamage(hero, enemy, s);
    if (result !== null && result.damage > 0) {
      if (!best || result.damage > best.damage) best = { skillId: s.id, target: result.target, damage: result.damage };
    }
  }
  return best;
}

function estimateSkillDamage(hero, enemy, skillCfg) {
  switch (skillCfg.id) {
    case 'ice_dragon': {
      // Pick direction toward enemy for best hit
      for (const dirKey of DIR_KEYS) {
        const { dc, dr } = DIRECTIONS[dirKey];
        let c = hero.position.col + dc, r = hero.position.row + dr;
        while (inBounds(c, r)) {
          if (c === enemy.position.col && r === enemy.position.row) {
            return { target: dirKey, damage: 4 };
          }
          c += dc; r += dr;
        }
      }
      return { target: DIR_KEYS[0], damage: 0 };
    }
    case 'detonate_array': {
      if (state.spellArrays.length === 0) return null;
      // Check if enemy is in array
      const sa = state.spellArrays[0];
      const inArray = [sa.pos1, sa.pos2].some(p => p.col === enemy.position.col && p.row === enemy.position.row);
      return { target: null, damage: inArray ? 40 : 0 };
    }
    case 'summon_array': {
      // AI prefers direction toward enemy
      for (const dirKey of DIR_KEYS) {
        const { dc, dr } = DIRECTIONS[dirKey];
        const c1 = hero.position.col + dc, r1 = hero.position.row + dr;
        const c2 = c1 + dc, r2 = r1 + dr;
        if (!inBounds(c1, r1) || !inBounds(c2, r2)) continue;
        if ((c1 === enemy.position.col && r1 === enemy.position.row) ||
            (c2 === enemy.position.col && r2 === enemy.position.row)) {
          return { target: dirKey, damage: 1 }; // low priority, just summon
        }
      }
      return { target: DIR_KEYS[0], damage: 0 };
    }
    case 'star_absorption': {
      for (const dirKey of DIR_KEYS) {
        const found = enemyInDirection(hero, dirKey, 2);
        if (found && found === enemy) return { target: dirKey, damage: hero.atk };
      }
      return null;
    }
    case 'force_move': {
      // Move enemy far away or self toward enemy – simplistically skip for now
      return null;
    }
    case 'brave_game': {
      return { target: enemy, damage: 0 }; // start solo round
    }
    case 'ganlu': {
      return { target: null, damage: 0 }; // healing
    }
    default:
      return null;
  }
}

function moveToward(hero, enemy) {
  const cells = moveCells(hero);
  if (cells.length === 0) return null;
  // BFS toward enemy
  cells.sort((a, b) =>
    manhattan(a, enemy.position) - manhattan(b, enemy.position)
  );
  return cells[0];
}

/** Full AI turn: decide and return one or more actions (Berserker multi-action) */
export function decideAllActions(hero, enemyHero) {
  const count = calcActionsForHero(hero);
  const actions = [];
  // For simplicity, AI decides each action independently (state is mutated between calls by main loop)
  // Just return the first decision; main loop will call again for remaining
  actions.push(decideAction(hero, enemyHero));
  return actions;
}
