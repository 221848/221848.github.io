/**
 * ui/boardUI.js – Board rendering and highlight management
 */

import { state, provideInput } from '../state.js';
import { BOARD_COLS, BOARD_ROWS, COL_LABELS, HIGHLIGHT } from '../utils/constants.js';
import { HERO_COLORS, HERO_ABBR } from '../assets.js';
import { statusLabel } from '../statusEffects.js';

let _boardClickInit = false;

/** Build the initial board grid and wire click handler (call each battle start) */
export function buildBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';
  _boardClickInit = false;

  // Generate cells: row 8 at top → row 1 at bottom
  for (let row = BOARD_ROWS; row >= 1; row--) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = document.createElement('div');
      cell.className = `board-cell ${(col + row) % 2 === 0 ? 'cell-light' : 'cell-dark'}`;
      cell.dataset.col = col;
      cell.dataset.row = row;
      board.appendChild(cell);
    }
  }

  // Row labels (numbers 8 down to 1 on the right of the board)
  const rowLabelEl = document.getElementById('row-labels');
  if (rowLabelEl) {
    rowLabelEl.innerHTML = '';
    for (let row = BOARD_ROWS; row >= 1; row--) {
      const lbl = document.createElement('div');
      lbl.className = 'row-label-item';
      lbl.textContent = row;
      rowLabelEl.appendChild(lbl);
    }
  }

  // Single click handler on the board (delegated)
  if (!_boardClickInit) {
    _boardClickInit = true;
    board.addEventListener('click', e => {
      const cell = e.target.closest('.board-cell');
      if (cell) {
        provideInput({
          type: 'cell',
          col: parseInt(cell.dataset.col),
          row: parseInt(cell.dataset.row),
        });
      }
    });
  }

  renderBoard();
}

/** Re-render the entire board based on current state */
export function renderBoard() {
  const board = document.getElementById('board');
  if (!board) return;

  board.querySelectorAll('.board-cell').forEach(cell => {
    const col = parseInt(cell.dataset.col);
    const row = parseInt(cell.dataset.row);

    // Reset to base class
    cell.className = `board-cell ${(col + row) % 2 === 0 ? 'cell-light' : 'cell-dark'}`;
    cell.innerHTML = '';
  });

  // Spell array overlays
  for (const sa of state.spellArrays) {
    _addCellClass(sa.pos1.col, sa.pos1.row, 'hl-spell');
    _addCellClass(sa.pos2.col, sa.pos2.row, 'hl-spell');
  }

  // Action highlights
  for (const h of state.highlightCells) {
    const cls = {
      [HIGHLIGHT.MOVE]:         'hl-move',
      [HIGHLIGHT.ATTACK]:       'hl-attack',
      [HIGHLIGHT.SKILL_TARGET]: 'hl-skill',
      [HIGHLIGHT.SELECTED]:     'hl-selected',
      [HIGHLIGHT.BLINK]:        'hl-blink',
    }[h.type] || 'hl-generic';
    _addCellClass(h.col, h.row, cls);
  }

  // Hero avatars
  for (const hero of [state.playerHero, state.computerHero]) {
    if (!hero || !hero.alive) continue;
    const cell = _getCell(hero.position.col, hero.position.row);
    if (cell) {
      cell.appendChild(_buildHeroAvatar(hero));
    }
  }

  // Column labels at the very bottom row
  for (let col = 0; col < BOARD_COLS; col++) {
    const cell = _getCell(col, 1);
    if (cell) {
      const lbl = document.createElement('span');
      lbl.className = 'col-label';
      lbl.textContent = COL_LABELS[col];
      cell.appendChild(lbl);
    }
  }
}

function _buildHeroAvatar(hero) {
  const wrap = document.createElement('div');
  wrap.className = `hero-avatar hero-${hero.side}`;
  wrap.dataset.heroSide = hero.side;

  const circle = document.createElement('div');
  circle.className = 'hero-circle';
  circle.style.background = HERO_COLORS[hero.heroId] || '#555';
  circle.textContent = HERO_ABBR[hero.heroId] || hero.name[0];

  const hpBar = document.createElement('div');
  hpBar.className = 'hero-hp-bar';
  const hpFill = document.createElement('div');
  hpFill.className = 'hero-hp-fill';
  hpFill.style.width = `${Math.max(0, (hero.hp / hero.maxHp) * 100)}%`;
  hpBar.appendChild(hpFill);

  const hpText = document.createElement('div');
  hpText.className = 'hero-hp-text';
  hpText.textContent = `${hero.hp}/${hero.maxHp}`;

  const statusWrap = document.createElement('div');
  statusWrap.className = 'hero-status-icons';
  for (const eff of hero.statusEffects) {
    const icon = document.createElement('span');
    icon.className = 'status-icon';
    icon.title = statusLabel(eff);
    icon.textContent = eff.type === 'stun' ? '💫' : '⚠';
    statusWrap.appendChild(icon);
  }

  wrap.appendChild(circle);
  wrap.appendChild(hpBar);
  wrap.appendChild(hpText);
  wrap.appendChild(statusWrap);
  return wrap;
}

function _getCell(col, row) {
  return document.querySelector(`.board-cell[data-col="${col}"][data-row="${row}"]`);
}

function _addCellClass(col, row, cls) {
  const cell = _getCell(col, row);
  if (cell) cell.classList.add(cls);
}

/** Animate a blink on a cell (AI action preview) */
export function blinkCell(col, row) {
  const cell = _getCell(col, row);
  if (!cell) return;
  cell.classList.add('hl-blink');
  setTimeout(() => cell.classList.remove('hl-blink'), 600);
}
