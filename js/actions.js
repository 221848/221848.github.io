/**
 * actions.js – Action execution engine.
 * Builds a context (ctx) and drives all skill/attack/move effects.
 * Uses the ctx pattern so hero skill functions don't import from here.
 */

import { state, heroOf, opponentSide } from './state.js';
import { getSkillConfig, getHeroConfig } from './heroes/index.js';
import {
  heroAt, isOccupied, moveCells, attackCells,
  reachableCells, enemyInDirection, adjacentEmptyPositions,
  livingHeroes, spellArrayCells,
} from './board.js';
import { applyStatus, hasStatus, removeStatus, tickStatuses } from './statusEffects.js';
import { inBounds, directionRay, squareArea, adjacentCells } from './utils/helpers.js';
import { STATUS, DIRECTIONS } from './utils/constants.js';
import { addLogEntry } from './ui/logUI.js';
import { showFloatMsg } from './ui/floatMsgUI.js';
import SoundManager from './sound.js';

// ── Damage formula ─────────────────────────────────────────────────────────

/**
 * Apply damage to target from attacker.
 * Handles 唐僧肉 fatal-block passive and 卡普 life-steal passive.
 * Returns actual damage dealt.
 */
export function applyDamage(target, rawDamage, attacker = null) {
  const reduced = Math.max(0, rawDamage - target.flatReduction);
  let actual = Math.max(0, Math.floor(reduced * (1 - target.percentReduction)));

  if (actual <= 0) {
    addLogEntry(`${target.name} 未受到伤害。`);
    showFloatMsg(`${attacker ? attacker.name + ' 对 ' + target.name : target.name} 未造成伤害`);
    return 0;
  }

  // 唐僧肉: fatal block passive
  if (target.heroId === 'tangsengrou' && actual >= target.hp && target.passiveState.fatalBlocksRemaining > 0) {
    target.passiveState.fatalBlocksRemaining--;
    const remaining = target.passiveState.fatalBlocksRemaining;
    const msg = `${target.name} 免疫了本次致命伤害！（剩余${remaining}次）`;
    addLogEntry(msg);
    showFloatMsg(msg);
    return 0;
  }

  target.hp = Math.max(0, target.hp - actual);
  if (target.hp <= 0) target.alive = false;

  const msg = attacker
    ? `${attacker.name} 对 ${target.name} 造成 ${actual} 点伤害`
    : `${target.name} 受到 ${actual} 点伤害`;
  addLogEntry(msg);
  showFloatMsg(msg);
  SoundManager.play('attack');

  // Track berserker damage received
  if (target.heroId === 'berserker') target.passiveState.damagedThisRound = true;

  // 卡普: life steal when threshold active and attacker is kapu
  if (attacker && attacker.heroId === 'kapu' && attacker.passiveState.thresholdActive) {
    const steal = Math.ceil(actual * 0.2);
    applyHeal(attacker, steal, attacker);
  }

  return actual;
}

/** Apply healing to a hero */
export function applyHeal(target, amount, source = null) {
  if (amount <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const gained = target.hp - before;
  if (gained > 0) {
    const msg = `${target.name} 恢复了 ${gained} 点生命`;
    addLogEntry(msg);
    showFloatMsg(msg);
  }
}

/** Move a hero to a new position */
export function moveHero(hero, col, row) {
  const from = { ...hero.position };
  hero.position = { col, row };
  addLogEntry(`${hero.name} 移动：${posLbl(from)} → ${posLbl({ col, row })}`);
  SoundManager.play('move');
}

function posLbl(p) {
  return String.fromCharCode(65 + p.col) + p.row;
}

// ── Normal Attack ─────────────────────────────────────────────────────────

export function executeNormalAttack(attacker, targetCol, targetRow) {
  const target = heroAt(targetCol, targetRow);
  if (!target) return;
  applyDamage(target, attacker.atk, attacker);
}

// ── Normal Move ───────────────────────────────────────────────────────────

export function executeMove(hero, col, row) {
  moveHero(hero, col, row);
}

// ── Skill execution ───────────────────────────────────────────────────────

/**
 * Execute a skill. Returns extra state mutations the game loop needs to apply
 * (e.g., {soloStart: {rounds:5, targetSide}}).
 */
export function executeSkill(caster, skillId, target) {
  const cfg = getSkillConfig(caster.heroId, skillId);
  if (!cfg) return {};

  const rt = caster.skillState[skillId];

  // Consume resources
  rt.currentCooldown = cfg.cooldown;
  if (rt.usesRemaining !== null) rt.usesRemaining--;
  caster.mana -= cfg.manaCost;

  SoundManager.play('skill');

  switch (skillId) {

    // ── 唐僧肉: 强制位移 ───────────────────────────────────────────────────
    case 'force_move': {
      // target = { hero: heroInstance, destination: {col, row} }
      const { hero: mover, destination } = target;
      moveHero(mover, destination.col, destination.row);
      break;
    }

    // ── 唐僧: 天降甘露 ────────────────────────────────────────────────────
    case 'ganlu': {
      const area = squareArea(caster.position.col, caster.position.row, 1);
      const healed = new Set();
      for (const cell of area) {
        const h = heroAt(cell.col, cell.row);
        if (h && h.side === caster.side && !healed.has(h)) {
          applyHeal(h, 20, caster);
          healed.add(h);
        }
      }
      break;
    }

    // ── 唐僧: 冰龙波 ──────────────────────────────────────────────────────
    case 'ice_dragon': {
      // target = direction key string
      const dirKey = target;
      const ray = directionRay(caster.position.col, caster.position.row, dirKey);
      for (const cell of ray) {
        const h = heroAt(cell.col, cell.row);
        if (h && h.side !== caster.side) {
          applyDamage(h, 4, caster);
        }
      }
      break;
    }

    // ── 唐僧: 召唤法阵 ────────────────────────────────────────────────────
    case 'summon_array': {
      const dirKey = target;
      const { dc, dr } = DIRECTIONS[dirKey];
      const c1 = caster.position.col + dc, r1 = caster.position.row + dr;
      const c2 = c1 + dc, r2 = r1 + dr;
      if (inBounds(c1, r1) && inBounds(c2, r2)) {
        state._spellArrayIdSeq++;
        state.spellArrays.push({
          id:      state._spellArrayIdSeq,
          pos1:    { col: c1, row: r1 },
          pos2:    { col: c2, row: r2 },
          dir:     dirKey,
          ownerSide: caster.side,
        });
        addLogEntry(`${caster.name} 在 ${posLbl({col:c1,row:r1})}–${posLbl({col:c2,row:r2})} 召唤了法阵`);
      } else {
        addLogEntry(`${caster.name} 召唤法阵失败（越界）`);
      }
      break;
    }

    // ── 唐僧: 引爆法阵 ────────────────────────────────────────────────────
    case 'detonate_array': {
      const arrays = [...state.spellArrays];
      state.spellArrays = [];
      for (const sa of arrays) {
        addLogEntry(`${caster.name} 引爆了法阵！`);
        for (const cell of spellArrayCells(sa)) {
          const h = heroAt(cell.col, cell.row);
          if (h && h.side !== caster.side) {
            applyDamage(h, 40, caster);
          }
        }
      }
      break;
    }

    // ── 卡普: 吸星 ────────────────────────────────────────────────────────
    case 'star_absorption': {
      const dirKey = target;
      const enemy = enemyInDirection(caster, dirKey, 2);
      if (!enemy) {
        addLogEntry(`${caster.name} 使用吸星，但方向上无敌人`);
        break;
      }
      // Pull enemy to adjacent empty cell of caster
      const empties = adjacentEmptyPositions(caster);
      if (empties.length > 0) {
        // Prefer the cell closest to where the enemy was
        empties.sort((a, b) => {
          const da = Math.abs(a.col - enemy.position.col) + Math.abs(a.row - enemy.position.row);
          const db = Math.abs(b.col - enemy.position.col) + Math.abs(b.row - enemy.position.row);
          return da - db;
        });
        moveHero(enemy, empties[0].col, empties[0].row);
      } else {
        addLogEntry(`${enemy.name} 无法被拉到 ${caster.name} 旁边（无空位）`);
      }
      // Always apply stun
      applyStatus(enemy, STATUS.STUN, 1, 'star_absorption');
      addLogEntry(`${enemy.name} 被眩晕 1 回合`);
      break;
    }

    // ── 狂战士: 勇敢者的游戏 ──────────────────────────────────────────────
    case 'brave_game': {
      // target = enemy hero instance
      const targetSide = target.side;
      addLogEntry(`${caster.name} 发动了勇敢者的游戏！5 轮有效猜拳开始！`);
      showFloatMsg('勇敢者的游戏！');
      return { soloStart: { ownerSide: caster.side, targetSide, rounds: 5 } };
    }

    default:
      break;
  }

  return {};
}

// ── Round-end processing ───────────────────────────────────────────────────

/** Decrement skill cooldowns at round end */
export function tickSkillCooldowns(hero) {
  for (const skillId of Object.keys(hero.skillState)) {
    const rt = hero.skillState[skillId];
    if (rt.currentCooldown > 0) rt.currentCooldown--;
  }
}

/** Move all spell arrays one step in their direction; remove if out-of-bounds */
export function tickSpellArrays() {
  const surviving = [];
  for (const sa of state.spellArrays) {
    const { dc, dr } = DIRECTIONS[sa.dir];
    const np1 = { col: sa.pos1.col + dc, row: sa.pos1.row + dr };
    const np2 = { col: sa.pos2.col + dc, row: sa.pos2.row + dr };
    if (inBounds(np1.col, np1.row) && inBounds(np2.col, np2.row)) {
      sa.pos1 = np1;
      sa.pos2 = np2;
      surviving.push(sa);
      addLogEntry(`法阵向${DIRECTIONS[sa.dir].label}移动了一格`);
    } else {
      addLogEntry(`法阵移出边界，消失了`);
    }
  }
  state.spellArrays = surviving;
}

/** Process Kapu's HP-threshold passive: check at round start */
export function processKapuThreshold(hero) {
  if (hero.heroId !== 'kapu') return;
  const wasActive = hero.passiveState.thresholdActive;
  const nowActive = hero.hp < 20;
  hero.passiveState.thresholdActive = nowActive;

  if (nowActive && !wasActive) {
    // Activate: double ATK
    hero.atk = hero.passiveState.baseAtk * 2;
    addLogEntry(`${hero.name} 的血量低于 20，被动激活：攻击力翻倍至 ${hero.atk}！`);
  } else if (!nowActive && wasActive) {
    // Deactivate: restore ATK
    hero.atk = hero.passiveState.baseAtk;
    addLogEntry(`${hero.name} 血量已恢复，被动解除`);
  }
}

/** Full round-end processing (spell arrays, cooldowns, status ticks, berserker blood gift).
 *  Returns {extraRoundSide} if an extra round should be granted. */
export function processRoundEnd() {
  const heroes = livingHeroes();

  // 1. Tick skill cooldowns
  for (const h of heroes) tickSkillCooldowns(h);

  // 2. Move spell arrays
  tickSpellArrays();

  // 3. Tick status effects
  for (const h of heroes) tickStatuses(h);

  // 4. Berserker blood-gift passive
  let extraRoundSide = null;
  for (const h of heroes) {
    if (h.heroId === 'berserker' && state.roundType === 'NORMAL' && h.passiveState.damagedThisRound) {
      extraRoundSide = h.side;
      addLogEntry(`${h.name} 触发了"血红的馈赠"，获得额外回合！`);
      showFloatMsg(`${h.name} 获得额外行动回合！`);
    }
    // Reset per-round flags
    if (h.heroId === 'berserker') h.passiveState.damagedThisRound = false;
  }

  return { extraRoundSide };
}

/** Update Berserker consecutive-win counter after an RPS result */
export function updateBerserkerStreak(side, won) {
  const h = heroOf(side);
  if (!h || h.heroId !== 'berserker') return;
  if (won) {
    h.passiveState.consecutiveWins++;
    // Check unlock condition for 勇敢者的游戏
    if (h.passiveState.consecutiveWins >= 3 && !h.passiveState.gameUnlocked) {
      h.passiveState.gameUnlocked = true;
      addLogEntry(`${h.name} 解锁了"勇敢者的游戏"！`);
    }
  } else {
    h.passiveState.consecutiveWins = 0;
  }
}

/** How many actions does this hero get this turn? (Berserker passive 1) */
export function calcActionsForHero(hero) {
  if (hero.heroId === 'berserker') {
    return Math.max(1, hero.passiveState.consecutiveWins);
  }
  return 1;
}
