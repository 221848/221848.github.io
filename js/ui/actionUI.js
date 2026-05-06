/**
 * ui/actionUI.js – Action selection panel (Attack / Move / Skill) and targeting UI.
 */

import { state, provideInput } from '../state.js';
import { HIGHLIGHT, TARGET, DIR_KEYS, DIRECTIONS } from '../utils/constants.js';
import { renderBoard } from './boardUI.js';
import { getHeroConfig, getSkillConfig, isSkillUsable } from '../heroes/index.js';
import { moveCells, attackCells, reachableCells } from '../board.js';

export function showActionPanel(hero) {
  const panel = document.getElementById('battle-actions-panel');
  if (!panel) return;
  panel.innerHTML = '';
  panel.classList.remove('hidden');

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = `${hero.name} 的行动（${state.actionsRemaining} 次剩余）`;
  panel.appendChild(title);

  const row = document.createElement('div');
  row.className = 'action-buttons';

  const btnAttack = _actionBtn('⚔ 普通攻击', () => provideInput({ type: 'action', action: 'attack' }));
  const btnMove   = _actionBtn('👣 移动',     () => provideInput({ type: 'action', action: 'move'   }));
  const btnSkill  = _actionBtn('✨ 使用技能', () => provideInput({ type: 'action', action: 'skill'  }));

  row.appendChild(btnAttack);
  row.appendChild(btnMove);
  row.appendChild(btnSkill);
  panel.appendChild(row);
}

export function hideActionPanel() {
  const panel = document.getElementById('battle-actions-panel');
  if (panel) panel.classList.add('hidden');
}

/** Show skill selection sub-panel */
export function showSkillPanel(hero) {
  const panel = document.getElementById('battle-actions-panel');
  if (!panel) return;
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = '选择技能：';
  panel.appendChild(title);

  const cfg = getHeroConfig(hero.heroId);
  if (!cfg || cfg.skills.length === 0) {
    panel.appendChild(_text('该英雄暂无主动技能'));
    panel.appendChild(_backBtn());
    return;
  }

  for (const skillCfg of cfg.skills) {
    const rt = hero.skillState[skillCfg.id];
    const usable = isSkillUsable(hero, skillCfg.id, state);

    const skillBtn = document.createElement('button');
    skillBtn.className = 'skill-btn' + (usable.ok ? '' : ' skill-disabled');

    const cdText = rt.currentCooldown > 0 ? ` [CD:${rt.currentCooldown}]` : '';
    const usesText = rt.usesRemaining !== null ? ` [${rt.usesRemaining}次]` : '';
    skillBtn.innerHTML = `
      <span class="skill-name">${skillCfg.name}${cdText}${usesText}</span>
      <span class="skill-desc">${skillCfg.desc}</span>
      ${!usable.ok ? `<span class="skill-reason">${usable.reason}</span>` : ''}
    `;
    if (!usable.ok) {
      skillBtn.disabled = true;
    } else {
      skillBtn.addEventListener('click', () => {
        provideInput({ type: 'action', action: 'skill', skillId: skillCfg.id });
      });
    }
    panel.appendChild(skillBtn);
  }

  panel.appendChild(_backBtn());
}

/** Highlight board cells for move targeting */
export function showMoveHighlights(hero) {
  const cells = moveCells(hero);
  state.highlightCells = cells.map(p => ({ ...p, type: HIGHLIGHT.MOVE }));
  renderBoard();
}

/** Highlight board cells for attack targeting */
export function showAttackHighlights(hero) {
  const cells = attackCells(hero);
  state.highlightCells = cells.map(p => ({ ...p, type: HIGHLIGHT.ATTACK }));
  renderBoard();
}

/** Highlight board cells for skill with DIRECTION target: direction buttons */
export function showDirectionPanel(hero, skillId, onPick) {
  const panel = document.getElementById('battle-actions-panel');
  if (!panel) return;
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = '选择方向：';
  panel.appendChild(title);

  const row = document.createElement('div');
  row.className = 'dir-buttons';

  for (const dirKey of DIR_KEYS) {
    const btn = _actionBtn(DIRECTIONS[dirKey].label, () => onPick(dirKey));
    row.appendChild(btn);
  }
  panel.appendChild(row);
  panel.appendChild(_backBtn());
}

/** For HERO_AND_DEST – show living hero positions as targets */
export function showHeroTargetHighlights(filterFn) {
  const heroes = [state.playerHero, state.computerHero].filter(h => h && h.alive && filterFn(h));
  state.highlightCells = heroes.map(h => ({
    col: h.position.col, row: h.position.row, type: HIGHLIGHT.SKILL_TARGET,
  }));
  renderBoard();
}

/** Show reachable cells for a chosen hero (step 2 of HERO_AND_DEST) */
export function showDestHighlights(hero) {
  const cells = reachableCells(hero, 2);
  state.highlightCells = cells.map(p => ({ ...p, type: HIGHLIGHT.MOVE }));
  renderBoard();
}

export function clearHighlights() {
  state.highlightCells = [];
  renderBoard();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _actionBtn(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function _backBtn() {
  return _actionBtn('← 返回', () => provideInput({ type: 'action', action: 'back' }));
}

function _text(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  return p;
}
