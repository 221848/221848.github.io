/**
 * 狂战士 – Combo / Burst / Duel
 * HP 50 · ATK 5
 * Passive 1: actions this turn = consecutive winning rounds (from last loss)
 * Passive 2: if took damage last valid round → extra round at round end
 * Limited Skill: 勇敢者的游戏 (unlock: passive-1 action count ≥ 3 at any point)
 */
import { TARGET } from '../utils/constants.js';

const berserker = {
  id:   'berserker',
  name: '狂战士',
  maxHp: 50,
  atk:   5,
  maxMana: 0,
  flatReduction: 0,
  percentReduction: 0,

  skills: [
    {
      id:   'brave_game',
      name: '勇敢者的游戏',
      type: 'active',
      desc: '选择 1 名敌人进行 5 轮有效猜拳（平局不计），仅自己可行动。解锁条件：被动①行动次数曾 ≥ 3。整局仅可使用 1 次。',
      cooldown: 0,
      manaCost: 0,
      maxUsesPerBattle: 1,
      usesRemaining: 1,
      targetType: TARGET.ENEMY,
      unlockCondition: (st, hero) => hero.passiveState.gameUnlocked,
    },
  ],

  passives: [
    {
      id:      'wild_heart',
      name:    '疯狂的心',
      type:    'passive',
      desc:    '本回合行动次数 = 连续赢拳有效回合数（从上次输拳起）。',
      trigger: 'onActionStart',
    },
    {
      id:      'blood_gift',
      name:    '血红的馈赠',
      type:    'passive',
      desc:    '回合结束时，若本有效回合受到过伤害，获得一个额外回合（最多 1 次，额外回合中不再触发）。',
      trigger: 'onRoundEnd',
    },
  ],

  initPassiveState() {
    return {
      consecutiveWins: 0,   // consecutive rounds berserker has won RPS
      damagedThisRound: false,
      gameUnlocked: false,
    };
  },
};

export default berserker;
