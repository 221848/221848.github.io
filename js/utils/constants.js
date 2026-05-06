// Board dimensions
export const BOARD_COLS = 7; // Columns A–G (index 0–6)
export const BOARD_ROWS = 8; // Rows 1–8

export const COL_LABELS = ['A','B','C','D','E','F','G'];

// Game screens
export const SCREENS = {
  MAIN_MENU: 'MAIN_MENU',
  HERO_SELECT: 'HERO_SELECT',
  BATTLE: 'BATTLE',
  STATS: 'STATS',
  GAME_OVER: 'GAME_OVER',
};

// Battle sub-phases
export const PHASES = {
  RPS_CHOOSING: 'RPS_CHOOSING',
  RPS_REVEAL: 'RPS_REVEAL',
  ACTION_SELECT: 'ACTION_SELECT',
  ACTION_TARGET: 'ACTION_TARGET',
  ROUND_END: 'ROUND_END',
};

// Round types
export const ROUND_TYPES = {
  NORMAL: 'NORMAL',
  EXTRA: 'EXTRA',
  SOLO: 'SOLO',
};

// Rock-Paper-Scissors values
export const RPS = { ROCK: 'rock', SCISSORS: 'scissors', PAPER: 'paper' };
export const RPS_LABELS = { rock: '石头 ✊', scissors: '剪刀 ✌', paper: '布 🤚' };
export const RPS_ALL = [RPS.ROCK, RPS.SCISSORS, RPS.PAPER];

// Directions (dr = row delta: +1 = North / upward)
export const DIRECTIONS = {
  UP:    { dc:  0, dr:  1, label: '北', key: 'UP'    },
  DOWN:  { dc:  0, dr: -1, label: '南', key: 'DOWN'  },
  LEFT:  { dc: -1, dr:  0, label: '西', key: 'LEFT'  },
  RIGHT: { dc:  1, dr:  0, label: '东', key: 'RIGHT' },
};
export const DIR_KEYS = ['UP','DOWN','LEFT','RIGHT'];

// Status effect types
export const STATUS = { STUN: 'stun' };

// Highlight types for board cells
export const HIGHLIGHT = {
  MOVE:         'move',
  ATTACK:       'attack',
  SKILL_TARGET: 'skill_target',
  SELECTED:     'selected',
  SPELL_ARRAY:  'spell_array',
  BLINK:        'blink',
};

// Skill target modes
export const TARGET = {
  NONE:         'none',
  SELF:         'self',
  ENEMY:        'enemy',
  ALLY:         'ally',
  ANY_HERO:     'any_hero',
  DIRECTION:    'direction',
  HERO_AND_DEST:'hero_and_dest',
};
