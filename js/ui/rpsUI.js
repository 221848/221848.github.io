/**
 * ui/rpsUI.js – RPS panel rendering and interaction
 */

import { RPS, RPS_LABELS } from '../utils/constants.js';
import { provideInput } from '../state.js';

export function showRpsPanel(enabled = true) {
  const panel = document.getElementById('rps-panel');
  if (!panel) return;
  panel.innerHTML = '';
  panel.classList.remove('hidden');

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = enabled ? '请出拳：' : '等待对手出拳...';
  panel.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.className = 'rps-buttons';

  for (const choice of [RPS.ROCK, RPS.SCISSORS, RPS.PAPER]) {
    const btn = document.createElement('button');
    btn.className = 'rps-btn';
    btn.textContent = RPS_LABELS[choice];
    btn.dataset.choice = choice;
    if (!enabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      if (!enabled) return;
      // Lock all buttons
      btnRow.querySelectorAll('.rps-btn').forEach(b => b.disabled = true);
      provideInput({ type: 'rps', choice });
    });
    btnRow.appendChild(btn);
  }

  panel.appendChild(btnRow);
}

export function hideRpsPanel() {
  const panel = document.getElementById('rps-panel');
  if (panel) panel.classList.add('hidden');
}

/** Show the result of an RPS round */
export function showRpsResult(playerChoice, computerChoice, result) {
  const panel = document.getElementById('rps-panel');
  if (!panel) return;

  const outcomeText = result === 'player'   ? '✔ 胜！'
                    : result === 'computer' ? '✘ 败！'
                    : result === 'tie'      ? '≈ 平局！'
                    : '…';

  const resultEl = document.createElement('div');
  resultEl.className = 'rps-result';
  resultEl.innerHTML = `
    <span class="rps-picks">
      你：<strong>${RPS_LABELS[playerChoice]}</strong>
      &nbsp;VS&nbsp;
      电脑：<strong>${RPS_LABELS[computerChoice]}</strong>
    </span>
    <span class="rps-outcome ${result}">${outcomeText}</span>
  `;

  // Replace either the button row OR the previous result display
  const toReplace = panel.querySelector('.rps-buttons') || panel.querySelector('.rps-result');
  if (toReplace) toReplace.replaceWith(resultEl);
  else panel.appendChild(resultEl);
}
