import { applyCRTShader } from '../shaders/CRTShader.js';
import { LoreData } from '../config/LoreData.js';
import { saveManager } from '../systems/SaveManager.js';

/**
 * DeathScene — dramatic "one more run" game over screen.
 *
 * Features:
 * - CRT static/glitch burst on entry
 * - Stats tick up numerically with counting effect
 * - Soul Shards counter with sparkle particle emitter
 * - "NEW BEST" badges on personal records
 * - Cause of death line
 * - Unlock progress tease
 * - Large pulsing TRY AGAIN button
 * - Rotating lore fragment below stats
 */
export class DeathScene extends Phaser.Scene {
    constructor() {
        super('DeathScene');
    }

    init(data) {
        this.killCount = data.killCount || 0;
        this.damageDealt = data.damageDealt || 0;
        this.floor = data.floor || 1;
        this.gold = data.gold || 0;
        this.shardsEarned = data.shardsEarned || 0;
        this.shardBreakdown = data.shardBreakdown || {};
        this.causeOfDeath = data.causeOfDeath || 'Unknown';
        this.classKey = data.classKey || 'warrior';
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Apply CRT shader
        this.crtPipeline = applyCRTShader(this, 'arcade');

        // ── CRT static/glitch burst on entry ─────────────────────────────
        this._doEntryGlitch(W, H);

        // Background
        this._createBackground(W, H);

        // Dramatic title
        this._createTitle(W, H);

        // Cause of death
        this._createCauseOfDeath(W, H);

        // Stats with tick-up counters
        this._createTickUpStats(W, H);

        // Unlock progress tease
        this._createUnlockTease(W, H);

        // Lore fragment
        this._createLoreFragment(W, H);

        // Action buttons
        this._createActionButtons(W, H);

        // Input (delayed slightly for dramatic effect)
        this.time.delayedCall(2000, () => {
            this.input.keyboard.on('keydown-ENTER', () => this._tryAgain());
            this.input.keyboard.on('keydown-SPACE', () => this._tryAgain());
            this.input.keyboard.on('keydown-ESC', () => this._returnToMenu());
            this.input.keyboard.on('keydown-T', () => this._returnToSkillTree());
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ENTRY GLITCH
    // ══════════════════════════════════════════════════════════════════════════

    _doEntryGlitch(W, H) {
        // Brief CRT static burst
        if (this.crtPipeline) {
            this.crtPipeline.setChromaticAmount(5.0);
            this.crtPipeline.setScanlineWeight(0.5);
            this.crtPipeline.setFlicker(1.0);

            this.time.delayedCall(200, () => {
                this.crtPipeline.setChromaticAmount(1.5);
                this.crtPipeline.setScanlineWeight(0.25);
                this.crtPipeline.setFlicker(0.8);
            });
        }

        // Static noise overlay
        const staticGfx = this.add.graphics().setDepth(900);
        for (let i = 0; i < 300; i++) {
            staticGfx.fillStyle(0xffffff, Math.random() * 0.3);
            staticGfx.fillRect(Math.random() * W, Math.random() * H, 3, 1);
        }
        this.tweens.add({
            targets: staticGfx,
            alpha: 0,
            duration: 400,
            onComplete: () => staticGfx.destroy()
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BACKGROUND
    // ══════════════════════════════════════════════════════════════════════════

    _createBackground(W, H) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0008, 0x0a0008, 0x1a0010, 0x1a0010, 1);
        bg.fillRect(0, 0, W, H);

        // Red vignette pulse
        const vignette = this.add.graphics().setDepth(1);
        vignette.fillStyle(0xff0000, 0.1);
        vignette.fillRect(0, 0, W, 30);
        vignette.fillRect(0, H - 30, W, 30);
        vignette.fillRect(0, 0, 30, H);
        vignette.fillRect(W - 30, 0, 30, H);

        this.tweens.add({
            targets: vignette,
            alpha: 0.05,
            duration: 1500,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Red particles
        if (this.textures.exists('particle_red')) {
            this.add.particles(W / 2, H, 'particle_red', {
                x: { min: -W / 2, max: W / 2 },
                y: { min: -H, max: 0 },
                speed: { min: 5, max: 20 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.5, end: 0 },
                lifespan: 5000, frequency: 500,
                alpha: { start: 0.3, end: 0 },
                tint: [0xff4444, 0xaa2222, 0x660000]
            }).setDepth(2);
        }

        // Skull graphic
        const skullGfx = this.add.graphics().setDepth(3);
        const sx = W / 2;
        const sy = 70;
        skullGfx.fillStyle(0x442222, 0.8);
        skullGfx.fillCircle(sx, sy, 25);
        skullGfx.fillRect(sx - 16, sy, 32, 20);
        skullGfx.fillStyle(0x000000, 1);
        skullGfx.fillCircle(sx - 8, sy - 4, 6);
        skullGfx.fillCircle(sx + 8, sy - 4, 6);
        skullGfx.fillTriangle(sx, sy + 4, sx - 3, sy + 12, sx + 3, sy + 12);
        skullGfx.lineStyle(2, 0x000000, 0.8);
        for (let i = -3; i <= 3; i++) {
            skullGfx.lineBetween(sx + i * 4, sy + 20, sx + i * 4, sy + 28);
        }
        this.tweens.add({ targets: skullGfx, alpha: 0.5, duration: 1000, yoyo: true, repeat: -1 });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TITLE
    // ══════════════════════════════════════════════════════════════════════════

    _createTitle(W, H) {
        this.add.text(W / 2 + 4, 115, 'YOU HAVE FALLEN', {
            fontFamily: 'monospace', fontSize: '40px', color: '#000000'
        }).setOrigin(0.5).setDepth(4);

        const title = this.add.text(W / 2, 112, 'YOU HAVE FALLEN', {
            fontFamily: 'monospace', fontSize: '40px',
            color: '#cc2222', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 800,
            ease: 'Back.easeOut',
            delay: 200
        });

        // Title glow after appear
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: title,
                alpha: 0.7,
                duration: 1200,
                yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  CAUSE OF DEATH
    // ══════════════════════════════════════════════════════════════════════════

    _createCauseOfDeath(W, H) {
        const cause = this.add.text(W / 2, 148, `Slain by: ${this.causeOfDeath}`, {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#884444', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets: cause,
            alpha: 1,
            duration: 500,
            delay: 600
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TICK-UP STATS
    // ══════════════════════════════════════════════════════════════════════════

    _createTickUpStats(W, H) {
        // Check for personal bests
        const permanent = saveManager.getPermanent();
        const bestFloor = permanent.bestFloor || 0;
        const isNewBestFloor = this.floor > bestFloor;

        const stats = [
            { label: 'Floor Reached', value: this.floor, color: '#ffaa44', isBest: isNewBestFloor },
            { label: 'Enemies Slain', value: this.killCount, color: '#ff6666', isBest: false },
            { label: 'Damage Dealt', value: this.damageDealt, color: '#ff8888', isBest: false },
            { label: 'Gold Collected', value: this.gold, color: '#ffcc00', isBest: false },
        ];

        const panelX = W / 2 - 160;
        const panelY = 172;
        const panelW = 320;
        const spacing = 28;
        const panelH = stats.length * spacing + 60; // extra for shards

        // Stats panel
        const panel = this.add.graphics().setDepth(4);
        panel.fillStyle(0x110808, 0.85);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
        panel.lineStyle(1, 0x442222, 1);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

        stats.forEach((stat, i) => {
            const y = panelY + 14 + i * spacing;
            const delay = 800 + i * 300;

            // Label
            const label = this.add.text(panelX + 15, y, stat.label + ':', {
                fontFamily: 'monospace', fontSize: '12px', color: '#888888'
            }).setDepth(5).setAlpha(0);

            // Tick-up value
            const valueText = this.add.text(panelX + panelW - 15, y, '0', {
                fontFamily: 'monospace', fontSize: '14px',
                color: stat.color, stroke: '#000000', strokeThickness: 2
            }).setOrigin(1, 0).setDepth(5).setAlpha(0);

            // Animate label appearance
            this.tweens.add({
                targets: label,
                alpha: 1, x: panelX + 20,
                duration: 300, ease: 'Power2', delay
            });

            // Tick-up counter animation
            this.time.delayedCall(delay + 100, () => {
                valueText.setAlpha(1);
                const targetVal = typeof stat.value === 'number' ? stat.value : parseInt(stat.value) || 0;
                let current = 0;
                const duration = 600;
                const steps = 20;
                const stepDelay = duration / steps;

                const tickTimer = this.time.addEvent({
                    delay: stepDelay,
                    callback: () => {
                        current = Math.min(current + Math.ceil(targetVal / steps), targetVal);
                        valueText.setText(String(current));
                        if (current >= targetVal) tickTimer.destroy();
                    },
                    loop: true
                });
            });

            // NEW BEST badge
            if (stat.isBest) {
                this.time.delayedCall(delay + 800, () => {
                    const badge = this.add.text(panelX + panelW - 55, y - 2, 'NEW BEST', {
                        fontFamily: 'monospace', fontSize: '8px',
                        color: '#ffcc00', stroke: '#000', strokeThickness: 2,
                        backgroundColor: '#332200', padding: { x: 3, y: 1 }
                    }).setDepth(6).setAlpha(0).setScale(0.5);

                    this.tweens.add({
                        targets: badge,
                        alpha: 1, scaleX: 1, scaleY: 1,
                        duration: 300,
                        ease: 'Back.easeOut'
                    });

                    // Gold flash
                    this.cameras.main.flash(100, 255, 204, 0);
                });
            }
        });

        // ── Soul Shards (dramatic tick-up with sparkle) ──────────────────
        const shardsY = panelY + 14 + stats.length * spacing;
        const shardsDelay = 800 + stats.length * 300 + 200;

        this.add.text(panelX + 15, shardsY, 'Soul Shards:', {
            fontFamily: 'monospace', fontSize: '12px', color: '#888888'
        }).setDepth(5).setAlpha(0).setName('shardsLabel');

        const shardsValue = this.add.text(panelX + panelW - 15, shardsY, '0', {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#cc88ff', stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setDepth(5).setAlpha(0);

        this.time.delayedCall(shardsDelay, () => {
            // Show label
            const lbl = this.children.getByName('shardsLabel');
            if (lbl) this.tweens.add({ targets: lbl, alpha: 1, duration: 300 });

            shardsValue.setAlpha(1);
            let current = 0;
            const target = this.shardsEarned;
            const steps = 30;
            const stepDelay = 800 / steps;

            const tickTimer = this.time.addEvent({
                delay: stepDelay,
                callback: () => {
                    current = Math.min(current + Math.ceil(target / steps), target);
                    shardsValue.setText(`+${current}`);
                    if (current >= target) tickTimer.destroy();
                },
                loop: true
            });

            // Sparkle particle emitter around shards value
            if (this.textures.exists('particle_purple')) {
                const emitter = this.add.particles(panelX + panelW - 30, shardsY + 8, 'particle_purple', {
                    speed: { min: 10, max: 40 },
                    scale: { start: 0.4, end: 0 },
                    lifespan: 800,
                    frequency: 100,
                    alpha: { start: 0.8, end: 0 },
                    tint: [0xcc88ff, 0xaa66dd],
                    quantity: 2
                }).setDepth(6);

                this.time.delayedCall(1500, () => emitter.stop());
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  UNLOCK TEASE
    // ══════════════════════════════════════════════════════════════════════════

    _createUnlockTease(W, H) {
        const permanent = saveManager.getPermanent();
        const unlocked = permanent.unlockedClasses || ['warrior', 'wizard', 'archer'];

        let teaseText = '';
        if (!unlocked.includes('valkyrie') && this.floor >= 7) {
            teaseText = `Valkyrie unlocks at Floor 11 (you reached Floor ${this.floor})`;
        } else if (!unlocked.includes('necromancer') && this.floor >= 16) {
            teaseText = `Necromancer unlocks at Floor 20 Boss (you reached Floor ${this.floor})`;
        }

        if (teaseText) {
            const tease = this.add.text(W / 2, H - 120, teaseText, {
                fontFamily: 'monospace', fontSize: '10px',
                color: '#cc88ff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5).setAlpha(0);

            this.tweens.add({
                targets: tease,
                alpha: 1,
                duration: 500,
                delay: 3000
            });

            // Subtle pulse to draw attention
            this.time.delayedCall(3500, () => {
                this.tweens.add({
                    targets: tease,
                    alpha: 0.5,
                    duration: 800,
                    yoyo: true, repeat: 3
                });
            });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  LORE FRAGMENT
    // ══════════════════════════════════════════════════════════════════════════

    _createLoreFragment(W, H) {
        // Pick a lore fragment based on deepest biome reached
        const fragments = this._getDeathLoreFragments();
        if (fragments.length === 0) return;

        const fragment = fragments[Math.floor(Math.random() * fragments.length)];

        const loreText = this.add.text(W / 2, H - 138, '', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#666677', stroke: '#000', strokeThickness: 1,
            fontStyle: 'italic', align: 'center',
            wordWrap: { width: 380 }
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        // Typewriter reveal after stats are done
        this.time.delayedCall(3200, () => {
            loreText.setAlpha(1);
            let charIdx = 0;
            const timer = this.time.addEvent({
                delay: 35,
                callback: () => {
                    charIdx++;
                    loreText.setText(`"${fragment.substring(0, charIdx)}"`);
                    if (charIdx >= fragment.length) timer.destroy();
                },
                loop: true
            });
        });
    }

    _getDeathLoreFragments() {
        const biomeFragments = {
            1: [ // Crypt (floors 1-5)
                'The bones remember what the living forget.',
                'He wished them back. They came — but wrong.',
                'In the crypt, even silence has weight.',
            ],
            2: [ // Caves (floors 6-10)
                'The spores carry memories of a druid\'s dream.',
                'Growth without purpose is just decay with ambition.',
                'She poured her power into the earth. The earth drank deep.',
            ],
            3: [ // Fortress (floors 11-15)
                'Every escape tunnel led back to the same room.',
                'The gears turn. The builder never finished.',
                'Freedom is a blueprint. The walls are real.',
            ],
            4: [ // Inferno (floors 16-20)
                'Power consumed him. He became the flame.',
                'The heat erases. Only ashes remember.',
                'He wished for strength. The dungeon obliged.',
            ],
            5: [ // Abyss (floors 21-25)
                'The first hero wished to understand. Now there is no hero.',
                'The cycle feeds. Every century, it rises.',
                'Reality bends. The dungeon watches you back.',
            ],
        };

        const biomeIndex = Math.min(5, Math.ceil(this.floor / 5));
        const frags = [];
        for (let i = 1; i <= biomeIndex; i++) {
            frags.push(...(biomeFragments[i] || []));
        }
        return frags;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ACTION BUTTONS
    // ══════════════════════════════════════════════════════════════════════════

    _createActionButtons(W, H) {
        // TRY AGAIN — largest, most prominent, pulsing
        const tryAgainBtn = this.add.text(W / 2, H * 0.78, 'TRY AGAIN', {
            fontFamily: 'monospace', fontSize: '22px',
            color: '#ffcc00', stroke: '#000000', strokeThickness: 3,
            backgroundColor: '#332200', padding: { x: 24, y: 10 }
        }).setOrigin(0.5).setDepth(5).setAlpha(0).setInteractive();

        this.tweens.add({
            targets: tryAgainBtn,
            alpha: 1,
            duration: 500,
            delay: 2200
        });

        this.time.delayedCall(2700, () => {
            this.tweens.add({
                targets: tryAgainBtn,
                scaleX: 1.05, scaleY: 1.05,
                duration: 500,
                yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        tryAgainBtn.on('pointerover', () => tryAgainBtn.setColor('#ffdd44'));
        tryAgainBtn.on('pointerout', () => tryAgainBtn.setColor('#ffcc00'));
        tryAgainBtn.on('pointerdown', () => this._tryAgain());

        // Skill Tree button
        const skillText = this.add.text(W / 2, H * 0.87, '[T] Spend Soul Shards', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#cc88ff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5).setAlpha(0).setInteractive();

        this.tweens.add({ targets: skillText, alpha: 1, duration: 500, delay: 2500 });
        skillText.on('pointerdown', () => this._returnToSkillTree());

        // Menu button
        const menuText = this.add.text(W / 2, H * 0.92, '[ESC] Return to Menu', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#666666', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({ targets: menuText, alpha: 1, duration: 500, delay: 2700 });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  NAVIGATION
    // ══════════════════════════════════════════════════════════════════════════

    _tryAgain() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.cameras.main.flash(150, 255, 255, 255);
        this.time.delayedCall(200, () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('CharSelectScene');
            });
        });
    }

    _returnToSkillTree() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('SkillTreeScene', { returnScene: 'CharSelectScene' });
        });
    }

    _returnToMenu() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}
