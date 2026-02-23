/**
 * Sound Manager for Gamification
 *
 * Manages game sound effects with preloading, caching, and user preference support.
 */

// Sound file paths
const SOUNDS = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  streak: '/sounds/streak.mp3',
  tick: '/sounds/tick.mp3',
  gameOver: '/sounds/game-over.mp3',
  join: '/sounds/join.mp3',
  countdown: '/sounds/countdown.mp3'
};

// Audio element cache
const audioCache = new Map();

// User preference for sound
const STORAGE_KEY = 'answr_sounds_enabled';

class SoundManager {
  constructor() {
    this._enabled = this._loadPreference();
    this._preloaded = false;
    this._volume = 0.5;
  }

  /**
   * Load user preference from localStorage
   */
  _loadPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  }

  /**
   * Save user preference to localStorage
   */
  _savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._enabled));
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Check if sounds are enabled
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * Enable or disable sounds
   */
  set enabled(value) {
    this._enabled = Boolean(value);
    this._savePreference();
  }

  /**
   * Toggle sounds on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(level) {
    this._volume = Math.max(0, Math.min(1, level));
  }

  /**
   * Preload all sounds to avoid delay on first play
   */
  preload() {
    if (this._preloaded) return;

    Object.entries(SOUNDS).forEach(([name, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this._volume;
      audioCache.set(name, audio);
    });

    this._preloaded = true;
  }

  /**
   * Get or create an Audio element for a sound
   */
  _getAudio(name) {
    if (audioCache.has(name)) {
      return audioCache.get(name);
    }

    const path = SOUNDS[name];
    if (!path) {
      console.warn(`Sound "${name}" not found`);
      return null;
    }

    const audio = new Audio(path);
    audio.volume = this._volume;
    audioCache.set(name, audio);
    return audio;
  }

  /**
   * Play a sound effect
   *
   * @param {'correct'|'wrong'|'streak'|'tick'|'gameOver'|'join'|'countdown'} name
   */
  play(name) {
    if (!this._enabled) return;

    const audio = this._getAudio(name);
    if (!audio) return;

    // Reset and play
    audio.currentTime = 0;
    audio.volume = this._volume;
    audio.play().catch(() => {
      // Ignore autoplay restrictions - user needs to interact first
    });
  }

  /**
   * Play correct answer sound
   */
  correct() {
    this.play('correct');
  }

  /**
   * Play wrong answer sound
   */
  wrong() {
    this.play('wrong');
  }

  /**
   * Play streak sound
   */
  streak() {
    this.play('streak');
  }

  /**
   * Play countdown tick
   */
  tick() {
    this.play('tick');
  }

  /**
   * Play game over sound
   */
  gameOver() {
    this.play('gameOver');
  }

  /**
   * Play player join sound
   */
  playerJoin() {
    this.play('join');
  }

  /**
   * Play countdown sound (3-2-1-GO)
   */
  countdown() {
    this.play('countdown');
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Export class for testing
export { SoundManager };
