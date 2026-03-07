import { applyCRTShader } from '../shaders/CRTShader.js';
import { PauseScene } from './PauseScene.js';
import { DIFFICULTIES, getDifficulty, setDifficulty } from '../config/DifficultyConfig.js';

/**
 * MenuScene — Title screen with CRT-styled visuals.
 * Features:
 * - CRT "power on" animation (horizontal line expands to fill screen)
 * - Phosphor-glow pulsing title
 * - Parallax backdrop layers (torches, dungeon gate, fog particles)
 * - Typewriter text menu items with arrow selector
 * - CRT "glitch wipe" scene transitions
 */
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Apply CRT shader
        this.crtPipeline = applyCRTShader(this, 'classic');

        // ── CRT Power-On Boot Animation ────────────────────────────────
        this._bootComplete = false;
        this._menuReady = false;
        this._selectedIndex = 0;

        this._doCRTBootAnimation(W, H, () => {
            this._bootComplete = true;
            this._revealScene(W, H);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  CRT BOOT-UP ANIMATION
    // ══════════════════════════════════════════════════════════════════════════

    _doCRTBootAnimation(W, H, onComplete) {
        // Start with black screen
        const blackOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000)
            .setDepth(1000);

        // Static noise burst (flickers rapidly)
        const staticGfx = this.add.graphics().setDepth(999);
        let staticTimer = 0;
        const drawStatic = () => {
            staticGfx.clear();
            for (let i = 0; i < 200; i++) {
                const sx = Math.random() * W;
                const sy = Math.random() * H;
                const brightness = Math.random();
                staticGfx.fillStyle(0xffffff, brightness * 0.4);
                staticGfx.fillRect(sx, sy, 2, 1);
            }
        };

        // Phase 1: Brief static burst (300ms)
        const staticEvent = this.time.addEvent({
            delay: 30,
            callback: () => {
                staticTimer += 30;
                drawStatic();
                if (staticTimer > 300) {
                    staticEvent.destroy();
                    staticGfx.clear().destroy();
                    // Phase 2: Horizontal line that expands
                    this._bootLineExpand(W, H, blackOverlay, onComplete);
                }
            },
            loop: true
        });
    }

    _bootLineExpand(W, H, blackOverlay, onComplete) {
        // Thin horizontal white line in center
        const line = this.add.rectangle(W / 2, H / 2, W, 2, 0xffffff)
            .setDepth(998);

        // Expand line to fill screen height
        this.tweens.add({
            targets: line,
            height: H,
            duration: 400,
            ease: 'Power3',
            onComplete: () => {
                // Brief white flash, then fade to reveal
                this.tweens.add({
                    targets: [line, blackOverlay],
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        line.destroy();
                        blackOverlay.destroy();
                        onComplete();
                    }
                });
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SCENE REVEAL (after boot animation)
    // ══════════════════════════════════════════════════════════════════════════

    _revealScene(W, H) {
        // Background layers
        this._createBackground(W, H);

        // Decorative frame
        this._createDecorativeFrame(W, H);

        // Title with phosphor glow
        this._createTitle(W, H);

        // Menu options with typewriter effect
        this._createMenuOptions(W, H);

        // Controls hint
        this._createControlsHint(W, H);

        // Version info
        this.add.text(W - 10, H - 10, 'v0.6.0 - Phase 6', {
            fontFamily: 'monospace', fontSize: '10px', color: '#444444'
        }).setOrigin(1, 1);

        // Start title music (audio context already unlocked by BootScene click)
        this._startTitleMusic();
    }

    _startTitleMusic() {
        if (this._titleMusicStarted) return;

        // Safety: resume audio context if still suspended
        if (this.sound.context && this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }

        // Check if title music is already playing (e.g., from ProfileScene)
        const alreadyPlaying = this.sound.sounds.find(s =>
            s.key === 'music_title' && s.isPlaying
        );
        if (alreadyPlaying) {
            this._titleMusicStarted = true;
            return;
        }

        // Stop any other music
        this.sound.stopAll();

        // Play title theme if available
        if (this.cache.audio.exists('music_title')) {
            this._titleMusic = this.sound.add('music_title', {
                loop: true,
                volume: 0
            });
            this._titleMusic.play();
            this._titleMusicStarted = true;
            // Fade in
            this.tweens.add({
                targets: this._titleMusic,
                volume: 0.6,
                duration: 1000
            });
        }
    }

    _stopTitleMusic() {
        if (this._titleMusic && this._titleMusic.isPlaying) {
            this.tweens.add({
                targets: this._titleMusic,
                volume: 0,
                duration: 500,
                onComplete: () => {
                    this._titleMusic.stop();
                    this._titleMusic.destroy();
                    this._titleMusic = null;
                }
            });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BACKGROUND — Parallax layers with torches, gate, fog
    // ══════════════════════════════════════════════════════════════════════════

    _createBackground(W, H) {
        // Deep background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x1a1a2e, 0x1a1a2e, 1);
        bg.fillRect(0, 0, W, H);

        // Background fog particles (furthest layer, slow)
        this._fogParticles = [];
        for (let i = 0; i < 30; i++) {
            const fog = this.add.rectangle(
                Math.random() * W, Math.random() * H,
                Phaser.Math.Between(20, 60), Phaser.Math.Between(8, 20),
                0x334466, Phaser.Math.FloatBetween(0.02, 0.08)
            ).setDepth(1);
            this._fogParticles.push(fog);

            this.tweens.add({
                targets: fog,
                x: fog.x + Phaser.Math.Between(-40, 40),
                alpha: Phaser.Math.FloatBetween(0.01, 0.06),
                duration: Phaser.Math.Between(4000, 8000),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }

        // Midground: Dungeon gate silhouette (graphics-drawn)
        const gate = this.add.graphics().setDepth(2);
        const gateX = W / 2;
        const gateY = H * 0.6;
        // Arch
        gate.fillStyle(0x1a1a2e, 0.8);
        gate.fillRect(gateX - 80, gateY - 40, 160, 80);
        gate.fillStyle(0x0a0a14, 1);
        gate.fillRect(gateX - 60, gateY - 30, 120, 70);
        // Archway top (semicircle approximation)
        gate.fillStyle(0x1a1a2e, 0.8);
        gate.fillCircle(gateX, gateY - 40, 80);
        gate.fillStyle(0x0a0a14, 1);
        gate.fillCircle(gateX, gateY - 40, 60);

        // Foreground torches (flickering glow)
        this._createTorches(W, H);

        // Animated grid lines (very subtle)
        const gridGraphics = this.add.graphics().setAlpha(0.06).setDepth(1);
        const gridSize = 40;
        for (let x = 0; x < W; x += gridSize) {
            gridGraphics.lineStyle(1, 0x4444ff, 0.2);
            gridGraphics.lineBetween(x, 0, x, H);
        }
        for (let y = 0; y < H; y += gridSize) {
            gridGraphics.lineStyle(1, 0x4444ff, 0.2);
            gridGraphics.lineBetween(0, y, W, y);
        }

        this.tweens.add({
            targets: gridGraphics,
            alpha: 0.03,
            duration: 2500,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Floating purple particles
        if (this.textures.exists('particle_purple')) {
            this.add.particles(W / 2, H, 'particle_purple', {
                x: { min: -W / 2, max: W / 2 },
                y: { min: -H, max: 0 },
                speed: { min: 10, max: 30 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.3, end: 0 },
                lifespan: 4000, frequency: 200,
                alpha: { start: 0.5, end: 0 },
                tint: [0x6644aa, 0x4422aa, 0x8866cc]
            }).setDepth(3);
        }

        // Occasional lightning flicker
        this.time.addEvent({
            delay: 5000 + Math.random() * 5000,
            callback: () => this._doLightningFlicker(),
            loop: true
        });
    }

    _createTorches(W, H) {
        // Two torches flanking the scene
        const torchPositions = [
            { x: W * 0.15, y: H * 0.5 },
            { x: W * 0.85, y: H * 0.5 }
        ];

        this._torches = [];

        for (const pos of torchPositions) {
            // Torch base
            const base = this.add.graphics().setDepth(4);
            base.fillStyle(0x4a3a2a, 1);
            base.fillRect(pos.x - 4, pos.y, 8, 20);

            // Flame glow (warm circle)
            const glow = this.add.graphics().setDepth(3);
            glow.fillStyle(0xff6622, 0.15);
            glow.fillCircle(pos.x, pos.y - 5, 30);
            glow.fillStyle(0xffaa44, 0.1);
            glow.fillCircle(pos.x, pos.y - 5, 20);

            // Flame tip (small bright dot)
            const tip = this.add.graphics().setDepth(5);
            tip.fillStyle(0xffdd44, 1);
            tip.fillCircle(pos.x, pos.y - 8, 3);
            tip.fillStyle(0xffffff, 0.6);
            tip.fillCircle(pos.x, pos.y - 10, 1.5);

            // Each torch gets its own time offset so they don't sync
            this._torches.push({
                glow, tip,
                baseX: glow.x, baseY: glow.y,
                tipBaseX: tip.x, tipBaseY: tip.y,
                time: Math.random() * 100,
            });
        }
    }

    // Multi-sine flicker with irrational frequency ratios — never visibly repeats
    _updateTorchFlicker(delta) {
        if (!this._torches) return;
        const dt = delta / 1000;
        const TWO_PI = Math.PI * 2;

        for (const torch of this._torches) {
            torch.time += dt;
            const t = torch.time;

            // Sum of sines at irrational ratios for organic randomness
            const flicker =
                Math.sin(t * TWO_PI * 1.0)   * 0.06 +
                Math.sin(t * TWO_PI * 2.317) * 0.04 +
                Math.sin(t * TWO_PI * 5.093) * 0.02 +
                Math.sin(t * TWO_PI * 8.711) * 0.01;

            // Positional jitter — separate sine sets so X/Y move independently
            const jitterX =
                Math.sin(t * TWO_PI * 0.7)   * 1.0 +
                Math.sin(t * TWO_PI * 1.873) * 0.6 +
                Math.sin(t * TWO_PI * 4.291) * 0.3;
            const jitterY =
                Math.sin(t * TWO_PI * 0.9)   * 0.6 +
                Math.sin(t * TWO_PI * 2.531) * 0.4 +
                Math.sin(t * TWO_PI * 5.719) * 0.2;

            // Glow: alpha + position
            torch.glow.setAlpha(0.85 + flicker);
            torch.glow.x = torch.baseX + jitterX;
            torch.glow.y = torch.baseY + jitterY;

            // Tip: alpha + position (moves a bit more than the glow)
            torch.tip.setAlpha(0.90 + flicker * 0.8);
            torch.tip.x = torch.tipBaseX + jitterX * 1.3;
            torch.tip.y = torch.tipBaseY + jitterY * 1.3;
        }
    }

    update(time, delta) {
        this._updateTorchFlicker(delta);
    }

    _doLightningFlicker() {
        const flash = this.add.rectangle(
            this.game.config.width / 2,
            this.game.config.height / 2,
            this.game.config.width,
            this.game.config.height,
            0xffffff
        ).setAlpha(0).setDepth(0);

        this.tweens.add({
            targets: flash,
            alpha: 0.05,
            duration: 50,
            yoyo: true, repeat: 2,
            onComplete: () => flash.destroy()
        });
    }

    _createDecorativeFrame(W, H) {
        const frameGfx = this.add.graphics().setDepth(6);

        // Outer border
        frameGfx.lineStyle(3, 0x4a3a2a, 1);
        frameGfx.strokeRect(20, 20, W - 40, H - 40);

        // Inner border
        frameGfx.lineStyle(1, 0x6a5a4a, 1);
        frameGfx.strokeRect(25, 25, W - 50, H - 50);

        // Corner decorations
        const corners = [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]];
        frameGfx.fillStyle(0xff6644, 1);
        corners.forEach(([cx, cy]) => frameGfx.fillCircle(cx, cy, 4));

        // Top decorative line
        frameGfx.lineStyle(2, 0xff6644, 0.6);
        frameGfx.lineBetween(100, 80, W - 100, 80);
        frameGfx.lineBetween(100, 85, W - 100, 85);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TITLE — Phosphor glow pulse
    // ══════════════════════════════════════════════════════════════════════════

    _createTitle(W, H) {
        // Shadow text
        this.add.text(W / 2 + 3, H / 4 + 3, 'THE GAUNTLET', {
            fontFamily: 'monospace', fontSize: '52px', color: '#000000'
        }).setOrigin(0.5).setDepth(7);

        // Main title
        const titleMain = this.add.text(W / 2, H / 4, 'THE GAUNTLET', {
            fontFamily: 'monospace', fontSize: '52px',
            color: '#ff6644', stroke: '#220000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(8);

        // Subtitle shadow
        this.add.text(W / 2 + 2, H / 4 + 55, 'OF ETERNITY', {
            fontFamily: 'monospace', fontSize: '36px', color: '#000000'
        }).setOrigin(0.5).setDepth(7);

        // Subtitle
        const titleSub = this.add.text(W / 2, H / 4 + 52, 'OF ETERNITY', {
            fontFamily: 'monospace', fontSize: '36px',
            color: '#ffaa44', stroke: '#220000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(8);

        // Tagline
        this.add.text(W / 2, H / 4 + 95, '— A Roguelike Dungeon Crawler —', {
            fontFamily: 'monospace', fontSize: '14px', color: '#888888'
        }).setOrigin(0.5).setDepth(8);

        // Phosphor glow pulse (sine wave alpha)
        this.tweens.add({
            targets: [titleMain, titleSub],
            alpha: { from: 1, to: 0.7 },
            duration: 2000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  MENU OPTIONS — Typewriter text + blinking arrow selector
    // ══════════════════════════════════════════════════════════════════════════

    _createMenuOptions(W, H) {
        const menuY = H * 0.56;
        const spacing = 36;

        this.menuItems = [
            { label: 'NEW GAME', action: () => this._startGame() },
            { label: 'CONTINUE', action: () => this._continueGame() },
            { label: 'SETTINGS', action: () => this._openSettings() },
            { label: 'VIEW INTRO', action: () => this._viewIntro() },
        ];

        this._menuTexts = [];
        this._selectedIndex = 0;

        // Typewriter cascade with staggered delays
        this.menuItems.forEach((item, i) => {
            const y = menuY + i * spacing;
            const delay = 400 + i * 250; // stagger

            const text = this.add.text(W / 2 + 15, y, '', {
                fontFamily: 'monospace', fontSize: '18px',
                color: '#aaaaaa', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(10).setAlpha(0);

            this._menuTexts.push(text);

            // Typewriter effect for this item
            this.time.delayedCall(delay, () => {
                text.setAlpha(1);
                this._typewriterText(text, item.label, 40, () => {
                    // All items done?
                    if (i === this.menuItems.length - 1) {
                        this._menuReady = true;
                        this._updateMenuSelection();
                        this._setupMenuInput();
                    }
                });
            });
        });

        // Blinking arrow selector (created immediately but hidden until menu ready)
        this._selectorArrow = this.add.text(0, 0, '>', {
            fontFamily: 'monospace', fontSize: '20px',
            color: '#ff6644', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10).setVisible(false);

        // Blink animation
        this.tweens.add({
            targets: this._selectorArrow,
            alpha: 0.3,
            duration: 400,
            yoyo: true, repeat: -1
        });
    }

    _typewriterText(textObj, fullText, msPerChar, onComplete) {
        let charIndex = 0;
        const timer = this.time.addEvent({
            delay: msPerChar,
            callback: () => {
                charIndex++;
                textObj.setText(fullText.substring(0, charIndex));
                if (charIndex >= fullText.length) {
                    timer.destroy();
                    if (onComplete) onComplete();
                }
            },
            loop: true
        });
    }

    _updateMenuSelection() {
        if (!this._menuReady) return;

        const menuY = this.game.config.height * 0.56;
        const spacing = 36;
        const W = this.game.config.width;

        this._menuTexts.forEach((text, i) => {
            if (i === this._selectedIndex) {
                text.setColor('#ffdd00');
                text.setFontSize('20px');
            } else {
                text.setColor('#aaaaaa');
                text.setFontSize('18px');
            }
        });

        // Position arrow selector
        const selectedText = this._menuTexts[this._selectedIndex];
        if (selectedText) {
            this._selectorArrow.setVisible(true);
            this._selectorArrow.setPosition(
                W / 2 - 100,
                menuY + this._selectedIndex * spacing
            );
        }
    }

    _setupMenuInput() {
        // Keyboard navigation
        this.input.keyboard.on('keydown-UP', () => {
            this._selectedIndex = (this._selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this._updateMenuSelection();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            this._selectedIndex = (this._selectedIndex + 1) % this.menuItems.length;
            this._updateMenuSelection();
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this._menuReady) this.menuItems[this._selectedIndex].action();
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this._menuReady) this.menuItems[this._selectedIndex].action();
        });

        // Click on menu items
        this._menuTexts.forEach((text, i) => {
            text.setInteractive();
            text.on('pointerover', () => {
                this._selectedIndex = i;
                this._updateMenuSelection();
            });
            text.on('pointerdown', () => {
                this._selectedIndex = i;
                this.menuItems[i].action();
            });
        });
    }

    _createControlsHint(W, H) {
        const controlsY = H * 0.85;
        const boxWidth = 500;
        const boxHeight = 60;

        const box = this.add.graphics().setDepth(8);
        box.fillStyle(0x111122, 0.8);
        box.fillRoundedRect(W / 2 - boxWidth / 2, controlsY - 15, boxWidth, boxHeight, 8);
        box.lineStyle(1, 0x333355, 1);
        box.strokeRoundedRect(W / 2 - boxWidth / 2, controlsY - 15, boxWidth, boxHeight, 8);

        this.add.text(W / 2, controlsY + 5,
            'WASD: Move  |  Mouse: Aim & Attack  |  Space: Dodge\n' +
            'E: Special  |  Q/R: Potions  |  F: Interact  |  ESC: Pause', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#888899', align: 'center', lineSpacing: 6
        }).setOrigin(0.5).setDepth(9);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  TRANSITIONS — CRT glitch wipe
    // ══════════════════════════════════════════════════════════════════════════

    _startGame() {
        this._crtGlitchWipe(() => {
            this.scene.start('ProfileScene');
        });
    }

    _continueGame() {
        this._crtGlitchWipe(() => {
            this.scene.start('ProfileScene');
        });
    }

    _viewIntro() {
        this._crtGlitchWipe(() => {
            this.scene.start('IntroScene');
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SETTINGS PANEL — Overlay for game settings
    // ══════════════════════════════════════════════════════════════════════════

    _openSettings() {
        if (this._settingsOpen) return;
        this._settingsOpen = true;

        const W = this.game.config.width;
        const H = this.game.config.height;

        // Settings container
        this._settingsContainer = this.add.container(W / 2, H / 2).setDepth(100);

        // Dark overlay
        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.7);
        this._settingsContainer.add(overlay);

        // Panel background
        const panelW = 450;
        const panelH = 390;
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x111122, 0.95);
        panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
        panelBg.lineStyle(2, 0x445588, 1);
        panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
        this._settingsContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -panelH / 2 + 20, 'SETTINGS', {
            fontFamily: 'monospace', fontSize: '18px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);
        this._settingsContainer.add(title);

        // Load settings
        const settings = PauseScene.loadSettings();
        const colX = -panelW / 2 + 40;
        const sliderW = 200;

        // Helper: create slider
        const makeSlider = (label, y, initial, color, onChange) => {
            const lbl = this.add.text(colX, y, label, {
                fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
            });
            this._settingsContainer.add(lbl);

            const trackY = y + 20;
            const track = this.add.graphics();
            track.fillStyle(0x333344, 1);
            track.fillRect(colX, trackY, sliderW, 8);
            track.lineStyle(1, 0x555566, 1);
            track.strokeRect(colX, trackY, sliderW, 8);
            this._settingsContainer.add(track);

            const knob = this.add.rectangle(
                colX + sliderW * initial, trackY + 4, 12, 16, color
            ).setInteractive({ draggable: true });
            this._settingsContainer.add(knob);

            const valLabel = this.add.text(colX + sliderW + 15, trackY - 2,
                `${Math.round(initial * 100)}%`, {
                fontFamily: 'monospace', fontSize: '10px',
                color: '#' + color.toString(16).padStart(6, '0'),
            });
            this._settingsContainer.add(valLabel);

            knob.on('drag', (pointer, dragX) => {
                const localX = Phaser.Math.Clamp(dragX, colX, colX + sliderW);
                knob.x = localX;
                const pct = (localX - colX) / sliderW;
                valLabel.setText(`${Math.round(pct * 100)}%`);
                onChange(pct);
            });
        };

        // CRT Intensity slider
        makeSlider('CRT Effect Intensity:', -panelH / 2 + 55, settings.crtIntensity, 0xffdd00, (pct) => {
            settings.crtIntensity = pct;
            PauseScene.saveSettings(settings);
            if (this.crtPipeline) this.crtPipeline.setIntensity(pct);
        });

        // Music Volume slider
        makeSlider('Music Volume:', -panelH / 2 + 110, settings.musicVolume, 0x88aaff, (pct) => {
            settings.musicVolume = pct;
            PauseScene.saveSettings(settings);
        });

        // SFX Volume slider
        makeSlider('SFX Volume:', -panelH / 2 + 165, settings.sfxVolume, 0xffaa66, (pct) => {
            settings.sfxVolume = pct;
            PauseScene.saveSettings(settings);
        });

        // ── Aim Mode Toggle ───────────────────────────────────────────────
        const aimModeY = -panelH / 2 + 220;
        const aimModeLabel = this.add.text(colX, aimModeY, 'Aim Mode:', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
        });
        this._settingsContainer.add(aimModeLabel);

        const aimModeLabels = { mouse: 'MOUSE AIM', movement: 'MOVEMENT AIM' };

        const aimModeToggle = this.add.text(colX + 150, aimModeY,
            `[${aimModeLabels[settings.aimMode] || 'MOUSE AIM'}]`, {
            fontFamily: 'monospace', fontSize: '10px',
            color: settings.aimMode === 'mouse' ? '#88aaff' : '#ffaa44',
            stroke: '#000', strokeThickness: 1,
        }).setInteractive();
        this._settingsContainer.add(aimModeToggle);

        // Keybind info
        const keybindInfo = this.add.text(colX, aimModeY + 20, '', {
            fontFamily: 'monospace', fontSize: '9px', color: '#666688',
        });
        this._settingsContainer.add(keybindInfo);

        const updateKeybindInfo = () => {
            if (settings.aimMode === 'mouse') {
                keybindInfo.setText('Attack: Mouse Click  |  Dodge: Spacebar');
            } else {
                keybindInfo.setText('Attack: Spacebar  |  Dodge: Shift');
            }
        };
        updateKeybindInfo();

        aimModeToggle.on('pointerdown', () => {
            settings.aimMode = settings.aimMode === 'mouse' ? 'movement' : 'mouse';
            aimModeToggle.setText(`[${aimModeLabels[settings.aimMode]}]`);
            aimModeToggle.setColor(settings.aimMode === 'mouse' ? '#88aaff' : '#ffaa44');
            updateKeybindInfo();
            PauseScene.saveSettings(settings);
        });

        // ── Difficulty Selector ───────────────────────────────────────────
        const diffY = aimModeY + 50;
        const diffLabel = this.add.text(colX, diffY, 'Difficulty:', {
            fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
        });
        this._settingsContainer.add(diffLabel);

        let currentDiff = getDifficulty();
        const diffBtnRefs = {};

        const makeDiffBtn = (key, offsetX) => {
            const cfg = DIFFICULTIES[key];
            const isActive = () => currentDiff === key;
            const btn = this.add.text(colX + offsetX, diffY + 18, `[${cfg.label}]`, {
                fontFamily: 'monospace', fontSize: '10px',
                color: isActive() ? cfg.color : '#555566',
                stroke: '#000', strokeThickness: 1,
            }).setInteractive();

            const refresh = () => {
                btn.setColor(currentDiff === key ? cfg.color : '#555566');
            };

            btn.on('pointerdown', () => {
                currentDiff = key;
                setDifficulty(key);
                Object.values(diffBtnRefs).forEach(r => r());
            });
            btn.on('pointerover', () => { if (currentDiff !== key) btn.setColor('#888899'); });
            btn.on('pointerout', () => refresh());

            diffBtnRefs[key] = refresh;
            this._settingsContainer.add(btn);
        };

        makeDiffBtn('easy',   0);
        makeDiffBtn('normal', 80);
        makeDiffBtn('hard',   175);

        const diffHint = this.add.text(colX, diffY + 36, 'Easy: 0.75x shards  |  Hard: 1.5x shards', {
            fontFamily: 'monospace', fontSize: '8px', color: '#444455',
        });
        this._settingsContainer.add(diffHint);

        // ── Close Button ──────────────────────────────────────────────────
        const closeBtn = this.add.text(0, panelH / 2 - 30, '[ CLOSE ]', {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#44ff44', stroke: '#000', strokeThickness: 2,
            backgroundColor: '#113311', padding: { x: 15, y: 6 },
        }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerover', () => closeBtn.setColor('#66ff66'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#44ff44'));
        closeBtn.on('pointerdown', () => this._closeSettings());
        this._settingsContainer.add(closeBtn);

        // ESC to close
        this._settingsEscHandler = () => this._closeSettings();
        this.input.keyboard.once('keydown-ESC', this._settingsEscHandler);

        // Open animation
        this._settingsContainer.setScale(0.3).setAlpha(0);
        this.tweens.add({
            targets: this._settingsContainer,
            scaleX: 1, scaleY: 1, alpha: 1,
            duration: 200, ease: 'Back.easeOut'
        });
    }

    _closeSettings() {
        if (!this._settingsOpen) return;

        this.tweens.add({
            targets: this._settingsContainer,
            scaleX: 0.3, scaleY: 0.3, alpha: 0,
            duration: 150, ease: 'Power2',
            onComplete: () => {
                this._settingsContainer.destroy();
                this._settingsContainer = null;
                this._settingsOpen = false;
            }
        });
    }

    /**
     * CRT glitch wipe: spike chromatic aberration + scanlines briefly, then fade to black.
     */
    _crtGlitchWipe(onComplete) {
        // Stop title music
        this._stopTitleMusic();

        // Disable further input
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        // Spike CRT uniforms for glitch effect
        if (this.crtPipeline) {
            this.crtPipeline.setChromaticAmount(4.0);
            this.crtPipeline.setScanlineWeight(0.4);
            this.crtPipeline.setFlicker(1.0);
        }

        // Brief hold on glitch, then wipe
        this.time.delayedCall(150, () => {
            // Black wipe rectangle
            const wipe = this.add.rectangle(
                0, this.game.config.height / 2,
                0, this.game.config.height, 0x000000
            ).setOrigin(0, 0.5).setDepth(1000);

            this.tweens.add({
                targets: wipe,
                width: this.game.config.width,
                duration: 250,
                ease: 'Power2',
                onComplete: () => {
                    // Reset CRT before leaving
                    if (this.crtPipeline) this.crtPipeline.applyPreset('classic');
                    onComplete();
                }
            });
        });

        // Flash
        this.cameras.main.flash(80, 255, 255, 255);
    }
}
