/**
 * state.js – Central mutable game state (singleton).
 * All modules read/mutate this object. Never replace the object itself; only mutate properties.
 */

export const state = {
  // ── Screen / phase ───────────────────────────────────────────────────────
  screen: 'MAIN_MENU',   // SCREENS value
  phase:  null,           // PHASES value (only during BATTLE screen)

  // ── Round info ───────────────────────────────────────────────────────────
  roundCount:  0,
  roundType:   'NORMAL',   // ROUND_TYPES value
  currentActor: null,      // 'player' | 'computer'
  rpsWinner:   null,       // 'player' | 'computer' | null

  // ── Hero instances ────────────────────────────────────────────────────────
  playerHero:   null,  // HeroInstance
  computerHero: null,  // HeroInstance

  // ── Board extras ─────────────────────────────────────────────────────────
  spellArrays: [],  // [{id, pos1:{col,row}, pos2:{col,row}, dir, ownerSide}]
  _spellArrayIdSeq: 0,

  // ── Action state ─────────────────────────────────────────────────────────
  actionsRemaining: 0,    // for Berserker multi-action
  selectedAction:   null, // 'attack' | 'move' | 'skill'
  selectedSkillId:  null,
  selectionStep:    0,    // 0 = pick action, 1 = pick target, 2 = pick secondary target
  selectionData:    {},   // intermediate data during multi-step targeting
  highlightCells:   [],   // [{col, row, type}]

  // ── Solo round state ──────────────────────────────────────────────────────
  soloActive:       false,
  soloOwnerSide:    null,  // 'player'|'computer'
  soloTargetSide:   null,
  soloRoundsLeft:   0,

  // ── Extra round queue ────────────────────────────────────────────────────
  extraRounds: [],  // [{ownerSide}]

  // ── RPS reveal state ─────────────────────────────────────────────────────
  playerRpsChoice:   null,
  computerRpsChoice: null,

  // ── UI ───────────────────────────────────────────────────────────────────
  leftSidebarOpen:  true,
  rightSidebarOpen: true,
  viewingHeroSide:  'player',  // which hero card the right sidebar shows

  // ── Battle stats ─────────────────────────────────────────────────────────
  battleRpsTotal: 0,
  battleRpsWins:  0,

};

// ── Input queue (decoupled from state object) ─────────────────────────────
let _inputQueue   = [];
let _inputResolve = null;

/** Wait for the next player input event. Uses a queue so no inputs are lost. */
export function awaitInput() {
  if (_inputQueue.length > 0) {
    return Promise.resolve(_inputQueue.shift());
  }
  return new Promise(resolve => { _inputResolve = resolve; });
}

/** Called by UI event handlers to deliver input to the game loop. */
export function provideInput(data) {
  if (_inputResolve) {
    const fn = _inputResolve;
    _inputResolve = null;
    fn(data);
  } else {
    _inputQueue.push(data);
  }
}

/** Flush pending queued inputs (call when switching screens) */
export function clearInputQueue() {
  _inputQueue = [];
  _inputResolve = null;
}

/** Helper: get the hero instance for a given side */
export function heroOf(side) {
  return side === 'player' ? state.playerHero : state.computerHero;
}

/** Helper: get opponent side */
export function opponentSide(side) {
  return side === 'player' ? 'computer' : 'player';
}
