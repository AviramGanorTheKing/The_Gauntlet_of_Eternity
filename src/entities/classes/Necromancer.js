import { Player } from '../Player.js';
import { SkeletonMinion } from '../SkeletonMinion.js';

/**
 * Necromancer — Raise Skeleton special: summons skeleton minion allies.
 */
export class Necromancer extends Player {
    constructor(scene, x, y) {
        super(scene, x, y, 'necromancer');
    }

    _executeSpecial(special) {
        // Clean up dead skeletons
        this.skeletons = this.skeletons.filter(s => s.alive && s.active);

        // Cap check
        if (this.skeletons.length >= (special.maxSkeletons || 2)) {
            const oldest = this.skeletons.shift();
            oldest?.die();
        }

        // Spawn slightly in front of player
        const sx = this.x + Math.cos(this.facingAngle) * 24;
        const sy = this.y + Math.sin(this.facingAngle) * 24;

        const minion = new SkeletonMinion(
            this.scene, sx, sy, this,
            special.skeletonDuration || 30000
        );

        this.skeletons.push(minion);

        // Add to scene's minions group for collision handling
        if (!this.scene.minions) {
            this.scene.minions = this.scene.physics.add.group();
        }
        this.scene.minions.add(minion);

        // Wire minion vs enemies collision (contact damage)
        this.scene.physics.add.overlap(
            minion, this.scene.enemies,
            (m, enemy) => {
                if (!m.alive || !enemy.alive) return;
                if (!m.canDealContactDamage()) return;
                this.scene.combatSystem?.dealDamage(
                    m, enemy, m.damage, 0.2,
                    Math.atan2(enemy.y - m.y, enemy.x - m.x)
                );
            }
        );
    }
}
