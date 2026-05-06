/**
 * ui/heroSelectUI.js – Hero selection screen
 */

import { HERO_LIST } from '../heroes/index.js';
import { HERO_COLORS, HERO_ABBR } from '../assets.js';
import { provideInput } from '../state.js';

export function buildHeroSelectScreen() {
  const grid = document.getElementById('hero-select-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let selectedHeroId = null;

  for (const hero of HERO_LIST) {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.dataset.heroId = hero.id;

    const avatar = document.createElement('div');
    avatar.className = 'hero-card-avatar';
    avatar.style.background = HERO_COLORS[hero.id] || '#555';
    avatar.textContent = HERO_ABBR[hero.id] || hero.name[0];

    const name = document.createElement('div');
    name.className = 'hero-card-name';
    name.textContent = hero.name;

    const stats = document.createElement('div');
    stats.className = 'hero-card-stats';
    stats.innerHTML = `
      <span>❤ ${hero.maxHp}</span>
      <span>⚔ ${hero.atk}</span>
    `;

    const desc = document.createElement('div');
    desc.className = 'hero-card-desc';
    const allAbilities = [
      ...hero.skills.map(s => `【主动】${s.name}：${s.desc}`),
      ...hero.passives.map(p => `【被动】${p.name}：${p.desc}`),
    ];
    desc.innerHTML = allAbilities.map(a => `<p>${a}</p>`).join('');

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(stats);
    card.appendChild(desc);

    card.addEventListener('click', () => {
      grid.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedHeroId = hero.id;
      // Find the (possibly cloned) confirm button
      const cb = document.getElementById('btn-confirm-hero');
      if (cb) cb.disabled = false;
    });

    grid.appendChild(card);
  }

  const confirmBtn = document.getElementById('btn-confirm-hero');
  if (confirmBtn) {
    // Remove old listeners and reset to disabled
    const newBtn = confirmBtn.cloneNode(true);
    newBtn.disabled = true; // always reset
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', () => {
      if (selectedHeroId) provideInput({ type: 'hero_select', heroId: selectedHeroId });
    });
  }
}
