/**
 * rps.js – Rock-Paper-Scissors logic
 */

import { RPS } from './utils/constants.js';

/** Determine winner: returns 'player', 'computer', or 'tie' */
export function determineWinner(playerChoice, computerChoice) {
  if (playerChoice === computerChoice) return 'tie';
  if (
    (playerChoice === RPS.ROCK     && computerChoice === RPS.SCISSORS) ||
    (playerChoice === RPS.SCISSORS && computerChoice === RPS.PAPER)    ||
    (playerChoice === RPS.PAPER    && computerChoice === RPS.ROCK)
  ) return 'player';
  return 'computer';
}

/** Random RPS choice */
export function randomChoice() {
  const picks = [RPS.ROCK, RPS.SCISSORS, RPS.PAPER];
  return picks[Math.floor(Math.random() * 3)];
}
