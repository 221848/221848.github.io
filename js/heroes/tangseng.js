/**
 * 唐僧 – Ranged / Area / Spell Array
 * HP 28 · ATK 5
 */
import { TARGET } from '../utils/constants.js';

const tangseng = {
  id:   'tangseng',
  name: '唐僧',
  maxHp: 28,
  atk:   5,
  maxMana: 0,
  flatReduction: 0,
  percentReduction: 0,

  skills: [
    {
      id:   'ganlu',
      name: '天降甘露',
      type: 'active',
      desc: '自身 3×3 范围内所有友方回复 20 点生命。冷却 2 回合。',
      cooldown: 2,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.SELF,
      unlockCondition: null,
    },
    {
      id:   'ice_dragon',
      name: '冰龙波',
      type: 'active',
      desc: '选择方向，从自身相邻格延伸至地图边缘，路径上每个敌人受 4 点伤害。冷却 0。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.DIRECTION,
      unlockCondition: null,
    },
    {
      id:   'summon_array',
      name: '水魔爆·召唤法阵',
      type: 'active',
      desc: '指定方向召唤 1×2 法阵（自身邻格+延伸1格）。场上同时只存在一个法阵。冷却 0。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.DIRECTION,
      unlockCondition: null,
      // unlockCondition is checked in actions.js against spell-array existence
    },
    {
      id:   'detonate_array',
      name: '水魔爆·引爆法阵',
      type: 'active',
      desc: '引爆场上法阵，范围内每个敌人受 40 点伤害，法阵消失。冷却 0。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.NONE,
      unlockCondition: null,
    },
  ],

  passives: [],

  initPassiveState() { return {}; },
};

export default tangseng;
