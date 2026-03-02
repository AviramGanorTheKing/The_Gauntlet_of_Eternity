import { Player } from '../Player.js';
import { distance } from '../../utils/MathUtils.js';

/**
 * Valkyrie — Shield Throw special: ranged boomerang that stuns.
 */
export class Valkyrie extends Player {
    constructor(scene, x, y) {
        super(scene, x, y, 'valkyrie');
    }

    _executeSpecial(special) {
        const speed = special.speed;
        const maxDist = special.range;
        const angle = this.facingAngle;

        // Create shield projectile
        const shield = this.scene.add.graphics();
        shield.fillStyle(0xddaa22, 0.9);
        shield.fillCircle(0, 0, 8);
        shield.lineStyle(2, 0xffdd44, 1);
        shield.strokeCircle(0, 0, 8);
        shield.setDepth(9);
        shield.setPosition(this.x, this.y);

        const startX = this.x;
        const startY = this.y;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        let elapsed = 0;
        let returning = false;
        let hitEnemies = new Set();

        const updateShield = (time, delta) => {
            if (!shield.active) return;
            elapsed += delta;

            if (!returning) {
                // Fly outward
                shield.x += dirX * speed * (delta / 1000);
                shield.y += dirY * speed * (delta / 1000);
                const traveled = distance(startX, startY, shield.x, shield.y);
                if (traveled >= maxDist) returning = true;
            } else {
                // Return to player
                const dx = this.x - shield.x;
                const dy = this.y - shield.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const retSpeed = speed * 1.3;
                shield.x += (dx / dist) * retSpeed * (delta / 1000);
                shield.y += (dy / dist) * retSpeed * (delta / 1000);

                if (dist < 20) {
                    this.scene.events.off('update', updateShield);
                    shield.destroy();
                    return;
                }
            }

            // Spin visual
            shield.rotation += 0.3;

            // Check enemy collisions
            if (!this.scene.enemies) return;
            for (const enemy of this.scene.enemies.getChildren()) {
                if (!enemy.alive || hitEnemies.has(enemy)) continue;
                const d = distance(shield.x, shield.y, enemy.x, enemy.y);
                if (d < 20) {
                    hitEnemies.add(enemy);
                    this.scene.combatSystem?.dealDamage(this, enemy, special.damage, 0.3, angle);
                    this.scene.statusEffects?.apply(enemy, 'stun');
                    if (!returning && hitEnemies.size > special.bounceTargets) {
                        returning = true;
                    }
                }
            }

            // Safety: destroy after 3 seconds
            if (elapsed > 3000) {
                this.scene.events.off('update', updateShield);
                shield.destroy();
            }
        };

        this.scene.events.on('update', updateShield);
    }
}
