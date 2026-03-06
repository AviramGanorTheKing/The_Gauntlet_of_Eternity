/**
 * AnnouncerSystem — voice line triggers with priority queue and cooldowns.
 *
 * Features:
 * - Priority queue: higher priority lines interrupt lower
 * - Cooldowns: 15s same trigger, 45s global for flavor lines
 * - Music ducking: 30-40% volume reduction during playback
 * - Class-aware substitution: "${className} needs food badly!"
 * - First-encounter emphasis: always play on first occurrence
 *
 * ~25 lines across categories:
 *   Health warnings (5), critical (5), death (1),
 *   Boss encounter (5), boss phase change (1), boss defeated (1),
 *   Secret found (1), kill streak (1), spawner tip (1),
 *   Treasure (1), shrine (1), floor transitions (2)
 */

import { EventBus, Events } from '../utils/EventBus.js';
import { ClassData } from '../config/ClassData.js';

/** Priority levels (higher = more important) */
const PRIORITY = {
    FLAVOR: 1,
    TIP: 2,
    WARNING: 3,
    BOSS: 4,
    CRITICAL: 5,
    DEATH: 6,
};

/** All announcer lines indexed by trigger key */
const ANNOUNCER_LINES = {
    // Health warnings (one per class)
    health_warning_warrior:     { text: '${className} needs healing badly!',      priority: PRIORITY.WARNING, audio: 'announcer_health_warning' },
    health_warning_wizard:      { text: '${className}\'s life force is fading!',  priority: PRIORITY.WARNING, audio: 'announcer_health_warning' },
    health_warning_archer:      { text: '${className} is gravely wounded!',       priority: PRIORITY.WARNING, audio: 'announcer_health_warning' },
    health_warning_valkyrie:    { text: '${className} falters!',                  priority: PRIORITY.WARNING, audio: 'announcer_health_warning' },
    health_warning_necromancer: { text: '${className}\'s grip on life weakens!',  priority: PRIORITY.WARNING, audio: 'announcer_health_warning' },

    // Critical health (one per class)
    health_critical_warrior:     { text: '${className} is about to die!',            priority: PRIORITY.CRITICAL, audio: 'announcer_health_critical' },
    health_critical_wizard:      { text: '${className}\'s mana sustains nothing!',   priority: PRIORITY.CRITICAL, audio: 'announcer_health_critical' },
    health_critical_archer:      { text: '${className}\'s quiver runs empty!',       priority: PRIORITY.CRITICAL, audio: 'announcer_health_critical' },
    health_critical_valkyrie:    { text: 'Valhalla calls for ${className}!',         priority: PRIORITY.CRITICAL, audio: 'announcer_health_critical' },
    health_critical_necromancer: { text: '${className} joins the dead!',             priority: PRIORITY.CRITICAL, audio: 'announcer_health_critical' },

    // Death
    death: { text: 'The Gauntlet claims another soul.', priority: PRIORITY.DEATH, audio: 'announcer_death' },

    // Boss encounters (one per boss)
    boss_bone_sovereign: { text: 'The Bone Sovereign rises!',     priority: PRIORITY.BOSS, audio: 'announcer_boss_encounter' },
    boss_sporemind:      { text: 'The Sporemind awakens!',        priority: PRIORITY.BOSS, audio: 'announcer_boss_encounter' },
    boss_iron_warden:    { text: 'The Iron Warden activates!',    priority: PRIORITY.BOSS, audio: 'announcer_boss_encounter' },
    boss_ember_tyrant:   { text: 'The Ember Tyrant ignites!',     priority: PRIORITY.BOSS, audio: 'announcer_boss_encounter' },
    boss_void_architect: { text: 'The Void Architect descends!',  priority: PRIORITY.BOSS, audio: 'announcer_boss_encounter' },

    // Boss phase change
    boss_phase_change: { text: 'A new phase begins!', priority: PRIORITY.BOSS, audio: 'announcer_boss_phase' },

    // Boss defeated
    boss_defeated: { text: 'The guardian falls!', priority: PRIORITY.BOSS, audio: 'announcer_boss_defeated' },

    // Discovery & gameplay
    secret_found:  { text: 'A secret is revealed!',           priority: PRIORITY.TIP,    audio: 'announcer_secret' },
    kill_streak:   { text: 'Impressive!',                     priority: PRIORITY.FLAVOR,  audio: 'announcer_streak' },
    spawner_tip:   { text: 'Destroy the generators!',         priority: PRIORITY.TIP,    audio: 'announcer_spawner' },
    treasure:      { text: 'Treasure!',                       priority: PRIORITY.FLAVOR,  audio: 'announcer_treasure' },
    shrine:        { text: 'A shrine beckons...',             priority: PRIORITY.FLAVOR,  audio: 'announcer_shrine' },

    // Floor transitions
    floor_deeper:    { text: 'Deeper into the Gauntlet...',   priority: PRIORITY.FLAVOR,  audio: 'announcer_floor_deeper' },
    floor_new_biome: { text: 'The air changes. A new realm.', priority: PRIORITY.TIP,    audio: 'announcer_floor_biome' },
};

/** Cooldown config */
const SAME_TRIGGER_COOLDOWN = 15000;   // 15 seconds
const GLOBAL_FLAVOR_COOLDOWN = 45000;  // 45 seconds for flavor lines

export class AnnouncerSystem {
    /**
     * @param {Phaser.Scene} scene
     * @param {AudioManager} audioManager
     * @param {string} classKey - player's class key for substitution
     */
    constructor(scene, audioManager, classKey) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.classKey = classKey;
        this.className = ClassData[classKey]?.name || 'Hero';

        /** Map of trigger key → last play timestamp */
        this._lastPlayTimes = {};

        /** Last global flavor line timestamp */
        this._lastFlavorTime = 0;

        /** Set of triggers that have been played at least once */
        this._firstEncounters = new Set();

        /** Currently playing announcer sound */
        this._currentSound = null;
        this._currentPriority = 0;

        /** Displayed text overlay */
        this._textOverlay = null;

        // ── EventBus listeners ──────────────────────────────────────────
        EventBus.on(Events.PLAYER_HEALTH_CHANGED, this._onHealthChanged, this);
        EventBus.on(Events.PLAYER_DEATH, this._onPlayerDeath, this);
        EventBus.on(Events.ENEMY_DIED, this._onEnemyDied, this);
        EventBus.on(Events.SECRET_FOUND, this._onSecretFound, this);
        EventBus.on(Events.SHRINE_ACTIVATED, this._onShrine, this);
        EventBus.on(Events.BOSS_DEFEATED, this._onBossDefeated, this);

        this._killStreak = 0;
        this._killStreakTimer = null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Trigger an announcer line by key.
     * @param {string} triggerKey - key from ANNOUNCER_LINES
     * @param {boolean} force - bypass cooldowns
     */
    trigger(triggerKey, force = false) {
        const line = ANNOUNCER_LINES[triggerKey];
        if (!line) return;

        const now = Date.now();
        const isFirstEncounter = !this._firstEncounters.has(triggerKey);

        // Cooldown check (skip for first encounter or forced)
        if (!force && !isFirstEncounter) {
            // Same trigger cooldown
            const lastPlay = this._lastPlayTimes[triggerKey] || 0;
            if (now - lastPlay < SAME_TRIGGER_COOLDOWN) return;

            // Global flavor cooldown
            if (line.priority <= PRIORITY.FLAVOR) {
                if (now - this._lastFlavorTime < GLOBAL_FLAVOR_COOLDOWN) return;
            }
        }

        // Priority check: don't interrupt higher priority
        if (this._currentSound && this._currentPriority > line.priority) return;

        // Play the line
        this._play(triggerKey, line, now);
        this._firstEncounters.add(triggerKey);
    }

    /**
     * Trigger a boss encounter line.
     * @param {string} bossKey
     */
    triggerBossEncounter(bossKey) {
        this.trigger(`boss_${bossKey}`, true);
    }

    /**
     * Trigger a floor transition line.
     * @param {number} floor
     * @param {boolean} newBiome
     */
    triggerFloorTransition(floor, newBiome) {
        if (newBiome) {
            this.trigger('floor_new_biome');
        } else {
            this.trigger('floor_deeper');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  PLAYBACK
    // ══════════════════════════════════════════════════════════════════════════

    _play(triggerKey, line, now) {
        // Update cooldown timestamps
        this._lastPlayTimes[triggerKey] = now;
        if (line.priority <= PRIORITY.FLAVOR) {
            this._lastFlavorTime = now;
        }

        // Stop current line if playing
        this._stopCurrent();

        this._currentPriority = line.priority;

        // Apply text substitution
        const text = line.text.replace(/\$\{className\}/g, this.className);

        // Duck music
        if (this.audioManager) {
            this.audioManager.duckForAnnouncer(0.35, 3000);
        }

        // Play audio if available
        if (line.audio && this.scene.cache.audio.exists(line.audio)) {
            this._currentSound = this.scene.sound.play(line.audio, {
                volume: 0.9,
            });

            // Clear on complete
            if (this._currentSound && this._currentSound.on) {
                this._currentSound.on('complete', () => {
                    this._currentSound = null;
                    this._currentPriority = 0;
                });
            }
        }

        // Show text overlay
        this._showTextOverlay(text);

        // Auto-clear priority after duration
        this.scene.time.delayedCall(3000, () => {
            this._currentPriority = 0;
        });
    }

    _stopCurrent() {
        if (this._currentSound && this._currentSound.stop) {
            this._currentSound.stop();
        }
        this._currentSound = null;
        this._currentPriority = 0;
        this._hideTextOverlay();
    }

    _showTextOverlay(text) {
        this._hideTextOverlay();

        const W = this.scene.game.config.width;

        this._textOverlay = this.scene.add.text(W / 2, 90, text, {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#ffdd88', stroke: '#000', strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(800).setAlpha(0);

        this.scene.tweens.add({
            targets: this._textOverlay,
            alpha: 1,
            duration: 200,
        });

        // Auto-dismiss after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            if (this._textOverlay?.active) {
                this.scene.tweens.add({
                    targets: this._textOverlay,
                    alpha: 0, y: this._textOverlay.y - 15,
                    duration: 500,
                    onComplete: () => this._hideTextOverlay()
                });
            }
        });
    }

    _hideTextOverlay() {
        if (this._textOverlay?.active) {
            this._textOverlay.destroy();
        }
        this._textOverlay = null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  EVENT HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    _onHealthChanged({ hp, maxHp }) {
        const frac = hp / maxHp;

        if (frac <= 0.10 && frac > 0) {
            this.trigger(`health_critical_${this.classKey}`);
        } else if (frac <= 0.25 && frac > 0.10) {
            this.trigger(`health_warning_${this.classKey}`);
        }
    }

    _onPlayerDeath() {
        this.trigger('death', true);
    }

    _onEnemyDied() {
        this._killStreak++;

        // Reset streak after 3s of no kills
        if (this._killStreakTimer) clearTimeout(this._killStreakTimer);
        this._killStreakTimer = setTimeout(() => { this._killStreak = 0; }, 3000);

        if (this._killStreak >= 10) {
            this.trigger('kill_streak');
        }
    }

    _onSecretFound() {
        this.trigger('secret_found', true);
    }

    _onShrine() {
        this.trigger('shrine');
    }

    _onBossDefeated() {
        this.trigger('boss_defeated', true);
    }

    destroy() {
        EventBus.off(Events.PLAYER_HEALTH_CHANGED, this._onHealthChanged, this);
        EventBus.off(Events.PLAYER_DEATH, this._onPlayerDeath, this);
        EventBus.off(Events.ENEMY_DIED, this._onEnemyDied, this);
        EventBus.off(Events.SECRET_FOUND, this._onSecretFound, this);
        EventBus.off(Events.SHRINE_ACTIVATED, this._onShrine, this);
        EventBus.off(Events.BOSS_DEFEATED, this._onBossDefeated, this);

        this._stopCurrent();
        if (this._killStreakTimer) clearTimeout(this._killStreakTimer);
    }
}
