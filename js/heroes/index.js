/**
 * heroes/index.js – Hero registry
 * Provides createHeroInstance() to build a runtime hero object.
 */

import tangsengrou from './tangsengrou.js';
import tangseng    from './tangseng.js';
import berserker   from './berserker.js';
import kapu        from './kapu.js';

/** All available heroes (for selection screen) */
export const HERO_REGISTRY = {
  tangsengrou,
  tangseng,
  berserker,
  kapu,
};

export const HERO_LIST = [tangsengrou, tangseng, berserker, kapu];

/**
 * Create a runtime hero instance from a hero config + side + initial position.
 * @param {string} heroId
 * @param {'player'|'computer'} side
 * @param {{col:number,row:number}} position
 */
export function createHeroInstance(heroId, side, position) {
  const cfg = HERO_REGISTRY[heroId];
  if (!cfg) throw new Error(`Unknown hero: ${heroId}`);

  return {
    heroId: cfg.id,
    name:   cfg.name,
    side,
    maxHp:            cfg.maxHp,
    hp:               cfg.maxHp,
    atk:              cfg.atk,
    maxMana:          cfg.maxMana,
    mana:             cfg.mana || 0,
    flatReduction:    cfg.flatReduction,
    percentReduction: cfg.percentReduction,
    position:         { ...position },
    alive:            true,
    // Runtime skill state (only mutable fields; static config fetched via registry)
    skillState: cfg.skills.reduce((acc, s) => {
      acc[s.id] = {
        currentCooldown: 0,
        usesRemaining:   s.maxUsesPerBattle !== null ? s.maxUsesPerBattle : null,
      };
      return acc;
    }, {}),
    statusEffects: [],
    passiveState:  cfg.initPassiveState(),
  };
}

/** Get the static config for a hero */
export function getHeroConfig(heroId) {
  return HERO_REGISTRY[heroId] || null;
}

/** Get skill config from hero config */
export function getSkillConfig(heroId, skillId) {
  const cfg = getHeroConfig(heroId);
  return cfg ? cfg.skills.find(s => s.id === skillId) : null;
}

/** Check if a skill is currently usable (cooldown, uses, mana, unlock) */
export function isSkillUsable(hero, skillId, gameState) {
  const cfg = getSkillConfig(hero.heroId, skillId);
  const rt  = hero.skillState[skillId];
  if (!cfg || !rt) return { ok: false, reason: '技能不存在' };

  if (rt.currentCooldown > 0) return { ok: false, reason: `冷却中 剩余${rt.currentCooldown}回合` };
  if (rt.usesRemaining !== null && rt.usesRemaining <= 0) return { ok: false, reason: '次数耗尽' };
  if (hero.mana < cfg.manaCost) return { ok: false, reason: '蓝不足' };
  if (cfg.unlockCondition && !cfg.unlockCondition(gameState, hero))
    return { ok: false, reason: '条件未解锁' };

  // Special logic for 唐僧 spell skills
  if (skillId === 'summon_array' && gameState.spellArrays.length > 0)
    return { ok: false, reason: '法阵已存在' };
  if (skillId === 'detonate_array' && gameState.spellArrays.length === 0)
    return { ok: false, reason: '无法阵可引爆' };

  return { ok: true };
}
