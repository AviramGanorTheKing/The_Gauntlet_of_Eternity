import { ClassData } from '../config/ClassData.js';
import { applyCRTShader } from '../shaders/CRTShader.js';
import { saveManager } from '../systems/SaveManager.js';

/**
 * CharSelectScene — class and companion picker.
 * Enhanced with:
 * - Selected class sprite plays idle animation (PIPOYA walk anim)
 * - Spotlight glow behind selected class, tinted with class color
 * - On select: attack animation, spotlight intensifies, background tints
 * - Locked classes: dark silhouette + pulsing "?" overlay
 * - Transition to game: character walks forward and fades
 */

const CLASS_COLORS = {
    warrior:     { tint: 0xff6644, hex: '#ff6644', bg: 0x331a11 },
    wizard:      { tint: 0x6688ff, hex: '#6688ff', bg: 0x112233 },
    archer:      { tint: 0x44cc44, hex: '#44cc44', bg: 0x113311 },
    valkyrie:    { tint: 0xffdd44, hex: '#ffdd44', bg: 0x332211 },
    necromancer: { tint: 0xaa44ff, hex: '#aa44ff', bg: 0x221133 },
};

export class CharSelectScene extends Phaser.Scene {
    constructor() {
        super('CharSelectScene');
    }

    preload() {
        const classes = ['warrior', 'wizard', 'archer', 'valkyrie', 'necromancer'];
        for (const cls of classes) {
            const key = `portrait_${cls}`;
            if (!this.textures.exists(key)) {
                this.load.image(key, `assets/sprites/Class/portrait_${cls}.png`);
            }
        }
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Apply CRT shader
        this.crtPipeline = applyCRTShader(this, 'subtle');

        // Background
        this._bgGfx = this.add.graphics();
        this._bgGfx.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3a, 0x1a1a3a, 1);
        this._bgGfx.fillRect(0, 0, W, H);

        // Background tint overlay (changes with class color)
        this._bgTint = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
            .setDepth(0);

        // Decorative grid
        const grid = this.add.graphics().setAlpha(0.06);
        for (let x = 0; x < W; x += 30) {
            grid.lineStyle(1, 0x4444aa, 0.3);
            grid.lineBetween(x, 0, x, H);
        }
        for (let y = 0; y < H; y += 30) {
            grid.lineBetween(0, y, W, y);
        }

        // Title
        this.add.text(W / 2, 35, 'CHOOSE YOUR CLASS', {
            fontFamily: 'monospace', fontSize: '18px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // State
        const classKeys = Object.keys(ClassData);
        this.selectedClass = 'warrior';
        this.selectedCompanions = [];

        // ── Class cards ─────────────────────────────────────────────────
        const startX = 80;
        const startY = 75;
        const cardW = 130;
        const cardH = 200;
        const gap = 10;

        this.classCards = [];
        this._spotlights = {};
        this._sprites = {};
        this._lockedOverlays = {};

        classKeys.forEach((key, i) => {
            const data = ClassData[key];
            const cx = startX + (cardW + gap) * i;
            const cy = startY;
            const isLocked = !saveManager.isClassUnlocked(key);
            const colors = CLASS_COLORS[key] || CLASS_COLORS.warrior;

            // Card background
            const card = this.add.graphics().setDepth(1);
            this.classCards.push({ key, card, cx, cy, cardW, cardH });

            // Spotlight glow (behind sprite, only for unlocked)
            if (!isLocked) {
                const spotlight = this.add.graphics().setDepth(2);
                this._spotlights[key] = spotlight;
            }

            if (isLocked) {
                // ── Locked class: dark silhouette with pulsing "?" ──
                card.fillStyle(0x0a0a14, 1);
                card.fillRoundedRect(cx, cy, cardW, cardH, 6);
                card.lineStyle(2, 0x222222, 1);
                card.strokeRoundedRect(cx, cy, cardW, cardH, 6);

                // Dark silhouette
                const texKey = `portrait_${key}`;
                if (this.textures.exists(texKey)) {
                    const sil = this.add.image(cx + cardW / 2, cy + 65, texKey);
                    sil.setDisplaySize(100, 100);
                    sil.setTint(0x000000);
                    sil.setAlpha(0.5);
                    sil.setDepth(3);
                }

                // Pulsing "?" overlay
                const qMark = this.add.text(cx + cardW / 2, cy + 65, '?', {
                    fontFamily: 'monospace', fontSize: '48px',
                    color: '#555555', stroke: '#000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(4);

                this.tweens.add({
                    targets: qMark,
                    alpha: 0.3, scaleX: 1.1, scaleY: 1.1,
                    duration: 800, yoyo: true, repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Unlock hint
                const unlockHint = key === 'valkyrie' ? 'Reach Floor 11' : 'Beat Floor 20 Boss';
                this.add.text(cx + cardW / 2, cy + 115, unlockHint, {
                    fontFamily: 'monospace', fontSize: '8px',
                    color: '#555555', align: 'center',
                    wordWrap: { width: cardW - 10 },
                }).setOrigin(0.5).setDepth(3);

                // Name (dimmed)
                this.add.text(cx + cardW / 2, cy + 140, data.name, {
                    fontFamily: 'monospace', fontSize: '10px',
                    color: '#333333', stroke: '#000', strokeThickness: 1
                }).setOrigin(0.5).setDepth(3);
            } else {
                // ── Unlocked class ──
                // Sprite (idle animation)
                const sprKey = `player_${key}`;
                let sprite;
                if (this.textures.exists(sprKey) && this.anims.exists(`${sprKey}_walk_south`)) {
                    sprite = this.add.sprite(cx + cardW / 2, cy + 65, sprKey, 1);
                    sprite.setScale(3).setDepth(4);
                    sprite.play(`${sprKey}_idle_south`);
                } else {
                    // Fallback to portrait image
                    const texKey = `portrait_${key}`;
                    if (this.textures.exists(texKey)) {
                        sprite = this.add.image(cx + cardW / 2, cy + 65, texKey);
                        sprite.setDisplaySize(100, 100).setDepth(4);
                    } else {
                        sprite = this.add.sprite(cx + cardW / 2, cy + 65, sprKey, 1);
                        sprite.setScale(3).setDepth(4);
                    }
                }
                this._sprites[key] = sprite;

                // Name
                this.add.text(cx + cardW / 2, cy + 125, data.name, {
                    fontFamily: 'monospace', fontSize: '11px',
                    color: '#ffffff', stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(5);

                // Stats
                const stats = [
                    `HP: ${data.hp}`,
                    `ATK: ${data.attack}`,
                    `DEF: ${data.defense}`,
                    `SPD: ${data.speed}`,
                    `Special: ${data.special.name}`
                ];
                this.add.text(cx + 6, cy + 140, stats.join('\n'), {
                    fontFamily: 'monospace', fontSize: '8px',
                    color: '#aaaaaa', stroke: '#000', strokeThickness: 1,
                    lineSpacing: 2
                }).setDepth(5);

                // Click zone
                const zone = this.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
                    .setInteractive().setDepth(6);
                zone.on('pointerdown', () => {
                    this.selectedClass = key;
                    this.selectedCompanions = this.selectedCompanions.filter(c => c !== key);
                    this._refreshCards();
                    this._onClassSelected(key);
                });
            }
        });

        // ── Companion selection ──────────────────────────────────────────
        this.add.text(W / 2, 288, 'CHOOSE COMPANIONS (0-3)', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#88aaff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        this.companionLabels = [];
        const compY = 310;

        classKeys.forEach((key, i) => {
            const data = ClassData[key];
            const cx = startX + (cardW + gap) * i;

            const lbl = this.add.text(cx + cardW / 2, compY, `▢ ${data.name}`, {
                fontFamily: 'monospace', fontSize: '10px',
                color: '#666666', stroke: '#000', strokeThickness: 2,
                backgroundColor: '#111122',
                padding: { x: 6, y: 4 }
            }).setOrigin(0.5).setInteractive().setDepth(5);

            lbl.on('pointerdown', () => {
                if (key === this.selectedClass) return;
                if (this.selectedCompanions.includes(key)) {
                    this.selectedCompanions = this.selectedCompanions.filter(c => c !== key);
                } else if (this.selectedCompanions.length < 3) {
                    this.selectedCompanions.push(key);
                }
                this._refreshCards();
            });

            this.companionLabels.push({ key, lbl });
        });

        // ── Start button ────────────────────────────────────────────────
        const startBtn = this.add.text(W / 2, H - 65, '[ START RUN ]', {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#44ff44', stroke: '#000', strokeThickness: 3,
            backgroundColor: '#113311', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive().setDepth(5);

        startBtn.on('pointerover', () => { startBtn.setScale(1.1); startBtn.setColor('#66ff66'); });
        startBtn.on('pointerout', () => { startBtn.setScale(1); startBtn.setColor('#44ff44'); });
        startBtn.on('pointerdown', () => this._startRun());

        this.tweens.add({
            targets: startBtn,
            scaleX: 1.05, scaleY: 1.05,
            duration: 800, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── Skill Tree button ───────────────────────────────────────────
        const skillBtn = this.add.text(W / 2, H - 105, '[ SKILL TREES ]', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#cc88ff', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#221133', padding: { x: 14, y: 6 },
        }).setOrigin(0.5).setInteractive().setDepth(5);

        skillBtn.on('pointerover', () => skillBtn.setColor('#ddaaff'));
        skillBtn.on('pointerout', () => skillBtn.setColor('#cc88ff'));
        skillBtn.on('pointerdown', () => {
            this.scene.start('SkillTreeScene', {
                classKey: this.selectedClass,
                returnScene: 'CharSelectScene',
            });
        });

        // Shard counter
        const permanent = saveManager.getPermanent();
        this.add.text(W - 15, 15, `Soul Shards: ${permanent.soulShards || 0}`, {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#cc88ff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(1, 0).setDepth(5);

        // Back button
        this.add.text(W / 2, H - 25, '[ESC] Back', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#888888', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('ProfileScene');
        });

        this._refreshCards();

        // Fade in
        this.cameras.main.fadeIn(400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SELECTION EFFECTS
    // ══════════════════════════════════════════════════════════════════════════

    _onClassSelected(key) {
        const sprite = this._sprites[key];
        const colors = CLASS_COLORS[key] || CLASS_COLORS.warrior;

        // Play walk animation briefly as "attack" feedback
        const sprKey = `player_${key}`;
        if (sprite && sprite.play && this.anims.exists(`${sprKey}_walk_south`)) {
            sprite.play(`${sprKey}_walk_south`);
            this.time.delayedCall(600, () => {
                if (sprite.active) sprite.play(`${sprKey}_idle_south`);
            });
        }

        // Background tint to class color
        this.tweens.killTweensOf(this._bgTint);
        this._bgTint.setFillStyle(colors.tint, 0);
        this.tweens.add({
            targets: this._bgTint,
            alpha: 0.08,
            duration: 300,
            ease: 'Power2'
        });
    }

    _refreshCards() {
        for (const { key, card, cx, cy, cardW, cardH } of this.classCards) {
            const isLocked = !saveManager.isClassUnlocked(key);
            if (isLocked) continue;

            const selected = key === this.selectedClass;
            const colors = CLASS_COLORS[key] || CLASS_COLORS.warrior;

            // Redraw card background
            card.clear();
            card.fillStyle(selected ? colors.bg : 0x1a1a2e, 1);
            card.fillRoundedRect(cx, cy, cardW, cardH, 6);
            card.lineStyle(2, selected ? colors.tint : 0x444466, 1);
            card.strokeRoundedRect(cx, cy, cardW, cardH, 6);

            // Update spotlight
            const spotlight = this._spotlights[key];
            if (spotlight) {
                spotlight.clear();
                if (selected) {
                    // Glowing circle behind selected sprite
                    spotlight.fillStyle(colors.tint, 0.15);
                    spotlight.fillCircle(cx + cardW / 2, cy + 65, 55);
                    spotlight.fillStyle(colors.tint, 0.08);
                    spotlight.fillCircle(cx + cardW / 2, cy + 65, 70);
                }
            }

            // Animate sprite: idle for selected, pause for others
            const sprite = this._sprites[key];
            const sprKey = `player_${key}`;
            if (sprite && sprite.play) {
                if (selected && this.anims.exists(`${sprKey}_idle_south`)) {
                    if (sprite.anims && sprite.anims.currentAnim?.key !== `${sprKey}_idle_south`
                        && sprite.anims.currentAnim?.key !== `${sprKey}_walk_south`) {
                        sprite.play(`${sprKey}_idle_south`);
                    }
                }
            }
        }

        // Update companion labels
        for (const { key, lbl } of this.companionLabels) {
            const data = ClassData[key];
            const isLocked = !saveManager.isClassUnlocked(key);

            if (isLocked) {
                lbl.setText(`🔒 ${data.name}`);
                lbl.setColor('#333333');
            } else if (key === this.selectedClass) {
                lbl.setText(`— ${data.name} (you)`);
                lbl.setColor('#444444');
            } else if (this.selectedCompanions.includes(key)) {
                lbl.setText(`☑ ${data.name}`);
                lbl.setColor('#44ff44');
            } else {
                lbl.setText(`▢ ${data.name}`);
                lbl.setColor('#aaaaaa');
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TRANSITION — Character walks forward and fades
    // ══════════════════════════════════════════════════════════════════════════

    _startRun() {
        // Save run start
        saveManager.startRun(this.selectedClass, this.selectedCompanions);

        // Get selected sprite for walk-forward animation
        const sprite = this._sprites[this.selectedClass];
        const sprKey = `player_${this.selectedClass}`;

        if (sprite && sprite.play && this.anims.exists(`${sprKey}_walk_south`)) {
            // Play walk animation
            sprite.play(`${sprKey}_walk_south`);

            // Move sprite forward (down) and fade
            this.tweens.add({
                targets: sprite,
                y: sprite.y + 80,
                alpha: 0,
                scaleX: sprite.scaleX * 1.5,
                scaleY: sprite.scaleY * 1.5,
                duration: 600,
                ease: 'Power2'
            });
        }

        // Fade to black
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', {
                classKey: this.selectedClass,
                companions: this.selectedCompanions
            });
        });
    }
}
