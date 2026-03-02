/**
 * Biome configuration data.
 * Defines tile rules, room counts, floor ranges, and visual palettes per biome.
 */
export const BiomeData = {
    crypt: {
        name: 'The Crypt',
        floors: [1, 5],
        roomCount: [8, 12],       // min, max rooms per floor
        gridWidth: 60,            // dungeon grid width in tiles
        gridHeight: 45,           // dungeon grid height in tiles
        minRoomSize: 6,           // minimum room dimension (tiles)
        maxRoomSize: 12,          // maximum room dimension (tiles)
        corridorWidth: 2,         // corridor width in tiles
        bspMinLeafSize: 10,       // minimum BSP leaf size

        // Floor scaling: later floors in biome are larger
        floorScaling: {
            roomCountBonus: 1,    // extra rooms per floor after first
            gridGrowth: 5         // extra grid tiles per floor after first
        },

        // Spawner config
        spawnersPerRoom: [1, 3],  // min, max spawners per combat room
        enemyTypes: ['swarmer', 'swarmer', 'swarmer', 'bruiser'], // weighted pool
        eliteChance: 0.05,        // per floor

        // Visual
        palette: {
            floor: 0x3a3a4a,
            floorAlt: 0x343446,
            wall: 0x1a1a2e,
            wallTop: 0x252540,
            corridor: 0x32323e,
            door: 0x4a4a3a,
            stairs: 0x6a5a2a,
            spawner: 0x553333,
            border: 0x121226
        },

        // Tile indices in the generated tileset
        tiles: {
            VOID: 0,
            FLOOR: 1,
            WALL: 2,
            CORRIDOR: 3,
            DOOR: 4,
            STAIRS: 5,
            SPAWNER_PAD: 6,
            WALL_V: 7
        }
    },

    fungalCaves: {
        name: 'Fungal Caves',
        floors: [6, 10],
        roomCount: [12, 16],
        gridWidth: 70,
        gridHeight: 50,
        minRoomSize: 7,
        maxRoomSize: 14,
        corridorWidth: 2,
        bspMinLeafSize: 12,

        floorScaling: { roomCountBonus: 1, gridGrowth: 5 },

        spawnersPerRoom: [2, 4],
        enemyTypes: ['swarmer', 'swarmer', 'ranged', 'bomber'],
        eliteChance: 0.08,

        palette: {
            floor: 0x2a3a2a,
            floorAlt: 0x243624,
            wall: 0x1a2a1a,
            wallTop: 0x203620,
            corridor: 0x283828,
            door: 0x3a4a2a,
            stairs: 0x5a6a2a,
            spawner: 0x443355,
            border: 0x121e12
        },

        tiles: {
            VOID: 0, FLOOR: 1, WALL: 2, CORRIDOR: 3,
            DOOR: 4, STAIRS: 5, SPAWNER_PAD: 6, WALL_V: 7
        }
    },

    ironFortress: {
        name: 'Iron Fortress',
        floors: [11, 15],
        roomCount: [16, 20],
        gridWidth: 80,
        gridHeight: 55,
        minRoomSize: 7,
        maxRoomSize: 16,
        corridorWidth: 3,
        bspMinLeafSize: 14,

        floorScaling: { roomCountBonus: 1, gridGrowth: 6 },

        spawnersPerRoom: [2, 4],
        enemyTypes: ['bruiser', 'bruiser', 'ranged', 'ranged', 'swarmer'],
        eliteChance: 0.10,

        palette: {
            floor: 0x4a4a50,
            floorAlt: 0x424248,
            wall: 0x2e2e34,
            wallTop: 0x3a3a42,
            corridor: 0x3e3e44,
            door: 0x5a5a4a,
            stairs: 0x6a6a3a,
            spawner: 0x554433,
            border: 0x22222a
        },

        tiles: {
            VOID: 0, FLOOR: 1, WALL: 2, CORRIDOR: 3,
            DOOR: 4, STAIRS: 5, SPAWNER_PAD: 6, WALL_V: 7
        }
    },

    inferno: {
        name: 'The Inferno',
        floors: [16, 20],
        roomCount: [20, 24],
        gridWidth: 90,
        gridHeight: 60,
        minRoomSize: 8,
        maxRoomSize: 16,
        corridorWidth: 3,
        bspMinLeafSize: 14,

        floorScaling: { roomCountBonus: 2, gridGrowth: 6 },

        spawnersPerRoom: [3, 5],
        enemyTypes: ['bruiser', 'bomber', 'bomber', 'swarmer', 'ranged'],
        eliteChance: 0.15,

        palette: {
            floor: 0x3a2222,
            floorAlt: 0x341e1e,
            wall: 0x1e1010,
            wallTop: 0x2a1616,
            corridor: 0x321c1c,
            door: 0x4a3a1a,
            stairs: 0x6a4a1a,
            spawner: 0x553322,
            border: 0x140a0a
        },

        tiles: {
            VOID: 0, FLOOR: 1, WALL: 2, CORRIDOR: 3,
            DOOR: 4, STAIRS: 5, SPAWNER_PAD: 6, WALL_V: 7
        }
    },

    abyss: {
        name: 'The Abyss',
        floors: [21, 25],
        roomCount: [24, 30],
        gridWidth: 100,
        gridHeight: 65,
        minRoomSize: 8,
        maxRoomSize: 18,
        corridorWidth: 3,
        bspMinLeafSize: 16,

        floorScaling: { roomCountBonus: 2, gridGrowth: 8 },

        spawnersPerRoom: [3, 6],
        enemyTypes: ['swarmer', 'bruiser', 'ranged', 'bomber'],
        eliteChance: 0.20,

        palette: {
            floor: 0x1a1a2e,
            floorAlt: 0x161628,
            wall: 0x0e0e1e,
            wallTop: 0x141426,
            corridor: 0x181828,
            door: 0x2a2a4a,
            stairs: 0x4a3a6a,
            spawner: 0x442255,
            border: 0x0a0a14
        },

        tiles: {
            VOID: 0, FLOOR: 1, WALL: 2, CORRIDOR: 3,
            DOOR: 4, STAIRS: 5, SPAWNER_PAD: 6, WALL_V: 7
        }
    }
};

/**
 * Get biome config for a given floor number.
 */
export function getBiomeForFloor(floor) {
    for (const [key, biome] of Object.entries(BiomeData)) {
        if (floor >= biome.floors[0] && floor <= biome.floors[1]) {
            return { key, ...biome };
        }
    }
    // Default to crypt
    return { key: 'crypt', ...BiomeData.crypt };
}
