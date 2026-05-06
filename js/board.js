/**
 * board.js – Board data queries (pure, no state mutation).
 */

import { state } from './state.js';
import { inBounds, adjacentCells, directionRay, bfsReachable } from './utils/helpers.js';
import { DIRECTIONS } from './utils/constants.js';

/** Return the hero instance occupying (col, row), or null. */
export function heroAt(col, row) {
  for (const h of [state.playerHero, state.computerHero]) {
    if (h && h.alive && h.position.col === col && h.position.row === row) return h;
  }
  return null;
}

/** True if (col, row) is occupied by a living hero OR out of bounds. */
export function isBlocked(col, row) {
  if (!inBounds(col, row)) return true;
  return heroAt(col, row) !== null;
}

/** True if (col, row) is occupied by a living hero.
 *  Optionally pass excludeHero to ignore that hero (useful when computing movement for that hero). */
export function isOccupied(col, row, excludeHero = null) {
  for (const h of [state.playerHero, state.computerHero]) {
    if (!h || !h.alive) continue;
    if (excludeHero && h === excludeHero) continue;
    if (h.position.col === col && h.position.row === row) return true;
  }
  return false;
}

/** Get all living heroes */
export function livingHeroes() {
  return [state.playerHero, state.computerHero].filter(h => h && h.alive);
}

/** Adjacent empty cells for a hero (normal movement) */
export function moveCells(hero) {
  return adjacentCells(hero.position.col, hero.position.row)
    .filter(p => !isOccupied(p.col, p.row, hero));
}

/** Adjacent enemy cells for a hero (normal attack) */
export function attackCells(hero) {
  return adjacentCells(hero.position.col, hero.position.row)
    .filter(p => {
      const target = heroAt(p.col, p.row);
      return target && target !== hero && target.alive;
    });
}

/** Cells reachable in up to maxSteps by a given hero (BFS, can't pass through heroes) */
export function reachableCells(hero, maxSteps) {
  return bfsReachable(
    hero.position.col, hero.position.row, maxSteps,
    (c, r) => isOccupied(c, r, hero),
  );
}

/** All living heroes as potential targets */
export function heroTargetCells(filterFn) {
  return livingHeroes()
    .filter(filterFn)
    .map(h => ({ col: h.position.col, row: h.position.row }));
}

/** Find enemy hero in a direction within maxDist, returns hero or null */
export function enemyInDirection(caster, dirKey, maxDist) {
  const cells = directionRay(caster.position.col, caster.position.row, dirKey, maxDist);
  for (const cell of cells) {
    const h = heroAt(cell.col, cell.row);
    if (h && h !== caster) return h;
  }
  return null;
}

/** Return adjacent empty positions around a hero (for pull-to-adjacent). */
export function adjacentEmptyPositions(hero) {
  return adjacentCells(hero.position.col, hero.position.row)
    .filter(p => !isOccupied(p.col, p.row));
}

/** Check if a spell array occupies the given cell */
export function spellArrayAt(col, row) {
  return state.spellArrays.find(
    sa => (sa.pos1.col === col && sa.pos1.row === row) ||
          (sa.pos2.col === col && sa.pos2.row === row)
  ) || null;
}

/** Get spell array cells as a flat list */
export function spellArrayCells(sa) {
  return [sa.pos1, sa.pos2];
}
