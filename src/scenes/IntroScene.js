/**
 * IntroScene — CRT text crawl opening story.
 *
 * ~20 second skippable text crawl, plays once on first boot.
 * First boot: BootScene → IntroScene → MenuScene
 * Subsequent boots: BootScene → MenuScene (skip intro)
 * "View Intro" option in MenuScene to replay
 */

import { applyCRTShader } from '../shaders/CRTShader.js';

const INTRO_LINES = [
    '',
    'THE GAUNTLET OF ETERNITY',
    '',
    '',
    'An ancient dungeon rises beneath the earth',
    'once every hundred years.',
    '',
    'Legends speak of a wish granted',
    'to any who reach its depths.',
    '',
    'Countless heroes have entered.',
    'None have returned.',
    '',
    '',
    'Will you break the cycle?',
    'Or become part of it?',
    '',
    '',
    '[Press any key to begin]',
];

const MS_PER_CHAR = 50;
const LINE_PAUSE = 300; // extra pause between lines

export class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    create() {
        const W = this.game.config.width;
        const H = this.game.config.height;

        // Apply CRT shader for atmosphere
        this.crtPipeline = applyCRTShader(this, 'classic');

        // Black background
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

        // Text display area
        this._textObj = this.add.text(W / 2, H / 2, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ccccdd',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            lineSpacing: 8,
        }).setOrigin(0.5).setDepth(1);

        // Skip prompt
        this._skipText = this.add.text(W - 20, H - 20, 'Press any key to skip', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#444444',
        }).setOrigin(1, 1).setDepth(2);

        // Start typewriter crawl
        this._lineIndex = 0;
        this._charIndex = 0;
        this._displayedText = '';
        this._skipped = false;
        this._crawlComplete = false;

        this._startCrawl();

        // Skip on any input
        this.input.keyboard.on('keydown', () => this._onSkip());
        this.input.on('pointerdown', () => this._onSkip());

        // Mark as seen
        try {
            localStorage.setItem('gauntlet_intro_seen', 'true');
        } catch (e) { /* ignore */ }
    }

    _startCrawl() {
        this._advanceLine();
    }

    _advanceLine() {
        if (this._skipped) return;

        if (this._lineIndex >= INTRO_LINES.length) {
            this._crawlComplete = true;
            return;
        }

        const line = INTRO_LINES[this._lineIndex];
        this._lineIndex++;

        if (line === '') {
            // Empty line = pause then advance
            this._displayedText += '\n';
            this._textObj.setText(this._displayedText);
            this.time.delayedCall(LINE_PAUSE, () => this._advanceLine());
            return;
        }

        // Special styling for title line
        const isTitle = line === 'THE GAUNTLET OF ETERNITY';
        const isPrompt = line.startsWith('[');

        // Typewriter this line
        let charIdx = 0;
        const timer = this.time.addEvent({
            delay: MS_PER_CHAR,
            callback: () => {
                if (this._skipped) { timer.destroy(); return; }

                charIdx++;
                const partial = line.substring(0, charIdx);
                this._textObj.setText(this._displayedText + partial);

                if (charIdx >= line.length) {
                    timer.destroy();
                    this._displayedText += line + '\n';
                    this._textObj.setText(this._displayedText);

                    // Wait then next line
                    const delay = isTitle ? 800 : isPrompt ? 0 : LINE_PAUSE;
                    this.time.delayedCall(delay, () => this._advanceLine());
                }
            },
            loop: true
        });
    }

    _onSkip() {
        if (this._skipped) return;

        if (this._crawlComplete) {
            // Crawl is done — proceed to menu
            this._transitionToMenu();
            return;
        }

        // First skip: show all text immediately
        this._skipped = true;
        this._displayedText = INTRO_LINES.join('\n');
        this._textObj.setText(this._displayedText);
        this._crawlComplete = true;
        this._skipText.setText('Press any key to continue');

        // Wait for second input to proceed
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.time.delayedCall(300, () => {
            this.input.keyboard.on('keydown', () => this._transitionToMenu());
            this.input.on('pointerdown', () => this._transitionToMenu());
        });
    }

    _transitionToMenu() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}
