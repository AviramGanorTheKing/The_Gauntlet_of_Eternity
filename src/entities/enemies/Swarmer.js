import { Enemy } from '../Enemy.js';
import { EnemyData } from '../../config/EnemyData.js';
import { ENTITY_STATES } from '../../utils/Constants.js';
import { normalize } from '../../utils/MathUtils.js';

/**
 * Swarmer — chases nearest player, low HP, fast, deals contact damage.
 */
export class Swarmer extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy_swarmer', EnemyData.swarmer);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (!this.alive || !this.target || !this.target.alive) {
            this.body.setVelocity(0, 0);
            return;
        }

        const dist = this.distanceToTarget();

        if (dist <= this.enemyData.aggroRange) {
            // Chase the target
            this.state = ENTITY_STATES.MOVING;
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const norm = normalize(dx, dy);
            this.body.setVelocity(
                norm.x * this.moveSpeed,
                norm.y * this.moveSpeed
            );
        } else {
            // Idle — stop moving
            this.state = ENTITY_STATES.IDLE;
            this.body.setVelocity(0, 0);
        }
    }
}
