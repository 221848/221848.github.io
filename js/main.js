/**
 * main.js – Entry point and async game state-machine loop.
 *
 * Architecture:
 *  - awaitInput() / provideInput() decouple UI events from game logic.
 *  - SaveExitSignal is thrown when the save-and-exit button is pressed mid-battle.
 *  - All battle state lives in state.js (serialisable for save/load).
 */

import { state, awaitInput, provideInput, heroOf, opponentSide, clearInputQueue } from './state.js';
import { HERO_LIST, createHeroInstance, getSkillConfig } from './heroes/index.js';
import { determineWinner } from './rps.js';
import {
  executeNormalAttack, executeMove, executeSkill,
  processRoundEnd, processKapuThreshold, updateBerserkerStreak,
  calcActionsForHero,
} from './actions.js';
import { hasStatus, removeStatus } from './statusEffects.js';
import { STATUS, TARGET, DIR_KEYS, DIRECTIONS, ROUND_TYPES } from './utils/constants.js';
import { sleep } from './utils/helpers.js';
import { aiController } from './ai/index.js';
import { decideAction } from './ai/actionStrategy.js';
import { heroAt, moveCells, attackCells, reachableCells, livingHeroes } from './board.js';
import { saveGame, deleteSave, hasSave, loadGame, recordMatchEnd } from './save.js';

// UI modules
import { buildBoard, renderBoard, blinkCell } from './ui/boardUI.js';
import { showRpsPanel, hideRpsPanel, showRpsResult } from './ui/rpsUI.js';
import {
  showActionPanel, hideActionPanel, showSkillPanel,
  showMoveHighlights, showAttackHighlights,
  showHeroTargetHighlights, showDestHighlights, clearHighlights,
} from './ui/actionUI.js';
import { buildHeroSelectScreen } from './ui/heroSelectUI.js';
import { renderSidebars, initSidebarToggles } from './ui/sidebarUI.js';
import { showFloatMsg, showFloatMsgAsync } from './ui/floatMsgUI.js';
import { addLogEntry, clearLog } from './ui/logUI.js';
import {
  renderBattle, renderRoundInfo, renderStatusBar,
  renderStats, showScreen,
} from './ui/renderer.js';

// ── Save-Exit signal ───────────────────────────────────────────────────────

class SaveExitSignal extends Error {
  constructor() { super('save-exit'); this.name = 'SaveExitSignal'; }
}

/** Await input, but throw SaveExitSignal if save-exit was pressed. */
async function gameInput() {
  const input = await awaitInput();
  if (input.type === 'save_exit') throw new SaveExitSignal();
  return input;
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggles();

  document.getElementById('btn-save-exit')?.addEventListener('click', () => {
    // Round counter is already incremented at round start; subtract 1 before
    // saving so reloading and re-incrementing lands back on the same round.
    state.roundCount = Math.max(0, state.roundCount - 1);
    saveGame();
    provideInput({ type: 'save_exit' });
  });

  // Clicking a hero avatar on the board switches sidebar view
  document.getElementById('board')?.addEventListener('click', e => {
    const avatar = e.target.closest('.hero-avatar');
    if (avatar?.dataset.heroSide) {
      state.viewingHeroSide = avatar.dataset.heroSide;
      renderSidebars();
    }
  });

  gameFlow();
});

// ── Top-level game flow ────────────────────────────────────────────────────

async function gameFlow() {
  while (true) {
    showScreen('main-menu');
    setupMainMenuButtons();
    clearInputQueue();

    const menuInput = await awaitInput();

    if (menuInput.action === 'stats') {
      showScreen('stats');
      renderStats();
      await awaitInput();   // wait for back button
      continue;
    }

    if (menuInput.action === 'continue' && hasSave()) {
      if (!loadGame()) continue;
      await runBattle(false /* don't re-init state */);
      continue;
    }

    if (menuInput.action === 'new') {
      // ── Hero select ───────────────────────────────────────────────────
      showScreen('hero-select');
      clearInputQueue();
      buildHeroSelectScreen();

      const heroInput = await awaitInput();
      const playerHeroId = heroInput.heroId;

      const others = HERO_LIST.filter(h => h.id !== playerHeroId);
      const cpuPool = others.length ? others : HERO_LIST;
      const computerHeroId = cpuPool[Math.floor(Math.random() * cpuPool.length)].id;

      // Initialise game state
      Object.assign(state, {
        playerHero:        createHeroInstance(playerHeroId,   'player',   { col: 0, row: 1 }),
        computerHero:      createHeroInstance(computerHeroId, 'computer', { col: 6, row: 8 }),
        roundCount:        0,
        spellArrays:       [],
        _spellArrayIdSeq:  0,
        extraRounds:       [],
        soloActive:        false,
        soloRoundsLeft:    0,
        battleRpsTotal:    0,
        battleRpsWins:     0,
        roundType:         ROUND_TYPES.NORMAL,
        currentActor:      null,
        highlightCells:    [],
        screen:            'BATTLE',
      });

      clearLog();
      addLogEntry(`玩家：${state.playerHero.name}  VS  电脑：${state.computerHero.name}`);

      await runBattle(true);
    }
  }
}

function setupMainMenuButtons() {
  const has = hasSave();
  document.getElementById('btn-continue')?.classList.toggle('hidden', !has);
  document.getElementById('btn-delete-save')?.classList.toggle('hidden', !has);

  document.getElementById('btn-new-game').onclick     = () => provideInput({ type: 'menu', action: 'new'      });
  document.getElementById('btn-continue').onclick     = () => provideInput({ type: 'menu', action: 'continue' });
  document.getElementById('btn-stats').onclick        = () => provideInput({ type: 'menu', action: 'stats'    });
  document.getElementById('btn-delete-save').onclick  = () => {
    deleteSave();
    document.getElementById('btn-continue')?.classList.add('hidden');
    document.getElementById('btn-delete-save')?.classList.add('hidden');
  };
  document.getElementById('btn-stats-back').onclick   = () => provideInput({ type: 'menu', action: 'back'     });
}

// ── Battle runner ──────────────────────────────────────────────────────────

async function runBattle(initBoard) {
  showScreen('battle');
  buildBoard();   // always build – safe to call multiple times, needed after page reload
  renderBattle();

  try {
    const won = await battleLoop();
    const won2 = typeof won === 'boolean' ? won : (won === 'player');
    recordMatchEnd(won2, state.battleRpsTotal, state.battleRpsWins,
      state.playerHero?.heroId, []);
    deleteSave();
    await handleGameOver(won2 ? 'player' : 'computer');
  } catch (e) {
    if (e instanceof SaveExitSignal) {
      // Game was saved; return to main menu silently
      return;
    }
    throw e;
  }
}

// ── Battle loop ────────────────────────────────────────────────────────────

async function battleLoop() {
  while (true) {
    // ── Pending extra rounds ──────────────────────────────────────────
    if (state.extraRounds.length > 0) {
      const { ownerSide } = state.extraRounds.shift();
      state.roundCount++;
      state.roundType = ROUND_TYPES.EXTRA;
      renderRoundInfo();
      await showFloatMsgAsync(`第 ${state.roundCount} 回合【额外回合】`, 1000);
      addLogEntry(`\n=== 第 ${state.roundCount} 回合 [额外 - ${heroOf(ownerSide).name}] ===`);
      await doActionPhase(ownerSide);
      const g = await doRoundEnd();
      if (g) return g === 'player';
      continue;
    }

    // ── Pending solo rounds ───────────────────────────────────────────
    if (state.soloActive && state.soloRoundsLeft > 0) {
      await doSoloRound();
      const g = checkWin();
      if (g) return g === 'player';
      if (state.soloRoundsLeft <= 0) state.soloActive = false;
      continue;
    }
    if (state.soloActive) state.soloActive = false;

    // ── Normal round ──────────────────────────────────────────────────
    state.roundCount++;
    state.roundType = ROUND_TYPES.NORMAL;
    renderRoundInfo();
    await showFloatMsgAsync(`第 ${state.roundCount} 回合`, 900);
    addLogEntry(`\n=== 第 ${state.roundCount} 回合 ===`);

    // Round-start passives
    for (const h of livingHeroes()) processKapuThreshold(h);
    renderSidebars();

    // RPS
    const rpsWinner = await doRpsPhase();
    state.rpsWinner   = rpsWinner;
    state.currentActor = rpsWinner;
    renderStatusBar();

    // Update berserker streaks
    updateBerserkerStreak('player',   rpsWinner === 'player');
    updateBerserkerStreak('computer', rpsWinner === 'computer');

    // Action
    await doActionPhase(rpsWinner);

    // Round end
    const g = await doRoundEnd();
    if (g) return g === 'player';
  }
}

// ── RPS phase ──────────────────────────────────────────────────────────────

async function doRpsPhase() {
  while (true) {
    showRpsPanel(true);
    hideActionPanel();
    clearHighlights();
    renderBoard();

    const input = await gameInput();
    if (input.type !== 'rps') continue;

    const pc = input.choice;
    const cc = aiController.pickRps();

    showRpsResult(pc, cc, 'pending');
    await sleep(350);

    const result = determineWinner(pc, cc);
    showRpsResult(pc, cc, result);
    await sleep(500);

    if (result === 'tie') {
      await showFloatMsgAsync('平局，重新猜拳！', 900);
      addLogEntry(`猜拳：${rlbl(pc)} vs ${rlbl(cc)} → 平局`);
      continue;
    }

    state.battleRpsTotal++;
    if (result === 'player') state.battleRpsWins++;

    await showFloatMsgAsync(
      result === 'player' ? '猜拳胜利！请选择行动' : '猜拳失败，对手行动中...',
      1000,
    );
    addLogEntry(`猜拳：${rlbl(pc)} vs ${rlbl(cc)} → ${result === 'player' ? '玩家胜' : '电脑胜'}`);
    hideRpsPanel();
    return result;
  }
}

function rlbl(c) { return { rock:'石头', scissors:'剪刀', paper:'布' }[c] || c; }

// ── Solo phase ─────────────────────────────────────────────────────────────

async function doSoloRound() {
  state.roundCount++;
  state.roundType = ROUND_TYPES.SOLO;
  renderRoundInfo();
  const idx = 5 - state.soloRoundsLeft + 1;
  await showFloatMsgAsync(`Solo ${idx}/5`, 800);
  addLogEntry(`--- Solo ${idx}/5 ---`);

  // RPS (ties don't count)
  let rpsResult;
  while (true) {
    showRpsPanel(true);
    const input = await gameInput();
    if (input.type !== 'rps') continue;
    const pc = input.choice, cc = aiController.pickRps();
    showRpsResult(pc, cc, 'pending');
    await sleep(300);
    const res = determineWinner(pc, cc);
    showRpsResult(pc, cc, res);
    await sleep(400);
    if (res === 'tie') { await showFloatMsgAsync('平局，继续！', 600); continue; }
    rpsResult = res;
    addLogEntry(`Solo猜拳 → ${res === 'player' ? '玩家' : '电脑'}赢`);
    break;
  }
  hideRpsPanel();

  state.battleRpsTotal++;
  if (rpsResult === 'player') state.battleRpsWins++;

  const soloOwnerWon = (rpsResult === state.soloOwnerSide);
  if (soloOwnerWon) {
    state.currentActor = state.soloOwnerSide;
    renderStatusBar();
    await showFloatMsgAsync(`${heroOf(state.soloOwnerSide).name} 行动！`, 800);
    await doActionPhase(state.soloOwnerSide);
  } else {
    state.currentActor = null;
    renderStatusBar();
    const ownerName = heroOf(state.soloOwnerSide).name;
    await showFloatMsgAsync(`${ownerName} Solo失败，跳过！`, 900);
    addLogEntry(`${ownerName} Solo失败，跳过`);
  }

  state.soloRoundsLeft--;
  if (state.soloRoundsLeft <= 0) {
    showFloatMsg('勇敢者的游戏结束！');
    addLogEntry('勇敢者的游戏结束！');
  }

  await doRoundEnd();
}

// ── Action phase ───────────────────────────────────────────────────────────

async function doActionPhase(actorSide) {
  const actor = heroOf(actorSide);
  if (!actor?.alive) return;

  // Stun
  if (hasStatus(actor, STATUS.STUN)) {
    removeStatus(actor, STATUS.STUN);
    const m = `${actor.name} 因眩晕跳过行动`;
    addLogEntry(m); showFloatMsg(m);
    renderBattle();
    await sleep(900);
    return;
  }

  const total = calcActionsForHero(actor);
  state.actionsRemaining = total;
  renderSidebars();

  for (let i = 0; i < total; i++) {
    if (!actor.alive || state.soloActive) break;
    state.actionsRemaining = total - i;
    renderSidebars();

    if (actorSide === 'player') {
      await doPlayerTurn(actor);
    } else {
      await doComputerTurn(actor, heroOf(opponentSide(actorSide)));
    }
    if (checkWin()) break;
  }

  state.actionsRemaining = 0;
  state.currentActor = null;
  renderBattle();
}

// ── Player turn ────────────────────────────────────────────────────────────

async function doPlayerTurn(actor) {
  while (true) {
    showActionPanel(actor);
    clearHighlights();
    renderBoard();

    const input = await gameInput();
    if (input.type !== 'action') continue;

    if (input.action === 'attack') {
      const done = await doAttack(actor); if (done) return; continue;
    }
    if (input.action === 'move') {
      const done = await doMove(actor); if (done) return; continue;
    }
    if (input.action === 'skill') {
      const done = await doSkill(actor);
      if (done !== false) return;
      continue;
    }
  }
}

async function doAttack(actor) {
  const targets = attackCells(actor);
  if (targets.length === 0) {
    // Air attack option
    hideActionPanel();
    const panel = document.getElementById('battle-actions-panel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.innerHTML = `<div class="panel-title">附近无敌人</div>
        <div class="action-buttons">
          <button class="action-btn" id="ba-air">空放普攻</button>
          <button class="action-btn" id="ba-back">← 返回</button>
        </div>`;
      document.getElementById('ba-air').onclick  = () => provideInput({ type: 'action', action: 'air' });
      document.getElementById('ba-back').onclick = () => provideInput({ type: 'action', action: 'back' });
    }
    const sub = await gameInput();
    if (sub.action === 'air') { addLogEntry(`${actor.name} 空放普攻`); return true; }
    return false;
  }

  showAttackHighlights(actor);

  const atkPanel = document.getElementById('battle-actions-panel');
  if (atkPanel) {
    atkPanel.innerHTML = `<div class="panel-title">⚔ 点击高亮格攻击</div>
      <div class="action-buttons">
        <button class="action-btn" id="ba-atk-cancel">← 取消</button>
      </div>`;
    atkPanel.classList.remove('hidden');
    document.getElementById('ba-atk-cancel').onclick =
      () => provideInput({ type: 'action', action: 'back' });
  }
  renderBoard();

  while (true) {
    const input = await gameInput();
    if (input.type === 'cell' && targets.some(t => t.col === input.col && t.row === input.row)) {
      clearHighlights();
      executeNormalAttack(actor, input.col, input.row);
      renderBattle(); await sleep(500);
      return true;
    }
    if (input.type === 'action') { clearHighlights(); return false; }
  }
}

async function doMove(actor) {
  const cells = moveCells(actor);
  if (!cells.length) { showFloatMsg('没有可移动的格子'); await sleep(600); return false; }

  showMoveHighlights(actor);

  const mvPanel = document.getElementById('battle-actions-panel');
  if (mvPanel) {
    mvPanel.innerHTML = `<div class="panel-title">👣 点击高亮格移动</div>
      <div class="action-buttons">
        <button class="action-btn" id="ba-mv-cancel">← 取消</button>
      </div>`;
    mvPanel.classList.remove('hidden');
    document.getElementById('ba-mv-cancel').onclick =
      () => provideInput({ type: 'action', action: 'back' });
  }
  renderBoard();

  while (true) {
    const input = await gameInput();
    if (input.type === 'cell' && cells.some(c => c.col === input.col && c.row === input.row)) {
      clearHighlights();
      executeMove(actor, input.col, input.row);
      renderBattle(); await sleep(350);
      return true;
    }
    if (input.type === 'action') { clearHighlights(); return false; }
  }
}

async function doSkill(actor) {
  showSkillPanel(actor);

  while (true) {
    const input = await gameInput();
    if (input.type !== 'action') continue;
    if (input.action === 'back') return false;
    if (input.action !== 'skill' || !input.skillId) continue;

    const cfg = getSkillConfig(actor.heroId, input.skillId);
    if (!cfg) continue;

    let target = null;
    if (cfg.targetType === TARGET.NONE || cfg.targetType === TARGET.SELF) {
      target = actor;
    } else if (cfg.targetType === TARGET.DIRECTION) {
      target = await pickDir();
      if (target === null) { showSkillPanel(actor); continue; }
    } else if (cfg.targetType === TARGET.ENEMY) {
      const e = heroOf(opponentSide(actor.side));
      if (!e?.alive) { showSkillPanel(actor); continue; }
      target = e;
    } else if (cfg.targetType === TARGET.ALLY) {
      target = actor;
    } else if (cfg.targetType === TARGET.HERO_AND_DEST) {
      target = await pickHeroAndDest();
      if (!target) { showSkillPanel(actor); continue; }
    }

    clearHighlights();
    const fx = executeSkill(actor, input.skillId, target);
    if (fx.soloStart) {
      Object.assign(state, {
        soloActive: true, soloOwnerSide: fx.soloStart.ownerSide,
        soloTargetSide: fx.soloStart.targetSide, soloRoundsLeft: fx.soloStart.rounds,
      });
    }
    renderBattle(); await sleep(500);
    return true;
  }
}

// ── Direction picker ───────────────────────────────────────────────────────

async function pickDir() {
  const panel = document.getElementById('battle-actions-panel');
  if (!panel) return null;
  panel.innerHTML = '<div class="panel-title">选择方向：</div>';
  panel.classList.remove('hidden');
  const row = document.createElement('div');
  row.className = 'dir-buttons';
  for (const dk of DIR_KEYS) {
    const b = document.createElement('button');
    b.className = 'action-btn';
    b.textContent = DIRECTIONS[dk].label;
    b.onclick = () => provideInput({ type: 'action', action: 'direction', dir: dk });
    row.appendChild(b);
  }
  panel.appendChild(row);
  const back = document.createElement('button');
  back.className = 'action-btn'; back.textContent = '← 取消';
  back.onclick = () => provideInput({ type: 'action', action: 'back' });
  panel.appendChild(back);

  while (true) {
    const input = await gameInput();
    if (input.type === 'action') {
      if (input.action === 'direction') return input.dir;
      if (input.action === 'back') return null;
    }
  }
}

// ── Hero-and-destination picker (唐僧肉 force move) ─────────────────────────

async function pickHeroAndDest() {
  showHeroTargetHighlights(() => true);
  renderBoard();

  let picked = null;
  while (!picked) {
    const input = await gameInput();
    if (input.type === 'cell') {
      const h = heroAt(input.col, input.row);
      if (h?.alive) picked = h;
    } else if (input.type === 'action' && input.action === 'back') {
      clearHighlights(); return null;
    }
  }

  showDestHighlights(picked);
  renderBoard();

  while (true) {
    const input = await gameInput();
    if (input.type === 'cell') {
      const cells = reachableCells(picked, 2);
      if (cells.some(c => c.col === input.col && c.row === input.row)) {
        clearHighlights();
        return { hero: picked, destination: { col: input.col, row: input.row } };
      }
    } else if (input.type === 'action' && input.action === 'back') {
      clearHighlights(); return null;
    }
  }
}

// ── Computer turn ──────────────────────────────────────────────────────────

async function doComputerTurn(actor, enemy) {
  hideActionPanel();
  await showFloatMsgAsync('对手思考中...', 500);
  await sleep(300);

  const act = decideAction(actor, enemy);
  addLogEntry(`${actor.name}：${actDesc(act)}`);

  if (act.type === 'attack') {
    blinkCell(act.col, act.row); await sleep(450);
    executeNormalAttack(actor, act.col, act.row);
  } else if (act.type === 'move') {
    blinkCell(act.col, act.row); await sleep(450);
    executeMove(actor, act.col, act.row);
  } else if (act.type === 'skill') {
    const fx = executeSkill(actor, act.skillId, act.target);
    if (fx.soloStart) {
      Object.assign(state, {
        soloActive: true, soloOwnerSide: fx.soloStart.ownerSide,
        soloTargetSide: fx.soloStart.targetSide, soloRoundsLeft: fx.soloStart.rounds,
      });
    }
  } else {
    addLogEntry(`${actor.name} 跳过`);
  }

  renderBattle(); await sleep(500);
}

function actDesc(a) {
  if (a.type === 'skip')   return '跳过';
  if (a.type === 'attack') return `普攻 ${clbl(a.col)}${a.row}`;
  if (a.type === 'move')   return `移动 ${clbl(a.col)}${a.row}`;
  if (a.type === 'skill')  return `技能[${a.skillId}]`;
  return a.type;
}
function clbl(col) { return String.fromCharCode(65 + (col || 0)); }

// ── Round end ──────────────────────────────────────────────────────────────

async function doRoundEnd() {
  const { extraRoundSide } = processRoundEnd();
  if (extraRoundSide) state.extraRounds.push({ ownerSide: extraRoundSide });
  renderBattle();
  saveGame();
  return checkWin();
}

function checkWin() {
  if (state.computerHero && !state.computerHero.alive) return 'player';
  if (state.playerHero   && !state.playerHero.alive)   return 'computer';
  return null;
}

// ── Game over ──────────────────────────────────────────────────────────────

async function handleGameOver(winner) {
  state.soloActive = false;
  state.extraRounds = [];
  state.currentActor = null;
  renderBattle();

  const won = winner === 'player';
  await showFloatMsgAsync(won ? '🏆 你赢了！' : '💀 你输了...', 2000);

  showScreen('game-over');
  clearInputQueue();

  const re = document.getElementById('game-over-result');
  if (re) { re.textContent = won ? '你赢了！' : '你输了...'; re.className = `game-over-result ${won ? 'game-over-win' : 'game-over-lose'}`; }

  const se = document.getElementById('game-over-stats');
  if (se) {
    const rr = state.battleRpsTotal > 0
      ? ((state.battleRpsWins / state.battleRpsTotal) * 100).toFixed(1) : '0.0';
    se.innerHTML = `<p>总回合数：${state.roundCount}</p><p>猜拳次数：${state.battleRpsTotal}，胜率：${rr}%</p>`;
  }

  document.getElementById('btn-play-again').onclick   = () => provideInput({ type: 'gameover', action: 'again' });
  document.getElementById('btn-back-to-menu').onclick = () => provideInput({ type: 'gameover', action: 'menu'  });

  await awaitInput(); // wait for either button – then return to gameFlow
}
