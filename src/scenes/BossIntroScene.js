/**
 * BossIntroScene — dramatic boss introduction overlay.
 *
 * Displays boss name, title, and dramatic entrance animation.
 * Runs as overlay on top of GameScene, then returns control.
 */
export class BossIntroScene extends Phaser.Scene {
    constructor() {
        super('BossIntroScene');
    }

    init(data) {
        this.bossData = data.bossData;
        this.onComplete = data.onComplete;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Dark cinematic bars (letterbox effect)
        this.topBar = this.add.rectangle(width / 2, 0, width, 80, 0x000000)
            .setOrigin(0.5, 0)
            .setDepth(100)
            .setAlpha(0);

        this.bottomBar = this.add.rectangle(width / 2, height, width, 80, 0x000000)
            .setOrigin(0.5, 1)
            .setDepth(100)
            .setAlpha(0);

        // Full screen dark overlay
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
            .setDepth(99)
            .setAlpha(0);

        // Boss silhouette (large circle/shape)
        const bossColor = this.bossData.color || 0xff4444;
        this.silhouette = this.add.graphics().setDepth(101);
        this.silhouette.setAlpha(0);
        this._drawBossSilhouette(width / 2, height / 2 - 40, bossColor);

        // Boss name text
        this.bossName = this.add.text(width / 2, height / 2 + 60, this.bossData.name || 'UNKNOWN BOSS', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(102).setAlpha(0);

        // Boss title/subtitle
        this.bossTitle = this.add.text(width / 2, height / 2 + 100, this.bossData.title || 'Guardian of the Deep', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(102).setAlpha(0);

        // Warning text
        this.warningText = this.add.text(width / 2, height - 120, '— PREPARE FOR BATTLE —', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ff6644',
            align: 'center'
        }).setOrigin(0.5).setDepth(102).setAlpha(0);

        // Decorative lines
        this.leftLine = this.add.rectangle(0, height / 2 + 60, 0, 2, 0xffffff)
            .setOrigin(0, 0.5)
            .setDepth(101);

        this.rightLine = this.add.rectangle(width, height / 2 + 60, 0, 2, 0xffffff)
            .setOrigin(1, 0.5)
            .setDepth(101);

        // Camera effects
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        // Start the intro sequence
        this._playIntroSequence();
    }

    _drawBossSilhouette(x, y, color) {
        const g = this.silhouette;
        const size = 80;

        // Outer glow
        g.fillStyle(color, 0.2);
        g.fillCircle(x, y, size + 20);

        // Main body
        g.fillStyle(color, 0.6);
        g.fillCircle(x, y, size);

        // Inner detail
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(x, y, size * 0.6);

        // Eye-like details
        g.fillStyle(0xff0000, 0.8);
        g.fillCircle(x - 20, y - 10, 8);
        g.fillCircle(x + 20, y - 10, 8);

        // Crown/horns for bosses
        g.fillStyle(color, 0.8);
        g.fillTriangle(x - 40, y - 50, x - 30, y - 80, x - 20, y - 50);
        g.fillTriangle(x + 40, y - 50, x + 30, y - 80, x + 20, y - 50);
    }

    _playIntroSequence() {
        const { width } = this.cameras.main;
        const timeline = this.tweens.createTimeline();

        // Phase 1: Fade in overlay and letterbox bars
        timeline.add({
            targets: this.overlay,
            alpha: 0.7,
            duration: 300,
            ease: 'Power2'
        });

        timeline.add({
            targets: [this.topBar, this.bottomBar],
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });

        // Phase 2: Boss silhouette appears with scale effect
        timeline.add({
            targets: this.silhouette,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut',
            onStart: () => {
                this.silhouette.setScale(0.5);
            }
        });

        timeline.add({
            targets: this.silhouette,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Phase 3: Name slams in
        timeline.add({
            targets: this.bossName,
            alpha: 1,
            duration: 100,
            onStart: () => {
                this.cameras.main.shake(100, 0.01);
            }
        });

        // Phase 4: Lines extend from name
        timeline.add({
            targets: this.leftLine,
            width: width / 2 - 180,
            duration: 200,
            ease: 'Power2'
        });

        timeline.add({
            targets: this.rightLine,
            width: width / 2 - 180,
            duration: 200,
            ease: 'Power2',
            offset: '-=200'
        });

        // Phase 5: Title fades in
        timeline.add({
            targets: this.bossTitle,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });

        // Phase 6: Warning text pulses
        timeline.add({
            targets: this.warningText,
            alpha: 1,
            duration: 200,
            onComplete: () => {
                this.tweens.add({
                    targets: this.warningText,
                    alpha: 0.5,
                    duration: 400,
                    yoyo: true,
                    repeat: 2
                });
            }
        });

        // Phase 7: Hold for dramatic effect
        timeline.add({
            targets: {},
            duration: 800
        });

        // Phase 8: Everything fades out
        timeline.add({
            targets: [this.overlay, this.topBar, this.bottomBar, this.silhouette,
                this.bossName, this.bossTitle, this.warningText, this.leftLine, this.rightLine],
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this._finishIntro();
            }
        });

        timeline.play();
    }

    _finishIntro() {
        // Call completion callback if provided
        if (this.onComplete) {
            this.onComplete();
        }

        // Stop this scene
        this.scene.stop('BossIntroScene');
    }
}
