/**
 * ui/renderer.js – Top-level renderer: screen switching and partial refresh.
 */

import { state } from '../state.js';
import { renderSidebars } from './sidebarUI.js';
import { renderBoard } from './boardUI.js';
import { loadStats } from '../save.js';
import { ROUND_TYPES } from '../utils/constants.js';

/** Switch the visible screen by element ID suffix */
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const id = 'screen-' + screenId.toLowerCase().replace(/_/g, '-');
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

/** Render round counter in the battle header */
export function renderRoundInfo() {
  const el = document.getElementById('round-info');
  if (!el) return;
  const tag = state.roundType === ROUND_TYPES.EXTRA ? '【额外】'
             : state.roundType === ROUND_TYPES.SOLO  ? '【Solo】'
             : '';
  el.textContent = `第 ${state.roundCount} 回合 ${tag}`.trim();
}

/** Update the actor status bar */
export function renderStatusBar() {
  const el = document.getElementById('status-bar');
  if (!el) return;
  const actor = state.currentActor;
  el.textContent = actor
    ? `当前行动：${actor === 'player' ? '玩家' : '电脑'}`
    : '';
}

/** Full battle screen refresh */
export function renderBattle() {
  renderBoard();
  renderSidebars();
  renderRoundInfo();
  renderStatusBar();
}

/** Render the persistent statistics page */
export function renderStats() {
  const stats = loadStats();
  const container = document.getElementById('stats-content');
  if (!container) return;

  const winRate  = stats.totalGames > 0
    ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0.0';
  const rpsRate  = stats.rpsTotal > 0
    ? ((stats.rpsWins / stats.rpsTotal) * 100).toFixed(1) : '0.0';

  const picks = stats.rpsPicks || {};
  const favPick = Object.entries(picks).sort((a, b) => b[1] - a[1])[0];
  const pickLabels = { rock: '石头', scissors: '剪刀', paper: '布' };

  const heroUsage = stats.heroUsage || {};
  const favHero = Object.entries(heroUsage).sort((a, b) => b[1] - a[1])[0];

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-item-label">总对局</div><div class="stat-item-val">${stats.totalGames}</div></div>
      <div class="stat-item"><div class="stat-item-label">胜场</div><div class="stat-item-val">${stats.wins}</div></div>
      <div class="stat-item"><div class="stat-item-label">胜率</div><div class="stat-item-val">${winRate}%</div></div>
      <div class="stat-item"><div class="stat-item-label">当前连胜</div><div class="stat-item-val">${stats.currentStreak}</div></div>
      <div class="stat-item"><div class="stat-item-label">历史最高连胜</div><div class="stat-item-val">${stats.maxStreak}</div></div>
      <div class="stat-item"><div class="stat-item-label">猜拳总次数</div><div class="stat-item-val">${stats.rpsTotal}</div></div>
      <div class="stat-item"><div class="stat-item-label">猜拳胜率</div><div class="stat-item-val">${rpsRate}%</div></div>
      <div class="stat-item"><div class="stat-item-label">猜拳当前连胜</div><div class="stat-item-val">${stats.rpsCurrentStreak}</div></div>
      <div class="stat-item"><div class="stat-item-label">猜拳历史最高连胜</div><div class="stat-item-val">${stats.rpsMaxStreak}</div></div>
      <div class="stat-item"><div class="stat-item-label">最爱拳型</div><div class="stat-item-val">${favPick ? pickLabels[favPick[0]] + ' ×' + favPick[1] : '—'}</div></div>
      <div class="stat-item"><div class="stat-item-label">石头/剪刀/布</div><div class="stat-item-val">${picks.rock||0} / ${picks.scissors||0} / ${picks.paper||0}</div></div>
      <div class="stat-item"><div class="stat-item-label">最爱英雄</div><div class="stat-item-val">${favHero ? favHero[0] + ' ×' + favHero[1] : '—'}</div></div>
    </div>
  `;
}
