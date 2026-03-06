/**
 * MoralChoiceSystem — tracks 3 moral choices throughout a run
 * that determine which of 4 endings the player gets.
 *
 * Choice 1 (Compassion): Fungal Caves, floor ~8  — free a trapped ghost
 * Choice 2 (Mercy):      Iron Fortress, floor ~13 — spare a surrendering mini-boss
 * Choice 3 (Sacrifice):  Inferno, floor ~18       — sacrifice gear for companion
 *
 * Endings:
 *  - 3 selfless → Liberation
 *  - 3 selfish  → Ascension
 *  - Mixed      → Escape
 *  - All skipped → The Eternal
 *
 * Enhanced presentation:
 *  - Music drops to ambient-only when entering choice area
 *  - Enemy spawning pauses
 *  - Announcer goes silent (absence signals importance)
 *  - Subtle environmental consequences afterward:
 *    Selfless: spectral allies briefly appear, soft chime on room entry
 *    Selfish: enemies more aggressive, faint rumble on room entry
 *  - Choices are never labeled as good/bad
 */

import { EventBus } from '../utils/EventBus.js';
import { LoreData } from '../config/LoreData.js';

const CHOICE_FLOORS = {
    compassion: 8,
    mercy: 13,
    sacrifice: 18,
};

export class MoralChoiceSystem {
    constructor(scene) {
        this.scene = scene;

        /** Choices made: { compassion: 'selfless'|'selfish'|null, mercy: ..., sacrifice: ... } */
        this.choices = {
            compassion: null,
            mercy: null,
            sacrifice: null,
        };

        /** Floors where choices have been presented (prevent re-trigger) */
        this.presented = new Set();

        /** Whether a choice UI is currently active */
        this.choiceActive = false;

        /** Consequence state: tracks selfless/selfish tendencies for environmental effects */
        this._selflessCount = 0;
        this._selfishCount = 0;
    }

    /**
     * Check if a moral choice should be triggered on this floor.
     * Call from GameScene.buildFloor().
     */
    checkForChoice(floorNumber) {
        for (const [choiceKey, targetFloor] of Object.entries(CHOICE_FLOORS)) {
            if (floorNumber === targetFloor && !this.presented.has(choiceKey)) {
                this.presented.add(choiceKey);
                // Delay to let floor build complete
                this.scene.time.delayedCall(2000, () => {
                    this.presentChoice(choiceKey);
                });
                return;
            }
        }
    }

    /**
     * Present a moral choice with enhanced atmosphere.
     */
    presentChoice(choiceKey) {
        if (this.choiceActive) return;
        this.choiceActive = true;

        const choiceData = LoreData.moralChoices[choiceKey];
        if (!choiceData) {
            this.choiceActive = false;
            return;
        }

        // ── Atmosphere: drop music to ambient-only ──────────────────────
        if (this.scene.audioManager) {
            this.scene.audioManager.exitCombat();
            // Further reduce to just ambient (with null checks)
            const stems = this.scene.audioManager.stems;
            if (stems) {
                if (stems.percussion?.isPlaying) {
                    this.scene.tweens.add({ targets: stems.percussion, volume: 0, duration: 1000 });
                }
                if (stems.melody?.isPlaying) {
                    this.scene.tweens.add({ targets: stems.melody, volume: 0, duration: 800 });
                }
                // Reduce ambient volume for solemnity
                if (stems.ambient?.isPlaying) {
                    this.scene.tweens.add({ targets: stems.ambient, volume: 0.3, duration: 1000 });
                }
            }
        }

        // ── Pause enemy spawning ────────────────────────────────────────
        this._pausedSpawners = [];
        if (this.scene.spawners) {
            this.scene.spawners.getChildren().forEach(spawner => {
                if (spawner.active && spawner.spawnTimer && typeof spawner.spawnTimer === 'object') {
                    spawner.spawnTimer.paused = true;
                    this._pausedSpawners.push(spawner);
                } else if (spawner.active) {
                    // Mark spawner as paused even if timer is a different type
                    spawner._wasPaused = true;
                    this._pausedSpawners.push(spawner);
                }
            });
        }

        // ── Silence announcer ───────────────────────────────────────────
        // (Absence IS the signal — don't trigger any announcer lines)
        this._announcerWasSilenced = true;

        const W = this.scene.game.config.width;
        const H = this.scene.game.config.height;

        // Dim overlay (slower fade for solemnity)
        const overlay = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
            .setScrollFactor(0).setDepth(500);
        this.scene.tweens.add({ targets: overlay, alpha: 0.65, duration: 1000 });

        // Choice panel
        const panelW = 420;
        const panelH = 200;
        const panel = this.scene.add.graphics().setScrollFactor(0).setDepth(501);
        panel.fillStyle(0x111122, 0.95);
        panel.fillRoundedRect(W / 2 - panelW / 2, H / 2 - panelH / 2, panelW, panelH, 10);
        panel.lineStyle(2, 0x8866cc, 1);
        panel.strokeRoundedRect(W / 2 - panelW / 2, H / 2 - panelH / 2, panelW, panelH, 10);
        panel.setAlpha(0);
        this.scene.tweens.add({ targets: panel, alpha: 1, duration: 800, delay: 500 });

        // Prompt text (typewriter reveal)
        const promptText = this.scene.add.text(W / 2, H / 2 - 60, '', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#ddddff', stroke: '#000', strokeThickness: 2,
            align: 'center', wordWrap: { width: panelW - 40 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(502);

        // Typewriter the prompt
        this.scene.time.delayedCall(800, () => {
            let charIdx = 0;
            const fullText = choiceData.prompt;
            const timer = this.scene.time.addEvent({
                delay: 40,
                callback: () => {
                    charIdx++;
                    promptText.setText(fullText.substring(0, charIdx));
                    if (charIdx >= fullText.length) timer.destroy();
                },
                loop: true,
            });
        });

        // Selfless button (delayed appearance)
        const selflessBtn = this.scene.add.text(W / 2, H / 2 + 10, choiceData.selfless, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#88ccff', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#112233', padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive().setAlpha(0);

        // Selfish button (delayed appearance)
        const selfishBtn = this.scene.add.text(W / 2, H / 2 + 55, choiceData.selfish, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ff8888', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#331122', padding: { x: 12, y: 8 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive().setAlpha(0);

        // Fade buttons in after prompt appears
        this.scene.time.delayedCall(2000, () => {
            this.scene.tweens.add({ targets: selflessBtn, alpha: 1, duration: 400 });
            this.scene.tweens.add({ targets: selfishBtn, alpha: 1, duration: 400, delay: 200 });
        });

        // Hover effects
        for (const btn of [selflessBtn, selfishBtn]) {
            btn.on('pointerover', () => btn.setScale(1.05));
            btn.on('pointerout', () => btn.setScale(1.0));
        }

        const cleanupUI = () => {
            this.scene.tweens.add({
                targets: [overlay, panel, promptText, selflessBtn, selfishBtn],
                alpha: 0, duration: 500,
                onComplete: () => {
                    overlay.destroy();
                    panel.destroy();
                    promptText.destroy();
                    selflessBtn.destroy();
                    selfishBtn.destroy();
                }
            });
            this.choiceActive = false;
            this._restoreAtmosphere();
        };

        selflessBtn.on('pointerdown', () => {
            this.makeChoice(choiceKey, 'selfless');
            cleanupUI();
            this._applySelflessConsequence(choiceKey);
        });

        selfishBtn.on('pointerdown', () => {
            this.makeChoice(choiceKey, 'selfish');
            cleanupUI();
            this._applySelfishConsequence(choiceKey);
        });
    }

    /**
     * Record a choice.
     */
    makeChoice(choiceKey, decision) {
        this.choices[choiceKey] = decision;
        if (decision === 'selfless') this._selflessCount++;
        if (decision === 'selfish') this._selfishCount++;
        EventBus.emit('moral:choice', { choiceKey, decision });
    }

    /**
     * Restore atmosphere after choice is made.
     */
    _restoreAtmosphere() {
        // Resume spawners
        if (this._pausedSpawners) {
            for (const spawner of this._pausedSpawners) {
                if (spawner.active) {
                    // Handle proper Timer objects
                    if (spawner.spawnTimer && typeof spawner.spawnTimer === 'object') {
                        spawner.spawnTimer.paused = false;
                    }
                    // Clear the backup paused flag
                    if (spawner._wasPaused) {
                        delete spawner._wasPaused;
                    }
                }
            }
            this._pausedSpawners = null;
        }

        // Restore music
        if (this.scene.audioManager) {
            this.scene.audioManager.resetCombatState();
        }
    }

    /**
     * Apply consequence of selfless choice.
     */
    _applySelflessConsequence(choiceKey) {
        const player = this.scene.player;
        if (!player) return;

        switch (choiceKey) {
            case 'compassion':
                // Costs 20% HP
                const cost = Math.floor(player.maxHp * 0.20);
                player.hp = Math.max(1, player.hp - cost);
                EventBus.emit('player:healthChanged', { hp: player.hp, maxHp: player.maxHp });
                this._showChoiceResult('The spirit is free. You feel lighter.');
                break;
            case 'mercy':
                // No loot reward
                this._showChoiceResult('It bows and vanishes. Mercy has a cost.');
                break;
            case 'sacrifice':
                // Sacrifice best equipment
                if (player.weapons) {
                    player.weapons = [null, null];
                    player.activeWeaponIndex = 0;
                    player._recalcWeaponStats();
                }
                if (player.gear) {
                    player.gear.armor = null;
                }
                this._showChoiceResult('Your companion rises. Your sacrifice is remembered.');
                break;
        }

        // Spectral ally visual hint (brief ghostly figure)
        this._showSpectralEffect(true);
    }

    /**
     * Apply consequence of selfish choice.
     */
    _applySelfishConsequence(choiceKey) {
        const player = this.scene.player;
        if (!player) return;

        switch (choiceKey) {
            case 'compassion':
                this._showChoiceResult('You walk past. The ghost fades to nothing.');
                break;
            case 'mercy':
                // Grant epic gear
                if (this.scene.lootSystem) {
                    this.scene.lootSystem.spawnPickup(player.x + 20, player.y, 'gear');
                }
                this._showChoiceResult('Power claimed. The weak serve the strong.');
                break;
            case 'sacrifice':
                this._showChoiceResult('You keep what is yours. Your companion is gone.');
                break;
        }

        // Darkness visual hint (brief rumble)
        this._showSpectralEffect(false);
    }

    /**
     * Show environmental consequence visual.
     * @param {boolean} selfless - true for spectral allies, false for aggression
     */
    _showSpectralEffect(selfless) {
        if (selfless) {
            // Soft chime + spectral ally figure
            const player = this.scene.player;
            if (!player) return;

            // Brief ghostly figure nearby
            const ghost = this.scene.add.graphics().setDepth(200).setAlpha(0);
            ghost.fillStyle(0x88ccff, 0.3);
            ghost.fillCircle(player.x + 50, player.y - 10, 10);
            ghost.fillRect(player.x + 42, player.y, 16, 20);

            this.scene.tweens.add({
                targets: ghost,
                alpha: 0.5,
                duration: 1000,
                yoyo: true,
                hold: 2000,
                onComplete: () => ghost.destroy()
            });
        } else {
            // Brief screen rumble
            this.scene.cameras.main.shake(500, 0.005);
        }
    }

    /**
     * Show floating result text.
     */
    _showChoiceResult(message) {
        const W = this.scene.game.config.width;
        const H = this.scene.game.config.height;

        const text = this.scene.add.text(W / 2, H / 2, message, {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#ddddff', stroke: '#000', strokeThickness: 3,
            align: 'center', wordWrap: { width: 350 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

        this.scene.tweens.add({
            targets: text,
            y: H / 2 - 40,
            alpha: 0,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => text.destroy(),
        });
    }

    /**
     * Check for room-entry consequences (subtle environmental effects).
     * Call from GameScene when entering a new room.
     */
    applyRoomEntryConsequences() {
        if (this._selflessCount > this._selfishCount && this._selflessCount > 0) {
            // Selfless tendency: brief spectral ally, soft blue glow
            const player = this.scene.player;
            if (player && Math.random() < 0.3) {
                const glow = this.scene.add.graphics().setDepth(150).setAlpha(0);
                glow.fillStyle(0x88ccff, 0.05);
                glow.fillCircle(player.x + Phaser.Math.Between(-60, 60),
                    player.y + Phaser.Math.Between(-60, 60), 20);
                this.scene.tweens.add({
                    targets: glow, alpha: 0.3,
                    duration: 800, yoyo: true,
                    onComplete: () => glow.destroy()
                });
            }
        } else if (this._selfishCount > this._selflessCount && this._selfishCount > 0) {
            // Selfish tendency: faint rumble, enemies slightly more aggressive
            if (Math.random() < 0.3) {
                this.scene.cameras.main.shake(200, 0.002);
            }
        }
    }

    /**
     * Determine ending based on choices made.
     * @returns {'liberation'|'ascension'|'escape'|'eternal'}
     */
    determineEnding() {
        const values = Object.values(this.choices);
        const selfless = values.filter(v => v === 'selfless').length;
        const selfish = values.filter(v => v === 'selfish').length;
        const skipped = values.filter(v => v === null).length;

        if (skipped === 3) return 'eternal';
        if (selfless === 3) return 'liberation';
        if (selfish === 3) return 'ascension';
        return 'escape';
    }

    /**
     * Get current choices state (for save data).
     */
    getState() {
        return {
            choices: { ...this.choices },
            presented: [...this.presented],
        };
    }

    /**
     * Restore state from save data.
     */
    restoreState(state) {
        if (state?.choices) {
            Object.assign(this.choices, state.choices);
            // Recount
            this._selflessCount = Object.values(this.choices).filter(v => v === 'selfless').length;
            this._selfishCount = Object.values(this.choices).filter(v => v === 'selfish').length;
        }
        if (state?.presented) {
            this.presented = new Set(state.presented);
        }
    }

    destroy() {
        // No persistent listeners to clean up
    }
}
