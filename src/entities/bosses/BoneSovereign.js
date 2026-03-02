import { Boss } from '../Boss.js';

/**
 * Bone Sovereign (Floor 5, Crypt) — raises bone walls on phase 2, crumbles on death.
 */
export class BoneSovereign extends Boss {
    constructor(scene, x, y, bossData) {
        super(scene, x, y, bossData);
        this._boneWalls = [];
    }

    onPhaseTransition(phaseIndex) {
        if (phaseIndex === 1) {
            this._spawnBoneWalls();
        } else if (phaseIndex === 2) {
            this._crumbleBoneWalls();
        }
    }

    _spawnBoneWalls() {
        const wallCount = 6;
        for (let i = 0; i < wallCount; i++) {
            const angle = (Math.PI * 2 / wallCount) * i;
            const wx = this.x + Math.cos(angle) * 80;
            const wy = this.y + Math.sin(angle) * 80;

            const gfx = this.scene.add.graphics().setDepth(4);
            gfx.fillStyle(0xddddbb, 0.8);
            gfx.fillRect(wx - 6, wy - 16, 12, 32);
            gfx.lineStyle(1, 0xffffff, 0.3);
            gfx.strokeRect(wx - 6, wy - 16, 12, 32);

            this._boneWalls.push(gfx);
        }
        this.scene.cameras.main.shake(250, 0.008);
    }

    _crumbleBoneWalls() {
        for (const wall of this._boneWalls) {
            if (!wall.active) continue;
            this.scene.tweens.add({
                targets: wall, alpha: 0, y: wall.y + 16,
                duration: 400, ease: 'Power2',
                onComplete: () => wall.destroy()
            });
        }
        this._boneWalls = [];
    }

    _deathEffect() {
        this._crumbleBoneWalls();

        // Bone shard burst
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const shard = this.scene.add.graphics().setDepth(9);
            shard.fillStyle(0xddddbb, 1);
            shard.fillRect(-4, -10, 8, 20);
            shard.setPosition(this.x, this.y);
            this.scene.tweens.add({
                targets: shard,
                x: this.x + Math.cos(angle) * 60,
                y: this.y + Math.sin(angle) * 60,
                alpha: 0, scaleX: 0.3, scaleY: 0.3,
                duration: 600, ease: 'Power2',
                onComplete: () => shard.destroy()
            });
        }
    }

    destroy(fromScene) {
        for (const wall of this._boneWalls) {
            if (wall.active) wall.destroy();
        }
        super.destroy(fromScene);
    }
}
