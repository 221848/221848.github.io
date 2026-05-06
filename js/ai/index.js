/**
 * ai/index.js – AI controller interface
 */

import { getRpsStrategy } from './rpsStrategy.js';
import { decideAction } from './actionStrategy.js';

export class AIController {
  constructor() {
    this.rpsStrategy = getRpsStrategy();
  }

  /** Pick a RPS choice */
  pickRps() {
    return this.rpsStrategy.pick();
  }

  /** Decide the next action for the computer hero */
  pickAction(computerHero, playerHero) {
    return decideAction(computerHero, playerHero);
  }
}

export const aiController = new AIController();
