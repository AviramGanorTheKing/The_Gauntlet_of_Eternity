/**
 * AudioManager — single-track music system + SFX manager.
 *
 * Architecture:
 * - Single looping track per biome (downloaded 8-bit music pack)
 * - Volume increases during combat for intensity
 * - Boss rooms: crossfade to standalone boss theme
 * - SFX: slight random pitch/volume variation for organic feel
 * - Music ducking for announcer lines
 *
 * Transitions:
 *   Exploring → Combat: volume increases
 *   Combat → Exploring: volume decreases
 *   Biome change: crossfade tracks (1500ms)
 *   Boss room: fade biome out (1000ms), 500ms silence, boss theme fades in
 *   Low HP (<25%): overlay heartbeat pulse (not implemented as audio yet)
 */

import { EventBus, Events } from '../utils/EventBus.js';

/**
 * Music track definitions per biome.
 * Single track per biome (no layered stems - using downloaded 8-bit music pack).
 */
const BIOME_MUSIC_KEYS = {
    crypt:        'music_crypt',
    fungalCaves:  'music_caves',
    caves:        'music_caves',
    ironFortress: 'music_fortress',
    fortress:     'music_fortress',
    inferno:      'music_inferno',
    abyss:        'music_abyss',
};

const BOSS_MUSIC_KEYS = {
    bone_sovereign: 'music_boss_bone_sovereign',
    sporemind:      'music_boss_sporemind',
    iron_warden:    'music_boss_iron_warden',
    ember_tyrant:   'music_boss_ember_tyrant',
    void_architect: 'music_boss_void_architect',
};

const STANDALONE_KEYS = {
    title:   'music_title',
    shop:    'music_shop',
    death:   'music_death_jingle',
    victory: 'music_victory_fanfare',
};

/** Fade durations (ms) */
const FADE = {
    percIn: 500,
    melodyIn: 300,
    melodyOut: 1000,
    percOut: 1500,
    bossOut: 1000,
    bossIn: 1000,
    bossSilence: 500,
    biomeCrossfade: 1500,
};

export class AudioManager {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.sound = scene.sound;

        /** Current biome key */
        this.currentBiome = null;

        /** Currently playing biome track (single track, not layered) */
        this.biomeTrack = null;

        /** Boss theme reference */
        this.bossTheme = null;

        /** Standalone track reference (title, shop, etc.) */
        this.standaloneTrack = null;

        /** Game state: 'exploring' | 'combat' | 'boss' | 'paused' */
        this.state = 'exploring';

        /** Master volume multiplier (0-1) */
        this.masterMusicVolume = 0.8;
        this.masterSFXVolume = 1.0;

        /** Music duck level for announcer (0 = no duck, 1 = fully ducked) */
        this._duckLevel = 0;

        /** Combat enemy count for state transitions */
        this._nearbyEnemies = 0;

        /** Low HP state */
        this._lowHp = false;

        // EventBus listeners — music layer transitions
        EventBus.on(Events.ENEMY_SPAWNED, this._onEnemySpawned, this);
        EventBus.on(Events.ENEMY_DIED, this._onEnemyDied, this);
        EventBus.on(Events.PLAYER_HEALTH_CHANGED, this._onHealthChanged, this);

        // EventBus listeners — SFX playback
        EventBus.on(Events.PLAYER_ATTACK, this._onPlayerAttack, this);
        EventBus.on(Events.PLAYER_DODGE, this._onPlayerDodge, this);
        EventBus.on(Events.ENTITY_DAMAGED, this._onEntityDamaged, this);
        EventBus.on(Events.PICKUP_COLLECTED, this._onPickupCollected, this);
        EventBus.on(Events.GEAR_EQUIPPED, this._onGearEquipped, this);
        EventBus.on(Events.POTION_USED, this._onPotionUsed, this);
        EventBus.on(Events.SPECIAL_USED, this._onSpecialUsed, this);
        EventBus.on(Events.SHRINE_ACTIVATED, this._onShrineActivated, this);
        EventBus.on(Events.SECRET_FOUND, this._onSecretFound, this);
        EventBus.on(Events.TRAP_TRIGGERED, this._onTrapTriggered, this);
        EventBus.on('BOSS_DEFEATED', this._onBossDefeated, this);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  MUSIC CONTROL
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Start playing biome music (single track per biome).
     * @param {string} biomeKey - 'crypt', 'caves', 'fortress', 'inferno', 'abyss'
     */
    playBiomeMusic(biomeKey) {
        if (this.currentBiome === biomeKey && this.biomeTrack) return;

        const audioKey = BIOME_MUSIC_KEYS[biomeKey];
        if (!audioKey) return;

        // Crossfade if changing biomes
        if (this.currentBiome && this.currentBiome !== biomeKey) {
            this._crossfadeToBiome(biomeKey);
            return;
        }

        this._stopBiomeTrack();
        this._stopBossTheme();
        this._stopStandalone();

        this.currentBiome = biomeKey;
        this.state = 'exploring';

        // Start single biome track
        if (this.scene.cache.audio.exists(audioKey)) {
            this.biomeTrack = this.sound.add(audioKey, {
                loop: true,
                volume: 0
            });
            this.biomeTrack.play();
            this._fadeTo(this.biomeTrack, 0.6 * this.masterMusicVolume, 500);
        }
    }

    /**
     * Transition to boss music.
     * @param {string} bossKey
     */
    playBossMusic(bossKey) {
        const audioKey = BOSS_MUSIC_KEYS[bossKey];
        if (!audioKey) return;

        this.state = 'boss';

        // Fade out biome track
        const startBossTheme = () => {
            this.scene.time.delayedCall(FADE.bossSilence, () => {
                if (!this.scene.cache.audio.exists(audioKey)) return;

                this.bossTheme = this.sound.add(audioKey, {
                    loop: true,
                    volume: 0
                });
                this.bossTheme.play();
                this._fadeTo(this.bossTheme, 0.8 * this.masterMusicVolume, FADE.bossIn);
            });
        };

        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, 0, FADE.bossOut, () => {
                this._stopBiomeTrack();
                startBossTheme();
            });
        } else {
            startBossTheme();
        }
    }

    /**
     * Play a standalone track (title, shop, death, victory).
     * @param {string} trackKey - key from STANDALONE_KEYS
     */
    playStandalone(trackKey) {
        const audioKey = STANDALONE_KEYS[trackKey];
        if (!audioKey) return;

        this._stopBiomeTrack();
        this._stopBossTheme();
        this._stopStandalone();

        if (!this.scene.cache.audio.exists(audioKey)) return;

        this.standaloneTrack = this.sound.add(audioKey, {
            loop: trackKey !== 'death' && trackKey !== 'victory',
            volume: 0
        });
        this.standaloneTrack.play();
        this._fadeTo(this.standaloneTrack, 0.7 * this.masterMusicVolume, 500);
    }

    /**
     * Stop boss music and resume biome track.
     */
    resumeBiomeMusic() {
        this._stopBossTheme();
        this.state = 'exploring';

        // Restore biome track volume
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, 0.6 * this.masterMusicVolume, 500);
        }
    }

    /**
     * Enter combat state — increases music intensity.
     */
    enterCombat() {
        if (this.state === 'boss' || this.state === 'combat') return;
        this.state = 'combat';

        // Increase biome track volume for combat intensity
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, 0.8 * this.masterMusicVolume, FADE.percIn);
        }
    }

    /**
     * Exit combat state — returns to exploration volume.
     */
    exitCombat() {
        if (this.state !== 'combat') return;
        this.state = 'exploring';

        // Return biome track to normal volume
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, 0.6 * this.masterMusicVolume, FADE.percOut);
        }
    }

    /**
     * Duck music volume for announcer playback.
     * @param {number} duckAmount - 0 to 1 (0.3-0.4 recommended)
     * @param {number} duration - duck duration in ms
     */
    duckForAnnouncer(duckAmount = 0.35, duration = 3000) {
        this._duckLevel = duckAmount;
        this._applyDuck();

        this.scene.time.delayedCall(duration, () => {
            this._duckLevel = 0;
            this._applyDuck();
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SFX
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Play a sound effect with slight random variation.
     * @param {string} key - audio key
     * @param {object} config - optional overrides
     */
    playSFX(key, config = {}) {
        if (!this.scene.cache.audio.exists(key)) return null;

        const vol = (config.volume || 1.0) * this.masterSFXVolume;
        const sfx = this.sound.play(key, {
            volume: Phaser.Math.FloatBetween(vol * 0.8, vol),
            detune: Phaser.Math.Between(-50, 50),
            ...config,
        });
        return sfx;
    }

    /**
     * Play a positional SFX (louder when closer to player).
     * @param {string} key
     * @param {number} x
     * @param {number} y
     * @param {Phaser.GameObjects.Sprite} player
     */
    playSFXPositional(key, x, y, player) {
        if (!player) return this.playSFX(key);

        const dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
        const maxDist = 400;
        const vol = Math.max(0, 1 - dist / maxDist);

        if (vol > 0.05) {
            return this.playSFX(key, { volume: vol });
        }
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  VOLUME CONTROL
    // ══════════════════════════════════════════════════════════════════════════

    setMusicVolume(vol) {
        this.masterMusicVolume = Phaser.Math.Clamp(vol, 0, 1);
        const baseVol = this.state === 'combat' ? 0.8 : 0.6;
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, baseVol * this.masterMusicVolume, 200);
        }
    }

    setSFXVolume(vol) {
        this.masterSFXVolume = Phaser.Math.Clamp(vol, 0, 1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  INTERNAL
    // ══════════════════════════════════════════════════════════════════════════

    _crossfadeToBiome(newBiome) {
        // Fade out current biome track
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            this._fadeTo(this.biomeTrack, 0, FADE.biomeCrossfade, () => {
                this._stopBiomeTrack();
                this.currentBiome = null;
                this.playBiomeMusic(newBiome);
            });
        } else {
            this.currentBiome = null;
            this.playBiomeMusic(newBiome);
        }
    }

    _stopBiomeTrack() {
        if (this.biomeTrack) {
            this.biomeTrack.stop();
            this.biomeTrack.destroy();
            this.biomeTrack = null;
        }
    }

    _stopBossTheme() {
        if (this.bossTheme) {
            this.bossTheme.stop();
            this.bossTheme.destroy();
            this.bossTheme = null;
        }
    }

    _stopStandalone() {
        if (this.standaloneTrack) {
            this.standaloneTrack.stop();
            this.standaloneTrack.destroy();
            this.standaloneTrack = null;
        }
    }

    /**
     * Fade a sound to target volume.
     */
    _fadeTo(sound, targetVol, duration, onComplete) {
        if (!sound || !sound.isPlaying) {
            if (onComplete) onComplete();
            return;
        }

        this.scene.tweens.add({
            targets: sound,
            volume: targetVol,
            duration,
            onComplete: () => { if (onComplete) onComplete(); }
        });
    }

    _applyDuck() {
        const duck = 1 - this._duckLevel;
        const baseVol = this.state === 'combat' ? 0.8 : 0.6;

        // Duck biome track
        if (this.biomeTrack && this.biomeTrack.isPlaying) {
            const target = baseVol * this.masterMusicVolume * duck;
            this._fadeTo(this.biomeTrack, target, 200);
        }

        // Also duck boss theme
        if (this.bossTheme && this.bossTheme.isPlaying) {
            const target = 0.8 * this.masterMusicVolume * duck;
            this._fadeTo(this.bossTheme, target, 200);
        }
    }

    // ── EventBus handlers ───────────────────────────────────────────────────

    _onEnemySpawned() {
        this._nearbyEnemies++;
        if (this._nearbyEnemies >= 1 && this.state === 'exploring') {
            this.enterCombat();
        }
    }

    _onEnemyDied() {
        this.playSFX('sfx_enemy_death');
        this._nearbyEnemies = Math.max(0, this._nearbyEnemies - 1);
        if (this._nearbyEnemies <= 0 && this.state === 'combat') {
            // Brief delay before exiting combat (prevent rapid toggling)
            this.scene.time.delayedCall(2000, () => {
                if (this._nearbyEnemies <= 0) {
                    this.exitCombat();
                }
            });
        }
    }

    _onHealthChanged({ hp, maxHp }) {
        const frac = hp / maxHp;
        if (frac < 0.25 && !this._lowHp) {
            this._lowHp = true;
        } else if (frac >= 0.25 && this._lowHp) {
            this._lowHp = false;
        }
    }

    // ── SFX Event Handlers ────────────────────────────────────────────────

    _onPlayerAttack() { this.playSFX('sfx_sword_swing'); }
    _onPlayerDodge() { this.playSFX('sfx_dodge'); }
    _onSpecialUsed() { this.playSFX('sfx_magic_cast'); }
    _onGearEquipped() { this.playSFX('sfx_equip'); }
    _onShrineActivated() { this.playSFX('sfx_shrine'); }
    _onSecretFound() { this.playSFX('sfx_secret'); }
    _onTrapTriggered() { this.playSFX('sfx_trap'); }
    _onBossDefeated() { this.playSFX('sfx_explosion'); }

    _onEntityDamaged({ target }) {
        if (target === this.scene.player) {
            this.playSFX('sfx_player_hit');
        } else {
            this.playSFX('sfx_hit');
        }
    }

    _onPickupCollected({ type, rarity }) {
        if (type === 'gold') this.playSFX('sfx_gold');
        else if (type === 'health' || type === 'mana') this.playSFX('sfx_potion');
        else if (type === 'gear') {
            if (rarity === 'legendary') this.playSFX('sfx_gear_legendary');
            else if (rarity === 'rare' || rarity === 'epic') this.playSFX('sfx_gear_rare');
            else this.playSFX('sfx_gear_common');
        }
        else if (type === 'chest') this.playSFX('sfx_chest_open');
    }

    _onPotionUsed() { this.playSFX('sfx_heal'); }

    /**
     * Reset enemy counter (call on floor change).
     */
    resetCombatState() {
        this._nearbyEnemies = 0;
        if (this.state === 'combat') {
            this.exitCombat();
        }
    }

    /**
     * Ensure autoplay policy is satisfied.
     * Call on first user interaction.
     */
    resumeAudioContext() {
        if (this.sound.context && this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
    }

    destroy() {
        // Music layer listeners
        EventBus.off(Events.ENEMY_SPAWNED, this._onEnemySpawned, this);
        EventBus.off(Events.ENEMY_DIED, this._onEnemyDied, this);
        EventBus.off(Events.PLAYER_HEALTH_CHANGED, this._onHealthChanged, this);

        // SFX listeners
        EventBus.off(Events.PLAYER_ATTACK, this._onPlayerAttack, this);
        EventBus.off(Events.PLAYER_DODGE, this._onPlayerDodge, this);
        EventBus.off(Events.ENTITY_DAMAGED, this._onEntityDamaged, this);
        EventBus.off(Events.PICKUP_COLLECTED, this._onPickupCollected, this);
        EventBus.off(Events.GEAR_EQUIPPED, this._onGearEquipped, this);
        EventBus.off(Events.POTION_USED, this._onPotionUsed, this);
        EventBus.off(Events.SPECIAL_USED, this._onSpecialUsed, this);
        EventBus.off(Events.SHRINE_ACTIVATED, this._onShrineActivated, this);
        EventBus.off(Events.SECRET_FOUND, this._onSecretFound, this);
        EventBus.off(Events.TRAP_TRIGGERED, this._onTrapTriggered, this);
        EventBus.off('BOSS_DEFEATED', this._onBossDefeated, this);

        this._stopBiomeTrack();
        this._stopBossTheme();
        this._stopStandalone();
    }
}
