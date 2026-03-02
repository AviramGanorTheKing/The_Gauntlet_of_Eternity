import { Player } from '../Player.js';

/**
 * Warrior — Shield Bash special: stuns enemies in a wide arc.
 */
export class Warrior extends Player {
    constructor(scene, x, y) {
        super(scene, x, y, 'warrior');
    }

    _executeSpecial(special) {
        const arcRad = Phaser.Math.DegToRad(special.arc);
        const halfArc = arcRad / 2;
        const angle = this.facingAngle;
        const range = special.range;
        const rangeSq = range * range;

        // Visual bash flash
        const gfx = this.scene.add.graphics();
        gfx.fillStyle(0x8888ff, 0.4);
        gfx.slice(this.x, this.y, range, angle - halfArc, angle + halfArc, false);
        gfx.fillPath();
        gfx.setDepth(9);
        this.scene.tweens.add({
            targets: gfx, alpha: 0, duration: 250,
            onComplete: () => gfx.destroy()
        });

        // Stun enemies in arc
        if (!this.scene.enemies) return;
        for (const enemy of this.scene.enemies.getChildren()) {
            if (!enemy.alive) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            if (dx * dx + dy * dy > rangeSq) continue;
            const angleToEnemy = Math.atan2(dy, dx);
            const diff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - angle));
            if (diff <= halfArc) {
                this.scene.combatSystem.dealDamage(this, enemy, special.damage, 0.5, angle);
                this.scene.statusEffects?.apply(enemy, 'stun');
            }
        }
    }
}
