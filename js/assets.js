/**
 * Asset path registry.
 * Replace values with real paths when art is available.
 * All image/audio references elsewhere should import from this module.
 */

export const HERO_AVATARS = {
  tangsengrou: null,  // e.g. 'assets/heroes/tangsengrou.png'
  tangseng:    null,
  berserker:   null,
  kapu:        null,
};

// Hero placeholder gradient colours (CSS gradient strings)
export const HERO_COLORS = {
  tangsengrou: 'linear-gradient(135deg, #e85d04, #f48c06)',
  tangseng:    'linear-gradient(135deg, #d4a017, #f9c74f)',
  berserker:   'linear-gradient(135deg, #9b1d20, #e63946)',
  kapu:        'linear-gradient(135deg, #005f73, #0a9396)',
};

// Hero display abbreviations
export const HERO_ABBR = {
  tangsengrou: '肉',
  tangseng:    '僧',
  berserker:   '狂',
  kapu:        '卡',
};

export const SOUND_FILES = {
  attack:     null,
  skill:      null,
  move:       null,
  rps_win:    null,
  rps_lose:   null,
  game_over:  null,
};
