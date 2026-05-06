/**
 * ui/sidebarUI.js – Hero card sidebars (player left, computer right)
 */

import { state } from '../state.js';
import { HERO_COLORS, HERO_ABBR } from '../assets.js';
import { getHeroConfig, isSkillUsable } from '../heroes/index.js';
import { statusLabel } from '../statusEffects.js';

/** Render both sidebars based on current state */
export function renderSidebars() {
  _renderSide('left',  state.playerHero,   'player');
  _renderSide('right', state.computerHero, 'computer');
}

function _renderSide(side, hero, heroSide) {
  const sidebar = document.getElementById(`sidebar-${side}`);
  if (!sidebar) return;
  const content = sidebar.querySelector('.sidebar-content');
  if (!content) return;
  content.innerHTML = '';

  if (!hero) {
    content.textContent = '—';
    return;
  }

  content.appendChild(_buildHeroCard(hero, heroSide));
}

function _buildHeroCard(hero, side) {
  const card = document.createElement('div');
  card.className = 'sidebar-card';

  // Avatar
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'sidebar-avatar-wrap';
  const avatar = document.createElement('div');
  avatar.className = 'sidebar-avatar';
  avatar.style.background = HERO_COLORS[hero.heroId] || '#555';
  avatar.textContent = HERO_ABBR[hero.heroId] || hero.name[0];
  avatarWrap.appendChild(avatar);

  const name = document.createElement('div');
  name.className = 'sidebar-hero-name';
  name.textContent = hero.name;
  name.style.color = side === 'player' ? '#4a9eed' : '#ed4a4a';
  avatarWrap.appendChild(name);
  card.appendChild(avatarWrap);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'sidebar-stats';
  const hpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
  stats.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">生命</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar hp-bar" style="width:${hpPct}%"></div>
      </div>
      <span class="stat-val">${hero.hp} / ${hero.maxHp}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">攻击</span>
      <span class="stat-val">${hero.atk}</span>
    </div>
    ${hero.flatReduction > 0 ? `<div class="stat-row"><span class="stat-label">固定免伤</span><span class="stat-val">${hero.flatReduction}</span></div>` : ''}
    ${hero.percentReduction > 0 ? `<div class="stat-row"><span class="stat-label">百分比免伤</span><span class="stat-val">${(hero.percentReduction*100).toFixed(0)}%</span></div>` : ''}
  `;
  card.appendChild(stats);

  // Status effects
  if (hero.statusEffects.length > 0) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'sidebar-statuses';
    for (const eff of hero.statusEffects) {
      const tag = document.createElement('span');
      tag.className = 'status-tag';
      tag.textContent = statusLabel(eff);
      statusDiv.appendChild(tag);
    }
    card.appendChild(statusDiv);
  }

  // Hero-specific passive state
  const psDiv = _buildPassiveStateInfo(hero);
  if (psDiv) card.appendChild(psDiv);

  // Skills
  const cfg = getHeroConfig(hero.heroId);
  if (cfg) {
    const skillsSection = document.createElement('div');
    skillsSection.className = 'sidebar-skills';
    const sTitle = document.createElement('div');
    sTitle.className = 'sidebar-section-title';
    sTitle.textContent = '技能';
    skillsSection.appendChild(sTitle);

    for (const skillCfg of cfg.skills) {
      const rt = hero.skillState[skillCfg.id];
      const usable = isSkillUsable(hero, skillCfg.id, state);

      const item = document.createElement('div');
      item.className = 'skill-info' + (usable.ok ? '' : ' skill-info-disabled');

      const cdText = rt.currentCooldown > 0 ? ` [CD:${rt.currentCooldown}]` : '';
      const usesText = rt.usesRemaining !== null ? ` [${rt.usesRemaining}次]` : '';
      item.innerHTML = `
        <div class="skill-info-name">${skillCfg.name}${cdText}${usesText}</div>
        <div class="skill-info-desc">${skillCfg.desc}</div>
        ${!usable.ok ? `<div class="skill-info-reason">${usable.reason}</div>` : ''}
      `;
      skillsSection.appendChild(item);
    }

    // Passives
    if (cfg.passives.length > 0) {
      const pTitle = document.createElement('div');
      pTitle.className = 'sidebar-section-title';
      pTitle.textContent = '被动';
      skillsSection.appendChild(pTitle);

      for (const p of cfg.passives) {
        const item = document.createElement('div');
        const activated = _isPassiveActive(hero, p.id);
        item.className = 'skill-info passive-info' + (activated ? ' passive-activated' : '');
        item.innerHTML = `
          <div class="skill-info-name">${p.name}</div>
          <div class="skill-info-desc">${p.desc}</div>
        `;
        skillsSection.appendChild(item);
      }
    }

    card.appendChild(skillsSection);
  }

  return card;
}

function _buildPassiveStateInfo(hero) {
  const div = document.createElement('div');
  div.className = 'passive-state-info';

  if (hero.heroId === 'tangsengrou') {
    div.textContent = `不死身：剩余 ${hero.passiveState.fatalBlocksRemaining} 次`;
    return div;
  }
  if (hero.heroId === 'berserker') {
    const { consecutiveWins, gameUnlocked } = hero.passiveState;
    div.innerHTML = `
      <div>连胜：${consecutiveWins} 回合</div>
      <div>本回合行动次数：${Math.max(1, consecutiveWins)}</div>
      ${gameUnlocked ? '<div class="unlocked-badge">勇敢者的游戏已解锁</div>' : ''}
    `;
    return div;
  }
  if (hero.heroId === 'kapu') {
    div.textContent = hero.passiveState.thresholdActive ? '⚡ 狂怒激活中' : '';
    return div;
  }
  return null;
}

/** Returns true when a passive is currently in its activated / triggered state. */
function _isPassiveActive(hero, passiveId) {
  if (hero.heroId === 'kapu') {
    // All three of Kapu's passives light up when the HP threshold is active
    return !!(hero.passiveState?.thresholdActive);
  }
  if (hero.heroId === 'tangsengrou' && passiveId === 'fatal_block') {
    return (hero.passiveState?.fatalBlocksRemaining ?? 0) > 0;
  }
  return false;
}

/** Toggle a sidebar open/closed */
export function toggleSidebar(side) {
  const sidebar = document.getElementById(`sidebar-${side}`);
  if (!sidebar) return;
  const open = sidebar.classList.toggle('collapsed');
  if (side === 'left') state.leftSidebarOpen = !open;
  else state.rightSidebarOpen = !open;
}

export function initSidebarToggles() {
  document.querySelectorAll('.sidebar-toggle').forEach(btn => {
    const side = btn.dataset.side;
    btn.addEventListener('click', () => toggleSidebar(side));
  });
}
