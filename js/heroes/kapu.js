/**
 * 卡普 – Semi-tank / Control / Sustain
 * HP 60 · ATK 18
 * Passive 1: When HP < 20 → activate passives 2 & 4
 * Passive 2: ATK ×2 (18 → 36) when threshold active
 * Active 3: 吸星 – pull enemy ≤2 cells in chosen direction to adjacent empty, apply stun 1 round
 * Passive 4: life steal 20% of damage dealt (round up) when threshold active
 */
import { TARGET } from '../utils/constants.js';

const kapu = {
  id:   'kapu',
  name: '卡普',
  maxHp: 60,
  atk:   18,
  maxMana: 0,
  flatReduction: 0,
  percentReduction: 0,

  skills: [
    {
      id:   'star_absorption',
      name: '吸星',
      type: 'active',
      desc: '选择方向，将该方向距离 ≤2 格的敌人拉至自身紧邻空位，附加眩晕 1 回合。冷却 0。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: null,
      usesRemaining: null,
      targetType: TARGET.DIRECTION,
      unlockCondition: null,
    },
  ],

  passives: [
    {
      id:      'hp_threshold',
      name:    '血量阈值',
      type:    'passive',
      desc:    '当前血量 < 20 时激活被动②④，每回合开始时检查。',
      trigger: 'onRoundStart',
    },
    {
      id:      'atk_double',
      name:    '攻击翻倍',
      type:    'passive',
      desc:    '激活时攻击力 ×2（18→36）。',
      trigger: 'onRoundStart',
    },
    {
      id:      'life_steal',
      name:    '吸血',
      type:    'passive',
      desc:    '激活时，造成的所有伤害的 20%（向上取整）转化为自身治疗，不超过最大生命值。',
      trigger: 'onDamageDealt',
    },
  ],

  initPassiveState() {
    return {
      thresholdActive: false,
      baseAtk: 18,           // store original ATK
    };
  },
};

export default kapu;
