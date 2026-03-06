import { Boss } from '../Boss.js';

/**
 * Void Architect (Floor 25, Abyss) — CRT distortion, periodic player pull, implosion death.
 */
export class VoidArchitect extends Boss {
    constructor(scene, x, y, bossData) {
        super(scene, x, y, bossData);
        this._originalCrtIntensity = null;
        this._pullTimer = 0;
        this._pullInterval = 4000;
        this._pullActive = false;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Phase 3: periodic player pull toward boss
        if (this._pullActive) {
            this._pullTimer += delta;
            if (this._pullTimer >= this._pullInterval) {
                this._pullTimer = 0;
                this._pullPlayerToCenter();
            }
        }
    }

    onPhaseTransition(phaseIndex) {
        if (phaseIndex === 1) {
            this._activateCRTDistortion();
        } else if (phaseIndex === 2) {
            this._pullActive = true;
        }
    }

    _activateCRTDistortion() {
        const crt = this.scene.crtPipeline;
        if (!crt) return;

        this._originalCrtIntensity = crt._intensity;

        this.scene.tweens.add({
            targets: { value: crt._intensity },
            value: 1.0,
            duration: 1000,
            onUpdate: (tween, target) => {
                if (crt.setIntensity) crt.setIntensity(target.value);
            },
        });
        if (crt.setChromaticAmount) crt.setChromaticAmount(3.0);
        if (crt.setFlicker) crt.setFlicker(0.9);

        this.scene.cameras.main.shake(200, 0.01);
    }

    _pullPlayerToCenter() {
        if (!this.target?.alive) return;

        this.scene.cameras.main.flash(150, 100, 0, 255);

        const boss = this;
        const targetX = this.x;
        const targetY = this.y;
        const startX = this.target.x;
        const startY = this.target.y;

        let elapsed = 0;
        const duration = 500;

        const cleanup = () => {
            this.scene?.events.off('update', pullUpdate);
            this._untrackUpdateListener(pullUpdate);
        };

        const pullUpdate = (time, delta) => {
            if (!boss.alive) { cleanup(); return; }
            elapsed += delta;
            const t = Math.min(elapsed / duration, 1);
            // Lerp player 40% toward boss center
            this.target.x = Phaser.Math.Linear(startX, targetX, t * 0.4);
            this.target.y = Phaser.Math.Linear(startY, targetY, t * 0.4);
            if (elapsed >= duration) {
                cleanup();
            }
        };
        this.scene.events.on('update', pullUpdate);
        this._trackUpdateListener(pullUpdate);
    }

    _deathEffect() {
        // Restore CRT shader
        const crt = this.scene.crtPipeline;
        if (crt && this._originalCrtIntensity !== null) {
            this.scene.tweens.add({
                targets: { value: crt._intensity },
                value: this._originalCrtIntensity,
                duration: 1500,
                onUpdate: (tween, target) => {
                    if (crt.setIntensity) crt.setIntensity(target.value);
                },
                onComplete: () => {
                    if (crt.setChromaticAmount) crt.setChromaticAmount(1.0);
                    if (crt.setFlicker) crt.setFlicker(0.5);
                }
            });
        }

        // Implosion: concentric rings collapsing inward
        for (let i = 3; i >= 0; i--) {
            const ring = this.scene.add.graphics().setDepth(9);
            ring.lineStyle(3, 0xaa44ff, 0.8);
            ring.strokeCircle(this.x, this.y, 20 + i * 20);
            this.scene.tweens.add({
                targets: ring,
                scaleX: 0, scaleY: 0, alpha: 0,
                duration: 600, delay: i * 80, ease: 'Power3',
                onComplete: () => ring.destroy()
            });
        }

        this.scene.cameras.main.shake(400, 0.02);
    }

    destroy(fromScene) {
        // Restore CRT if destroyed during fight
        const crt = this.scene?.crtPipeline;
        if (crt && this._originalCrtIntensity !== null) {
            if (crt.setIntensity) crt.setIntensity(this._originalCrtIntensity);
            if (crt.setChromaticAmount) crt.setChromaticAmount(1.0);
            if (crt.setFlicker) crt.setFlicker(0.5);
        }
        super.destroy(fromScene);
    }
}
