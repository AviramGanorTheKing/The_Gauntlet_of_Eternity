import { Player } from '../Player.js';

/**
 * Wizard — Teleport Blink special: warp toward mouse cursor.
 */
export class Wizard extends Player {
    constructor(scene, x, y) {
        super(scene, x, y, 'wizard');
    }

    _executeSpecial(special) {
        const pointer = this.scene.input.activePointer;
        const dx = pointer.worldX - this.x;
        const dy = pointer.worldY - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const dist = Math.min(len, special.distance);
        const nx = this.x + (dx / len) * dist;
        const ny = this.y + (dy / len) * dist;

        // Trail effect at old position
        const trail = this.scene.add.graphics();
        trail.fillStyle(0x8888ff, 0.5);
        trail.fillCircle(this.x, this.y, 12);
        trail.setDepth(9);
        this.scene.tweens.add({
            targets: trail, alpha: 0, scale: 2, duration: 300,
            onComplete: () => trail.destroy()
        });

        // Brief invulnerability during blink
        this.isInvincible = true;
        this.setPosition(nx, ny);
        this.scene.time.delayedCall(120, () => { this.isInvincible = false; });

        // Arrival flash
        const flash = this.scene.add.graphics();
        flash.fillStyle(0x8888ff, 0.6);
        flash.fillCircle(nx, ny, 14);
        flash.setDepth(9);
        this.scene.tweens.add({
            targets: flash, alpha: 0, duration: 200,
            onComplete: () => flash.destroy()
        });
    }
}
