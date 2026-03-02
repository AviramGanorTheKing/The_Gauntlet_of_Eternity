/**
 * Global event bus for cross-system communication.
 */
export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
    // Combat
    ENTITY_DAMAGED: 'entity:damaged',
    ENTITY_DIED: 'entity:died',

    // Player
    PLAYER_ATTACK: 'player:attack',
    PLAYER_DODGE: 'player:dodge',
    PLAYER_DEATH: 'player:death',
    PLAYER_HEALTH_CHANGED: 'player:healthChanged',
    SPECIAL_USED: 'player:specialUsed',
    POTION_USED: 'player:potionUsed',

    // Enemy
    ENEMY_SPAWNED: 'enemy:spawned',
    ENEMY_DIED: 'enemy:died',

    // Loot / Pickups
    PICKUP_COLLECTED: 'pickup:collected',
    GEAR_EQUIPPED: 'gear:equipped',
    GOLD_CHANGED: 'gold:changed',
    POTION_PICKED_UP: 'potion:pickedUp',

    // Status Effects
    STATUS_APPLIED: 'status:applied',
    STATUS_EXPIRED: 'status:expired',

    // Traps
    TRAP_TRIGGERED: 'trap:triggered',

    // Shrines
    SHRINE_ACTIVATED: 'shrine:activated',

    // Game flow
    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',
    ROOM_CLEARED: 'room:cleared',

    // Progression (Phase 5)
    SHARDS_EARNED: 'shards:earned',
    PERK_UNLOCKED: 'perk:unlocked',
    CLASS_UNLOCKED: 'class:unlocked',
    MORAL_CHOICE: 'moral:choice',
    GAME_VICTORY: 'game:victory',
    AUTO_SAVE: 'game:autoSave',

    // Secrets (Phase 4)
    SECRET_FOUND: 'secret:found',
};
