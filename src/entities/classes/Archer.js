import { Player } from '../Player.js';

/**
 * Archer — Place Trap special: drops a spike trap at current position.
 */
export class Archer extends Player {
    constructor(scene, x, y) {
        super(scene, x, y, 'archer');
    }

    _executeSpecial(special) {
        if (this.scene.trapSystem) {
            this.scene.trapSystem.placeTrapAt(this.x, this.y, 'spike_tile');
        }

        // Quick visual feedback
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xccaa00, 0.5);
        flash.fillCircle(this.x, this.y, 20);
        flash.setDepth(9);
        this.scene.tweens.add({
            targets: flash, alpha: 0, duration: 300,
            onComplete: () => flash.destroy()
        });
    }
}
