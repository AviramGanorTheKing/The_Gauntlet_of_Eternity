import { Boss } from '../Boss.js';

/**
 * Ember Tyrant (Floor 20, Inferno) — arena fire, fire trail, explosion death.
 */
export class EmberTyrant extends Boss {
    constructor(scene, x, y, bossData) {
        super(scene, x, y, bossData);
        this._fireTrailActive = false;
        this._fireTrailTimer = 0;
        this._firePatches = [];
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Phase 3: leave fire trail while moving
        if (this._fireTrailActive) {
            this._fireTrailTimer += delta;
            if (this._fireTrailTimer >= 200) {
                this._fireTrailTimer = 0;
                const vx = this.body.velocity.x;
                const vy = this.body.velocity.y;
                if (Math.abs(vx) > 5 || Math.abs(vy) > 5) {
                    this._dropFirePatch(this.x, this.y, false);
                }
            }
        }
    }

    onPhaseTransition(phaseIndex) {
        if (phaseIndex === 1) {
            this._igniteArena();
        } else if (phaseIndex === 2) {
            this._fireTrailActive = true;
            this.scene.cameras.main.flash(300, 255, 100, 0);
        }
    }

    _igniteArena() {
        for (let i = 0; i < 6; i++) {
            const ox = (Math.random() - 0.5) * 200;
            const oy = (Math.random() - 0.5) * 200;
            this._dropFirePatch(this.x + ox, this.y + oy, true);
        }
        this.scene.cameras.main.shake(200, 0.008);
    }

    _dropFirePatch(x, y, persistent) {
        const patch = this.scene.add.graphics().setDepth(3);
        patch.fillStyle(0xff4422, 0.25);
        patch.fillCircle(x, y, 20);
        this._firePatches.push({ gfx: patch, x, y, persistent });

        if (!persistent) {
            this.scene.tweens.add({
                targets: patch, alpha: 0, duration: 1500,
                onComplete: () => {
                    patch.destroy();
                    this._firePatches = this._firePatches.filter(p => p.gfx !== patch);
                }
            });
        }
    }

    _deathEffect() {
        // Sequential explosion chain
        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const ox = (Math.random() - 0.5) * 60;
                const oy = (Math.random() - 0.5) * 60;
                const exp = this.scene.add.graphics().setDepth(9);
                exp.fillStyle(0xff6622, 0.8);
                exp.fillCircle(this.x + ox, this.y + oy, 20 + Math.random() * 20);
                this.scene.tweens.add({
                    targets: exp, alpha: 0, scaleX: 4, scaleY: 4,
                    duration: 400, ease: 'Power2',
                    onComplete: () => exp.destroy()
                });
                if (i === 0) this.scene.cameras.main.shake(300, 0.015);
            });
        }

        // Clear fire patches
        for (const patch of this._firePatches) {
            if (patch.gfx.active) patch.gfx.destroy();
        }
        this._firePatches = [];
    }

    destroy(fromScene) {
        for (const patch of this._firePatches) {
            if (patch.gfx.active) patch.gfx.destroy();
        }
        super.destroy(fromScene);
    }
}
