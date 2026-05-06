import { BOARD_COLS, BOARD_ROWS, DIRECTIONS, DIR_KEYS } from './constants.js';

/** Clamp a number between min and max */
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** Check if (col, row) is within board bounds */
export function inBounds(col, row) {
  return col >= 0 && col < BOARD_COLS && row >= 1 && row <= BOARD_ROWS;
}

/** Convert col index to letter label */
export function colLabel(col) { return String.fromCharCode(65 + col); }

/** Human-readable position label, e.g. "A1" */
export function posLabel(col, row) { return `${colLabel(col)}${row}`; }

/** Return up to 4 adjacent cells within bounds */
export function adjacentCells(col, row) {
  return DIR_KEYS
    .map(k => ({ col: col + DIRECTIONS[k].dc, row: row + DIRECTIONS[k].dr }))
    .filter(p => inBounds(p.col, p.row));
}

/** Manhattan distance between two positions */
export function manhattan(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/** Promise-based sleep */
export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Deep clone a plain object */
export function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/** BFS reachable cells from (col, row) within maxSteps, avoiding blocked positions.
 *  blockedFn(col, row) → true if the cell cannot be entered.
 *  Returns list of {col, row} reachable (not including start). */
export function bfsReachable(col, row, maxSteps, blockedFn) {
  const visited = new Set([`${col},${row}`]);
  const queue = [{ col, row, steps: 0 }];
  const result = [];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.steps > 0) result.push({ col: cur.col, row: cur.row });
    if (cur.steps >= maxSteps) continue;
    for (const adj of adjacentCells(cur.col, cur.row)) {
      const key = `${adj.col},${adj.row}`;
      if (!visited.has(key) && !blockedFn(adj.col, adj.row)) {
        visited.add(key);
        queue.push({ col: adj.col, row: adj.row, steps: cur.steps + 1 });
      }
    }
  }
  return result;
}

/** Get all cells along a direction ray from (col, row).
 *  Does NOT include starting cell. Stops at board edge. */
export function directionRay(col, row, dirKey, maxDist = 999) {
  const { dc, dr } = DIRECTIONS[dirKey];
  const cells = [];
  let c = col + dc, r = row + dr, d = 0;
  while (inBounds(c, r) && d < maxDist) {
    cells.push({ col: c, row: r });
    c += dc; r += dr; d++;
  }
  return cells;
}

/** Get all cells within a square of halfSize around (col, row), including centre */
export function squareArea(col, row, halfSize) {
  const cells = [];
  for (let dc = -halfSize; dc <= halfSize; dc++) {
    for (let dr = -halfSize; dr <= halfSize; dr++) {
      const c = col + dc, r = row + dr;
      if (inBounds(c, r)) cells.push({ col: c, row: r });
    }
  }
  return cells;
}
