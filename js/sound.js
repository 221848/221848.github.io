import { SOUND_FILES } from './assets.js';

/** SoundManager – stub implementation. Replace play() body when audio is ready. */
const SoundManager = {
  play(name) {
    if (!SOUND_FILES[name]) return; // no file registered
    // const audio = new Audio(SOUND_FILES[name]);
    // audio.play().catch(() => {});
  },
};

export default SoundManager;
