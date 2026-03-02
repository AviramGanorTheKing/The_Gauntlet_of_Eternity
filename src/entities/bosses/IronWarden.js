import { Boss } from '../Boss.js';

/**
 * Iron Warden (Floor 15, Fortress) — spinning shield in phase 2, shield break + armor shatter death.
 */
export class IronWarden extends Boss {
    constructor(scene, x, y, bossData) {
        super(scene, x, y, bossData);
        this._shield = null;
        this._shieldRotation = 0;
        this._shieldActive = false;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.alive || !this._shieldActive || !this._shield?.active) return;

        // Spin shield around the boss
        this._shieldRotation += 0.06;
        const r = 30;
        this._shield.setPosition(
            this.x + Math.cos(this._shieldRotation) * r,
            this.y + Math.sin(this._shieldRotation) * r
        );
        this._shield.rotation = this._shieldRotation;
    }

    onPhaseTransition(phaseIndex) {
        if (phaseIndex === 1) {
            this._activateShield();
        } else if (phaseIndex === 2) {
            this._breakShield();
        }
    }

    _activateShield() {
        this._shield = this.scene.add.graphics().setDepth(8);
        this._shield.fillStyle(0x8888cc, 0.9);
        this._shield.fillTriangle(-10, -14, 10, -14, 0, 14);
        this._shield.lineStyle(2, 0xccccff, 1);
        this._shield.strokeTriangle(-10, -14, 10, -14, 0, 14);
        this._shieldActive = true;
        this.scene.cameras.main.shake(200, 0.01);
    }

    _breakShield() {
        if (!this._shield?.active) return;
        this._shieldActive = false;

        const sx = this._shield.x;
        const sy = this._shield.y;
        this.scene.tweens.add({
            targets: this._shield,
            scaleX: 3, scaleY: 3, alpha: 0, duration: 200,
            onComplete: () => this._shield?.destroy()
        });

        // Defense drops when shield breaks
        this.defense = Math.max(0, this.defense - 4);
        this.scene.cameras.main.shake(300, 0.012);
        this.scene.cameras.main.flash(200, 150, 150, 255);
    }

    _deathEffect() {
        if (this._shield?.active) this._shield.destroy();

        // Armor shard burst
        const shardColors = [0x8888aa, 0xaaaacc, 0x666688];
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            const shard = this.scene.add.graphics().setDepth(9);
            shard.fillStyle(Phaser.Utils.Array.GetRandom(shardColors), 1);
            shard.fillRect(-5, -8, 10, 16);
            shard.setPosition(this.x, this.y);
            this.scene.tweens.add({
                targets: shard,
                x: this.x + Math.cos(angle) * (40 + Math.random() * 40),
                y: this.y + Math.sin(angle) * (40 + Math.random() * 40),
                rotation: Math.random() * Math.PI * 4,
                alpha: 0, duration: 700, ease: 'Power2',
                onComplete: () => shard.destroy()
            });
        }
    }

    destroy(fromScene) {
        if (this._shield?.active) this._shield.destroy();
        super.destroy(fromScene);
    }
}
