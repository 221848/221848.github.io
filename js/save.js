/**
 * save.js – Save/load game state and persistent statistics.
 * Uses localStorage keys: rps_chess_save, rps_chess_stats
 */

import { state } from './state.js';
import { deepClone } from './utils/helpers.js';

const SAVE_KEY  = 'rps_chess_save';
const STATS_KEY = 'rps_chess_stats';

// ── Statistics ─────────────────────────────────────────────────────────────

const DEFAULT_STATS = {
  totalGames:      0,
  wins:            0,
  currentStreak:   0,
  maxStreak:       0,
  rpsTotal:        0,
  rpsWins:         0,
  rpsCurrentStreak:0,
  rpsMaxStreak:    0,
  rpsPicks:        { rock: 0, scissors: 0, paper: 0 },
  heroUsage:       {},
};

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return deepClone(DEFAULT_STATS);
    return Object.assign(deepClone(DEFAULT_STATS), JSON.parse(raw));
  } catch { return deepClone(DEFAULT_STATS); }
}

export function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/** Record match result and RPS history into persistent stats. */
export function recordMatchEnd(won, battleRpsTotal, battleRpsWins, playerHeroId, playerRpsPicks) {
  const stats = loadStats();
  stats.totalGames++;
  if (won) {
    stats.wins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
  } else {
    stats.currentStreak = 0;
  }
  stats.rpsTotal += battleRpsTotal;
  stats.rpsWins  += battleRpsWins;
  if (battleRpsWins > 0) {
    stats.rpsCurrentStreak += battleRpsWins;
    if (stats.rpsCurrentStreak > stats.rpsMaxStreak) stats.rpsMaxStreak = stats.rpsCurrentStreak;
  } else {
    stats.rpsCurrentStreak = 0;
  }
  for (const pick of (playerRpsPicks || [])) {
    stats.rpsPicks[pick] = (stats.rpsPicks[pick] || 0) + 1;
  }
  if (playerHeroId) {
    stats.heroUsage[playerHeroId] = (stats.heroUsage[playerHeroId] || 0) + 1;
  }
  saveStats(stats);
}

// ── Game Save ──────────────────────────────────────────────────────────────

/** Serialise the parts of state that can be JSON-round-tripped. */
function serialiseState() {
  return {
    screen: state.screen,
    phase: state.phase,
    roundCount: state.roundCount,
    roundType: state.roundType,
    currentActor: state.currentActor,
    rpsWinner: state.rpsWinner,
    playerHero: state.playerHero,
    computerHero: state.computerHero,
    spellArrays: state.spellArrays,
    _spellArrayIdSeq: state._spellArrayIdSeq,
    actionsRemaining: state.actionsRemaining,
    extraRounds: state.extraRounds,
    soloActive: state.soloActive,
    soloOwnerSide: state.soloOwnerSide,
    soloTargetSide: state.soloTargetSide,
    soloRoundsLeft: state.soloRoundsLeft,
    battleRpsTotal: state.battleRpsTotal,
    battleRpsWins: state.battleRpsWins,
  };
}

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialiseState()));
  } catch(e) { console.warn('Save failed', e); }
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.screen === 'BATTLE' && data.playerHero && data.computerHero;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, data);
    return true;
  } catch { return false; }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
