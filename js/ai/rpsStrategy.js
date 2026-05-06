/**
 * ai/rpsStrategy.js – RPS strategy interface.
 * Currently: RandomStrategy. Implement new strategies to extend AI behaviour.
 */
import { RPS_ALL } from '../utils/constants.js';

/** Random RPS picker */
export class RandomStrategy {
  pick() {
    return RPS_ALL[Math.floor(Math.random() * 3)];
  }
}

/** Factory: return the active RPS strategy */
export function getRpsStrategy() {
  return new RandomStrategy();
}
