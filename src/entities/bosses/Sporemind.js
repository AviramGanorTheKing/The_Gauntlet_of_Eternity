import { Boss } from '../Boss.js';

/**
 * Sporemind (Floor 10, Fungal Caves) — passive poison aura, spore patches, mushroom cloud death.
 */
export class Sporemind extends Boss {
    constructor(scene, x, y, bossData) {
        super(scene, x, y, bossData);
        this._poisonAura = null;
        this._sporePatches = [];
        this._poisonTimer = 0;
        this._auraRadius = 50;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive) return;

        // Passive poison aura — apply poison if player is within radius
        this._poisonTimer += delta;
        if (this._poisonTimer >= 500) {
            this._poisonTimer = 0;
            if (this.target?.alive && !this.target.isInvincible) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                if (dx * dx + dy * dy < this._auraRadius * this._auraRadius) {
                    this.scene.statusEffects?.apply(this.target, 'poison');
                }
            }
        }

        // Animate aura pulse
        if (this._poisonAura?.active) {
            const pulse = 0.12 + 0.04 * Math.sin(time * 0.003);
            this._poisonAura.setAlpha(pulse);
        }
    }

    onPhaseTransition(phaseIndex) {
        if (phaseIndex === 1) {
            this._createPoisonAura();
            this._spreadSporePatches();
        } else if (phaseIndex === 2) {
            this._auraRadius = 80;
        }
    }

    _createPoisonAura() {
        this._poisonAura = this.scene.add.graphics().setDepth(5);
        this._poisonAura.fillStyle(0x44aa22, 0.15);
        this._poisonAura.fillCircle(this.x, this.y, this._auraRadius);
        this.scene.cameras.main.shake(150, 0.005);
    }

    _spreadSporePatches() {
        for (let i = 0; i < 4; i++) {
            const ox = (Math.random() - 0.5) * 180;
            const oy = (Math.random() - 0.5) * 180;
            const px = this.x + ox;
            const py = this.y + oy;
            const patch = this.scene.add.graphics().setDepth(3);
            patch.fillStyle(0x44aa22, 0.2);
            patch.fillCircle(px, py, 32);
            this._sporePatches.push({ gfx: patch, x: px, y: py });
        }
    }

    _deathEffect() {
        // Mushroom cloud: expanding circles
        for (let i = 0; i < 3; i++) {
            const cloud = this.scene.add.graphics().setDepth(9);
            cloud.fillStyle(0x66cc44, 0.6);
            cloud.fillCircle(this.x, this.y - i * 20, 20 + i * 15);
            this.scene.tweens.add({
                targets: cloud,
                alpha: 0, scaleX: 3 + i, scaleY: 3 + i,
                duration: 700 + i * 150, delay: i * 100,
                ease: 'Power1',
                onComplete: () => cloud.destroy()
            });
        }

        // Clean up spore patches
        for (const patch of this._sporePatches) {
            if (patch.gfx.active) {
                this.scene.tweens.add({
                    targets: patch.gfx, alpha: 0, duration: 500,
                    onComplete: () => patch.gfx.destroy()
                });
            }
        }
        this._sporePatches = [];
        if (this._poisonAura?.active) this._poisonAura.destroy();
    }

    destroy(fromScene) {
        for (const patch of this._sporePatches) {
            if (patch.gfx.active) patch.gfx.destroy();
        }
        if (this._poisonAura?.active) this._poisonAura.destroy();
        super.destroy(fromScene);
    }
}
