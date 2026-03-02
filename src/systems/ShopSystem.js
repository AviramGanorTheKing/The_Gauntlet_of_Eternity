import { EventBus, Events } from '../utils/EventBus.js';
import { RARITY, rollRarity, rollGearItem } from '../config/GearData.js';

/**
 * ShopSystem — manages shop room placement, inventory, and purchase transactions.
 * One shop per biome (guaranteed), placed in a random room marked as SHOP.
 */
export class ShopSystem {
    constructor(scene) {
        this.scene = scene;
        this.shopNPCs = [];     // active shop graphics/zones
        this.shopOpen = false;
        this.shopUI = null;
    }

    /**
     * Place a shop in one room per biome.
     * @param {object} floorData - floor generation output
     * @param {number} floorNumber
     */
    placeShop(floorData, floorNumber) {
        // Shops appear on floors 1, 6, 11, 16, 21 (first floor of each biome)
        const shopFloors = [1, 6, 11, 16, 21];
        if (!shopFloors.includes(floorNumber)) return;

        const rooms = floorData.rooms;
        if (rooms.length < 3) return;

        // Pick a random non-first room
        const idx = 1 + Math.floor(Math.random() * (rooms.length - 2));
        const room = rooms[idx];
        const ts = 32;
        const cx = (room.x + room.width / 2) * ts;
        const cy = (room.y + room.height / 2) * ts;

        // Generate shop inventory
        const inventory = this._generateInventory(floorNumber);

        // Shop NPC graphic
        const gfx = this.scene.add.graphics().setDepth(8);
        gfx.fillStyle(0x44aaff, 0.8);
        gfx.fillCircle(cx, cy, 10);
        gfx.lineStyle(2, 0xffffff, 0.5);
        gfx.strokeCircle(cx, cy, 12);

        // "SHOP" label
        const label = this.scene.add.text(cx, cy - 20, 'SHOP', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#44aaff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(8);

        // Interaction zone
        const zone = this.scene.add.zone(cx, cy, 48, 48);
        this.scene.physics.add.existing(zone, true);

        let shopActive = false;
        this.scene.physics.add.overlap(this.scene.player, zone, () => {
            if (shopActive) return;
            shopActive = true;
            this._openShop(inventory, floorNumber, () => { shopActive = false; });
        });

        this.shopNPCs.push({ gfx, label, zone });
    }

    _generateInventory(floorNumber) {
        const items = [];
        const tier = Math.floor((floorNumber - 1) / 5); // 0-4

        // Always: health potion, mana potion
        items.push({ type: 'health_potion', name: 'Health Potion', price: 25 + tier * 10 });
        items.push({ type: 'mana_potion', name: 'Mana Potion', price: 25 + tier * 10 });

        // 2 random gear items at uncommon rarity
        const slots = ['weapon', 'armor', 'accessory'];
        for (let i = 0; i < 2; i++) {
            const slot = slots[Math.floor(Math.random() * slots.length)];
            const gear = rollGearItem(slot, RARITY.UNCOMMON);
            if (gear) {
                items.push({
                    type: 'gear', gear,
                    name: `${gear.rarityName} ${gear.name} (${gear.slot})`,
                    price: 75 + tier * 30
                });
            }
        }

        // 1 rare gear item
        const rareSlot = slots[Math.floor(Math.random() * slots.length)];
        const rareGear = rollGearItem(rareSlot, RARITY.RARE);
        if (rareGear) {
            items.push({
                type: 'gear', gear: rareGear,
                name: `${rareGear.rarityName} ${rareGear.name} (${rareGear.slot})`,
                price: 200 + tier * 50
            });
        }

        return items;
    }

    _openShop(inventory, floorNumber, onClose) {
        if (this.shopOpen) { onClose(); return; }
        this.shopOpen = true;

        const player = this.scene.player;
        const W = this.scene.game.config.width;
        const H = this.scene.game.config.height;

        // Shop panel (screen-space overlay)
        const container = this.scene.add.container(0, 0).setDepth(500).setScrollFactor(0);

        // Dark backdrop
        const bg = this.scene.add.graphics().setScrollFactor(0);
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(W * 0.15, H * 0.15, W * 0.7, H * 0.7);
        bg.lineStyle(2, 0x44aaff, 0.8);
        bg.strokeRect(W * 0.15, H * 0.15, W * 0.7, H * 0.7);
        container.add(bg);

        // Title
        const title = this.scene.add.text(W / 2, H * 0.2, `🏪 SHOP — Floor ${floorNumber}`, {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#44aaff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        container.add(title);

        // Gold display
        const goldText = this.scene.add.text(W / 2, H * 0.26, `💰 ${player.gold || 0}g`, {
            fontFamily: 'monospace', fontSize: '12px',
            color: '#ffcc00', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        container.add(goldText);

        // Item buttons
        const itemTexts = [];
        let y = H * 0.33;

        for (const item of inventory) {
            const canBuy = (player.gold || 0) >= item.price;
            const txt = this.scene.add.text(W * 0.2, y,
                `${item.name} — ${item.price}g${!canBuy ? ' (insufficient gold)' : ''}`, {
                fontFamily: 'monospace', fontSize: '10px',
                color: canBuy ? '#ffffff' : '#666666',
                stroke: '#000', strokeThickness: 2,
                backgroundColor: canBuy ? '#222244' : '#111111',
                padding: { x: 6, y: 4 }
            }).setScrollFactor(0).setInteractive();

            if (canBuy) {
                txt.on('pointerdown', () => {
                    this._purchaseItem(player, item);
                    goldText.setText(`💰 ${player.gold || 0}g`);

                    // Grey out purchased item
                    txt.setColor('#444444');
                    txt.setText(`${item.name} — SOLD`);
                    txt.removeInteractive();
                });
            }

            container.add(txt);
            itemTexts.push(txt);
            y += 28;
        }

        // Close instruction
        const closeText = this.scene.add.text(W / 2, H * 0.82, '[ESC] Close Shop', {
            fontFamily: 'monospace', fontSize: '10px',
            color: '#aaaaaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        container.add(closeText);

        // ESC to close
        const escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        const closeHandler = () => {
            container.destroy();
            escKey.off('down', closeHandler);
            this.shopOpen = false;
            this.scene.time.delayedCall(500, onClose);
        };
        escKey.on('down', closeHandler);

        this.shopUI = container;
    }

    _purchaseItem(player, item) {
        player.gold = (player.gold || 0) - item.price;
        EventBus.emit(Events.GOLD_CHANGED, { gold: player.gold });

        switch (item.type) {
            case 'health_potion':
                player.hpPotions = Math.min(6, (player.hpPotions || 0) + 1);
                EventBus.emit(Events.POTION_PICKED_UP, { type: 'health', count: player.hpPotions });
                break;
            case 'mana_potion':
                player.mpPotions = Math.min(4, (player.mpPotions || 0) + 1);
                EventBus.emit(Events.POTION_PICKED_UP, { type: 'mana', count: player.mpPotions });
                break;
            case 'gear':
                if (item.gear) {
                    const slot = item.gear.slot;
                    player.gear[slot] = item.gear;
                    EventBus.emit(Events.GEAR_EQUIPPED, { item: item.gear, slot });
                }
                break;
        }
    }

    clearAll() {
        for (const npc of this.shopNPCs) {
            npc.gfx?.destroy();
            npc.label?.destroy();
            npc.zone?.destroy();
        }
        this.shopNPCs = [];
        if (this.shopUI?.active) this.shopUI.destroy();
        this.shopOpen = false;
    }
}
