/**
 * VictoryScene — ending sequences with CRT text crawl.
 *
 * 4 endings using typewriter text reveal (same style as IntroScene):
 * - Liberation (3 selfless): dungeon crumbles, bosses restored
 * - Ascension (3 selfish): player on throne, CRT intensifies
 * - Escape (mixed): player walks into sunlight
 * - The Eternal (all skipped): player becomes the announcer
 *
 * Each ending has unique pixel art vignette, color scheme, and text crawl.
 */

import { applyCRTShader } from '../shaders/CRTShader.js';
import { LoreData } from '../config/LoreData.js';
import { saveManager } from '../systems/SaveManager.js';

const ENDING_THEMES = {
    liberation: {
        title: '#88ccff', bg1: 0x0a1a2e, bg2: 0x1a3a5e,
        accent: 0x88ccff, particleTint: [0x88ccff, 0x66aadd, 0x4488bb],
        crtPreset: 'classic',
    },
    ascension: {
        title: '#ff4444', bg1: 0x1a0a0a, bg2: 0x3a1a1a,
        accent: 0xff4444, particleTint: [0xff4444, 0xcc2222, 0xff6644],
        crtPreset: 'arcade', // intensified CRT
    },
    escape: {
        title: '#ffaa44', bg1: 0x1a1a0a, bg2: 0x2e2e1a,
        accent: 0xffaa44, particleTint: [0xffaa44, 0xddaa33, 0xffcc66],
        crtPreset: 'classic',
    },
    eternal: {
        title: '#aa88cc', bg1: 0x0a0a1a, bg2: 0x1a1a2e,
        accent: 0xaa88cc, particleTint: [0xaa88cc, 0x8866aa, 0xccaaee],
        crtPreset: 'subtle',
    },
};

const MS_PER_CHAR = 40;
const LINE_PAUSE = 200;

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super('VictoryScene');
    }

    init(data) {
        this.endingKey = data?.ending || 'escape';
        this.killCount = data?.killCount || 0;
        this.damageDealt = data?.damageDealt || 0;
        this.floor = data?.floor || 25;
        this.gold = data?.gold || 0;
        this.shardsEarned = data?.shardsEarned || 0;
        this.shardBreakdown = data?.shardBreakdown || {};
        this.classKey = data?.classKey || 'warrior';
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        const theme = ENDING_THEMES[this.endingKey] || ENDING_THEMES.escape;
        const ending = LoreData.endings[this.endingKey];

        // Stop any existing music and play ending theme
        this.sound.stopAll();
        if (this.cache.audio.exists('music_ending')) {
            this._endingMusic = this.sound.add('music_ending', {
                loop: true,
                volume: 0
            });
            this._endingMusic.play();
            // Fade in
            this.tweens.add({
                targets: this._endingMusic,
                volume: 0.6,
                duration: 2000
            });
        }

        // Apply CRT shader with ending-specific preset
        this.crtPipeline = applyCRTShader(this, theme.crtPreset);

        // For Ascension: intensify CRT over time
        if (this.endingKey === 'ascension' && this.crtPipeline) {
            this.tweens.add({
                targets: this.crtPipeline,
                _chromaticAmount: 3.0,
                _scanlineWeight: 0.35,
                duration: 15000,
            });
        }

        // Record ending
        saveManager.recordEnding(this.endingKey);

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(theme.bg1, theme.bg1, theme.bg2, theme.bg2, 1);
        bg.fillRect(0, 0, W, H);

        // Particles
        if (this.textures.exists('particle_purple')) {
            this.add.particles(W / 2, H, 'particle_purple', {
                x: { min: -W / 2, max: W / 2 },
                y: { min: -H, max: 0 },
                speed: { min: 5, max: 20 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.4, end: 0 },
                lifespan: 4000, frequency: 300,
                alpha: { start: 0.4, end: 0 },
                tint: theme.particleTint,
            }).setDepth(1);
        }

        // ── Pixel art vignette (graphics-drawn per ending) ──────────────
        this._drawVignette(W, H, theme);

        // ── "VICTORY" header ────────────────────────────────────────────
        const victoryText = this.add.text(W / 2, 50, 'VICTORY', {
            fontFamily: 'monospace', fontSize: '48px',
            color: theme.title, stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets: victoryText, alpha: 1, y: 45,
            duration: 800, ease: 'Back.easeOut', delay: 300,
        });

        // ── Ending title ────────────────────────────────────────────────
        const endingTitle = this.add.text(W / 2, 100, `— ${ending?.title || 'The End'} —`, {
            fontFamily: 'monospace', fontSize: '18px',
            color: theme.title, stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets: endingTitle, alpha: 1, duration: 600, delay: 800,
        });

        // ── Text crawl (typewriter) ─────────────────────────────────────
        const crawlText = this.add.text(W / 2, 140, '', {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ccccdd', stroke: '#000', strokeThickness: 2,
            align: 'center', wordWrap: { width: 500 }, lineSpacing: 6,
        }).setOrigin(0.5, 0).setDepth(5);

        // Start text crawl after title appears
        this.time.delayedCall(1500, () => {
            this._typewriterCrawl(crawlText, ending?.text || '');
        });

        // ── Stats panel (delayed) ───────────────────────────────────────
        this.time.delayedCall(6000, () => {
            this._buildStats(W, H, theme);
        });

        // ── Continue prompt (very delayed) ──────────────────────────────
        const continueText = this.add.text(W / 2, H - 35, '[ PRESS ENTER TO CONTINUE ]', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#ffcc00', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets: continueText, alpha: 1, duration: 500, delay: 9000,
        });

        this.time.delayedCall(9500, () => {
            this.tweens.add({
                targets: continueText, alpha: 0.4,
                duration: 600, yoyo: true, repeat: -1,
            });
        });

        // Input (delayed)
        this.time.delayedCall(7000, () => {
            this.input.keyboard.on('keydown-ENTER', () => this._continue());
            this.input.keyboard.on('keydown-SPACE', () => this._continue());
            this.input.on('pointerdown', () => this._continue());
        });

        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TYPEWRITER CRAWL
    // ══════════════════════════════════════════════════════════════════════════

    _typewriterCrawl(textObj, fullText) {
        const lines = fullText.split('\n');
        let currentDisplay = '';
        let lineIdx = 0;

        const advanceLine = () => {
            if (lineIdx >= lines.length) return;

            const line = lines[lineIdx];
            lineIdx++;

            if (line.trim() === '') {
                currentDisplay += '\n';
                textObj.setText(currentDisplay);
                this.time.delayedCall(LINE_PAUSE, advanceLine);
                return;
            }

            let charIdx = 0;
            const timer = this.time.addEvent({
                delay: MS_PER_CHAR,
                callback: () => {
                    charIdx++;
                    textObj.setText(currentDisplay + line.substring(0, charIdx));
                    if (charIdx >= line.length) {
                        timer.destroy();
                        currentDisplay += line + '\n';
                        textObj.setText(currentDisplay);
                        this.time.delayedCall(LINE_PAUSE, advanceLine);
                    }
                },
                loop: true
            });
        };

        advanceLine();
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  PIXEL ART VIGNETTE
    // ══════════════════════════════════════════════════════════════════════════

    _drawVignette(W, H, theme) {
        const gfx = this.add.graphics().setDepth(2);

        switch (this.endingKey) {
            case 'liberation':
                // Light beams from above, crumbling dungeon silhouette
                gfx.fillStyle(0xffffff, 0.05);
                for (let i = 0; i < 5; i++) {
                    const bx = W * 0.2 + i * W * 0.15;
                    gfx.fillTriangle(bx, 0, bx - 30, H * 0.4, bx + 30, H * 0.4);
                }
                // Crumbling blocks
                gfx.fillStyle(theme.accent, 0.1);
                for (let i = 0; i < 8; i++) {
                    const rx = Phaser.Math.Between(50, W - 50);
                    const ry = Phaser.Math.Between(H * 0.5, H - 50);
                    gfx.fillRect(rx, ry, Phaser.Math.Between(8, 24), Phaser.Math.Between(8, 16));
                }
                break;

            case 'ascension':
                // Throne silhouette at center bottom
                gfx.fillStyle(0x220000, 0.6);
                gfx.fillRect(W / 2 - 40, H * 0.7, 80, 60);
                gfx.fillTriangle(W / 2 - 50, H * 0.7, W / 2, H * 0.55, W / 2 + 50, H * 0.7);
                // Red glow
                gfx.fillStyle(theme.accent, 0.08);
                gfx.fillCircle(W / 2, H * 0.65, 80);
                break;

            case 'escape':
                // Sunlight at top, dark entrance at bottom
                gfx.fillStyle(0xffcc44, 0.08);
                gfx.fillCircle(W / 2, 0, 150);
                gfx.fillStyle(0x000000, 0.4);
                gfx.fillRect(W / 2 - 60, H * 0.75, 120, H * 0.25);
                break;

            case 'eternal':
                // Ghost figure (translucent)
                gfx.fillStyle(theme.accent, 0.06);
                gfx.fillCircle(W / 2, H * 0.6, 20); // head
                gfx.fillRect(W / 2 - 12, H * 0.63, 24, 40); // body
                // Fade effect
                gfx.fillStyle(theme.accent, 0.03);
                gfx.fillCircle(W / 2, H * 0.6, 50);
                break;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  STATS
    // ══════════════════════════════════════════════════════════════════════════

    _buildStats(W, H, theme) {
        const panelY = H * 0.6;
        const panelH = 150;

        const panel = this.add.graphics().setDepth(4);
        panel.fillStyle(0x000000, 0.5);
        panel.fillRoundedRect(W / 2 - 180, panelY, 360, panelH, 8);
        panel.lineStyle(1, theme.accent, 0.3);
        panel.strokeRoundedRect(W / 2 - 180, panelY, 360, panelH, 8);
        panel.setAlpha(0);

        this.tweens.add({ targets: panel, alpha: 1, duration: 500 });

        const stats = [
            { label: 'Floor Reached', value: this.floor, color: '#ffaa44' },
            { label: 'Enemies Slain', value: this.killCount, color: '#ff6666' },
            { label: 'Damage Dealt', value: this.damageDealt, color: '#ff8888' },
            { label: 'Gold Collected', value: `${this.gold}g`, color: '#ffcc00' },
            { label: 'Soul Shards Earned', value: `+${this.shardsEarned}`, color: '#cc88ff' },
        ];

        stats.forEach((stat, i) => {
            const delay = 200 + i * 200;
            const sy = panelY + 12 + i * 24;

            const label = this.add.text(W / 2 - 140, sy, stat.label + ':', {
                fontFamily: 'monospace', fontSize: '11px', color: '#888888',
            }).setDepth(5).setAlpha(0);

            const value = this.add.text(W / 2 + 140, sy, String(stat.value), {
                fontFamily: 'monospace', fontSize: '13px',
                color: stat.color, stroke: '#000', strokeThickness: 2,
            }).setOrigin(1, 0).setDepth(5).setAlpha(0);

            this.tweens.add({ targets: label, alpha: 1, duration: 300, delay });
            this.tweens.add({ targets: value, alpha: 1, duration: 300, delay: delay + 100 });
        });
    }

    _continue() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}
