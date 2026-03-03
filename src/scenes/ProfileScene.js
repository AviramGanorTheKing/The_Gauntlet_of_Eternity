/**
 * ProfileScene — save slot selection screen.
 * Shows 3 profile slots with class/floor/playtime info.
 * Supports creating, selecting, and deleting profiles.
 */

import { applyCRTShader } from '../shaders/CRTShader.js';
import { saveManager } from '../systems/SaveManager.js';

export class ProfileScene extends Phaser.Scene {
    constructor() {
        super('ProfileScene');
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Ensure title music is playing (comes from MenuScene)
        this._ensureTitleMusic();

        applyCRTShader(this, 'subtle');

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x1a1a2e, 0x1a1a2e, 1);
        bg.fillRect(0, 0, W, H);

        // Title
        this.add.text(W / 2, 40, 'SELECT PROFILE', {
            fontFamily: 'monospace', fontSize: '22px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);

        // Profile cards
        this.profileCards = [];
        this._buildProfileCards(W, H);

        // Back button
        this.add.text(W / 2, H - 30, '[ESC] Back to Menu', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#888888',
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });

        // Delete confirmation state
        this._deleteConfirm = null;

        this.cameras.main.fadeIn(400);
    }

    _buildProfileCards(W, H) {
        // Clear existing
        for (const card of this.profileCards) {
            card.container?.destroy();
        }
        this.profileCards = [];

        const profiles = saveManager.getAllProfiles();
        const cardW = 220;
        const cardH = 280;
        const gap = 20;
        const totalW = profiles.length * cardW + (profiles.length - 1) * gap;
        const startX = (W - totalW) / 2;
        const cardY = 85;

        profiles.forEach((profile, i) => {
            const cx = startX + i * (cardW + gap);
            const container = this.add.container(cx, cardY);

            // Card background
            const bg = this.add.graphics();
            bg.fillStyle(profile.exists ? 0x1a1a3e : 0x111122, 1);
            bg.fillRoundedRect(0, 0, cardW, cardH, 8);
            bg.lineStyle(2, profile.exists ? 0x4466aa : 0x333344, 1);
            bg.strokeRoundedRect(0, 0, cardW, cardH, 8);
            container.add(bg);

            if (profile.exists && profile.summary) {
                const s = profile.summary;

                // Profile name (or fallback to slot number)
                const profileName = s.profileName || `SLOT ${profile.slot}`;
                container.add(this.add.text(cardW / 2, 18, profileName, {
                    fontFamily: 'monospace', fontSize: '14px',
                    color: '#ffaa44', stroke: '#000', strokeThickness: 2,
                }).setOrigin(0.5));

                // Modified indicator
                if (profile.modified) {
                    container.add(this.add.text(cardW - 10, 10, '[MOD]', {
                        fontFamily: 'monospace', fontSize: '8px', color: '#ff4444',
                    }).setOrigin(1, 0));
                }

                // Class name
                container.add(this.add.text(cardW / 2, 45, s.className || 'New Hero', {
                    fontFamily: 'monospace', fontSize: '13px',
                    color: '#ffffff', stroke: '#000', strokeThickness: 2,
                }).setOrigin(0.5));

                // Stats
                const playtime = this._formatPlaytime(s.totalPlaytime);
                const statsLines = [
                    `Shards: ${s.totalShards}`,
                    `Best Floor: ${s.bestFloor}`,
                    `Runs: ${s.totalRuns}`,
                    `Time: ${playtime}`,
                    `Classes: ${s.unlockedClasses?.length || 3}/5`,
                    `Endings: ${s.endingsSeen?.length || 0}/4`,
                ];

                container.add(this.add.text(15, 70, statsLines.join('\n'), {
                    fontFamily: 'monospace', fontSize: '10px',
                    color: '#aaaacc', lineSpacing: 4,
                }));

                // Active run indicator
                if (s.hasActiveRun) {
                    const runText = `Active Run: Floor ${s.activeRunFloor}`;
                    container.add(this.add.text(cardW / 2, 185, runText, {
                        fontFamily: 'monospace', fontSize: '10px',
                        color: '#44ff44', stroke: '#000', strokeThickness: 2,
                    }).setOrigin(0.5));
                }

                // Select button
                const selectBtn = this.add.text(cardW / 2, cardH - 55, s.hasActiveRun ? '[ RESUME ]' : '[ SELECT ]', {
                    fontFamily: 'monospace', fontSize: '12px',
                    color: '#44ff44', stroke: '#000', strokeThickness: 2,
                    backgroundColor: '#113311', padding: { x: 12, y: 6 },
                }).setOrigin(0.5).setInteractive();

                selectBtn.on('pointerover', () => selectBtn.setColor('#66ff66'));
                selectBtn.on('pointerout', () => selectBtn.setColor('#44ff44'));
                selectBtn.on('pointerdown', () => this._selectProfile(profile.slot));
                container.add(selectBtn);

                // Delete button
                const deleteBtn = this.add.text(cardW / 2, cardH - 20, '[DELETE]', {
                    fontFamily: 'monospace', fontSize: '9px',
                    color: '#884444',
                }).setOrigin(0.5).setInteractive();

                deleteBtn.on('pointerover', () => deleteBtn.setColor('#ff4444'));
                deleteBtn.on('pointerout', () => deleteBtn.setColor('#884444'));
                deleteBtn.on('pointerdown', () => this._confirmDelete(profile.slot));
                container.add(deleteBtn);

            } else {
                // Slot number for empty slots
                container.add(this.add.text(cardW / 2, 18, `SLOT ${profile.slot}`, {
                    fontFamily: 'monospace', fontSize: '14px',
                    color: '#ffaa44', stroke: '#000', strokeThickness: 2,
                }).setOrigin(0.5));

                // Empty slot
                container.add(this.add.text(cardW / 2, cardH / 2 - 10, '— EMPTY —', {
                    fontFamily: 'monospace', fontSize: '12px', color: '#555566',
                }).setOrigin(0.5));

                const newBtn = this.add.text(cardW / 2, cardH / 2 + 25, '[ NEW GAME ]', {
                    fontFamily: 'monospace', fontSize: '12px',
                    color: '#88aaff', stroke: '#000', strokeThickness: 2,
                    backgroundColor: '#112233', padding: { x: 12, y: 6 },
                }).setOrigin(0.5).setInteractive();

                newBtn.on('pointerover', () => newBtn.setColor('#aaccff'));
                newBtn.on('pointerout', () => newBtn.setColor('#88aaff'));
                newBtn.on('pointerdown', () => this._showNameInput(profile.slot));
                container.add(newBtn);
            }

            this.profileCards.push({ slot: profile.slot, container });
        });
    }

    _selectProfile(slot) {
        saveManager.selectProfile(slot);
        const run = saveManager.getActiveRun();

        this.cameras.main.flash(100, 255, 255, 255);
        this.time.delayedCall(150, () => {
            if (run) {
                // Resume active run
                this.scene.start('GameScene', {
                    classKey: run.classKey,
                    companions: run.companions || [],
                    floor: run.floor || 1,
                    resumeRun: true,
                });
            } else {
                this.scene.start('CharSelectScene');
            }
        });
    }

    /**
     * Show an in-game name input overlay using a hidden DOM input element.
     */
    _showNameInput(slot) {
        if (this._nameInputActive) return;
        this._nameInputActive = true;

        const W = this.game.config.width;
        const H = this.game.config.height;

        // Dim overlay
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(50);

        // Panel
        const panel = this.add.graphics().setDepth(51);
        const pw = 340;
        const ph = 150;
        panel.fillStyle(0x111133, 0.95);
        panel.fillRoundedRect(W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, 10);
        panel.lineStyle(2, 0x6666aa, 1);
        panel.strokeRoundedRect(W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, 10);

        // Prompt
        const prompt = this.add.text(W / 2, H / 2 - 45, 'Name your profile:', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#ddddff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(52);

        // Create a hidden DOM input element for text entry
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 16;
        input.placeholder = 'Hero name...';
        input.value = '';
        input.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-family: monospace; font-size: 18px; text-align: center;
            width: 240px; padding: 8px 12px;
            background: #0a0a1e; color: #ffdd00; border: 2px solid #6666aa;
            border-radius: 4px; outline: none; z-index: 1000;
        `;
        document.body.appendChild(input);
        input.focus();

        // Phaser text mirror (shows what's typed, for CRT effect consistency)
        const mirror = this.add.text(W / 2, H / 2, '', {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#ffdd00', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(52).setVisible(false);

        // Hint
        const hint = this.add.text(W / 2, H / 2 + 35, '[ENTER] Confirm    [ESC] Cancel', {
            fontFamily: 'monospace', fontSize: '10px', color: '#888899',
        }).setOrigin(0.5).setDepth(52);

        const cleanup = () => {
            this._nameInputActive = false;
            input.remove();
            overlay.destroy();
            panel.destroy();
            prompt.destroy();
            mirror.destroy();
            hint.destroy();
        };

        const confirm = () => {
            const name = input.value.trim() || `Hero ${slot}`;
            cleanup();
            this._createNewProfile(slot, name);
        };

        input.addEventListener('keydown', (e) => {
            // Stop propagation so Phaser's keyboard manager doesn't intercept
            // game keys (WASD, Q, R, E, etc.) while typing in the input
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); confirm(); }
            if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
        });

        // Also handle ESC through Phaser (in case input loses focus)
        const escHandler = (event) => {
            if (event.key === 'Escape') cleanup();
        };
        this.input.keyboard.on('keydown-ESC', escHandler);
    }

    _createNewProfile(slot, name) {
        saveManager.createProfile(slot);
        saveManager.updatePermanent({ profileName: name || `Hero ${slot}` });
        saveManager.selectProfile(slot);

        this.cameras.main.flash(100, 255, 255, 255);
        this.time.delayedCall(150, () => {
            this.scene.start('CharSelectScene');
        });
    }

    _confirmDelete(slot) {
        if (this._deleteConfirm === slot) {
            // Second click — actually delete
            saveManager.deleteProfile(slot);
            this._deleteConfirm = null;
            // Rebuild cards
            const W = this.game.config.width;
            const H = this.game.config.height;
            this._buildProfileCards(W, H);
            return;
        }

        this._deleteConfirm = slot;

        // Show confirmation text
        const W = this.game.config.width;
        const confirm = this.add.text(W / 2, this.game.config.height - 55, 'Click DELETE again to confirm', {
            fontFamily: 'monospace', fontSize: '11px',
            color: '#ff6644', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(10);

        this.time.delayedCall(3000, () => {
            confirm.destroy();
            this._deleteConfirm = null;
        });
    }

    _formatPlaytime(ms) {
        if (!ms) return '0m';
        const mins = Math.floor(ms / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    }

    _ensureTitleMusic() {
        // Check if title music is already playing
        const playing = this.sound.sounds.find(s =>
            s.key === 'music_title' && s.isPlaying
        );
        if (playing) return;

        // Start title music
        if (this.cache.audio.exists('music_title')) {
            this._titleMusic = this.sound.add('music_title', {
                loop: true,
                volume: 0.6
            });
            this._titleMusic.play();
        }
    }
}
