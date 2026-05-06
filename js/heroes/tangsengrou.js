/**
 * 唐僧肉 – Control / Survival
 * HP 6 · ATK 10 · passive: block fatal damage up to 5× per battle
 * Active: force-move any living hero 1–2 steps (can turn corners), CD 0
 */
import { TARGET } from '../utils/constants.js';

const tangsengrou = {
  id:   'tangsengrou',
  name: '唐僧肉',
  maxHp: 6,
  atk:   10,
  maxMana: 0,
  flatReduction: 0,
  percentReduction: 0,

  skills: [
    {
      id:   'force_move',
      name: '强制位移',
      type: 'active',
      desc: '选择场上任意存活英雄，将其移动 1 或 2 格（可拐弯）。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.HERO_AND_DEST,
      range: 2,
      unlockCondition: null,
    },
  ],

  passives: [
    {
      id:     'fatal_block',
      name:   '不死身',
      type:   'passive',
      desc:   '抵挡致命伤害，整局最多触发 5 次。',
      trigger: 'onDamageReceived',
    },
  ],

  /** Initialise hero-specific passive state */
  initPassiveState() {
    return { fatalBlocksRemaining: 5 };
  },
};

export default tangsengrou;
