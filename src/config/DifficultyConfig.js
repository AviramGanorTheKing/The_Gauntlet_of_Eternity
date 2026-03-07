/**
 * DifficultyConfig — three-tier difficulty system.
 *
 * Multipliers applied at game start:
 *   enemyHp           — enemy max HP multiplier
 *   enemyDamage       — enemy damage multiplier
 *   spawnIntervalMult — spawner ms between spawns (higher = slower = fewer enemies)
 *   maxEnemies        — spawner maxActiveEnemies cap
 *   playerHp          — player max HP multiplier
 *   healing           — potion heal amount multiplier
 *   shards            — soul shard reward multiplier
 */
export const DIFFICULTIES = {
    easy: {
        label: 'EASY',
        color: '#44ff88',
        enemyHp:           0.70,
        enemyDamage:       0.70,
        spawnIntervalMult: 1.40,
        maxEnemies:        3,
        playerHp:          1.30,
        healing:           1.30,
        shards:            0.75,
        spawnMultiplier:   1,
    },
    normal: {
        label: 'NORMAL',
        color: '#ffdd00',
        enemyHp:           1.00,
        enemyDamage:       1.00,
        spawnIntervalMult: 1.00,
        maxEnemies:        4,
        playerHp:          1.00,
        healing:           1.00,
        shards:            1.00,
        spawnMultiplier:   3,
    },
    hard: {
        label: 'HARD',
        color: '#ff4444',
        enemyHp:           1.40,
        enemyDamage:       1.40,
        spawnIntervalMult: 0.70,
        maxEnemies:        6,
        playerHp:          0.80,
        healing:           0.70,
        shards:            1.50,
        spawnMultiplier:   5,
    },
};

const STORAGE_KEY = 'gauntlet_difficulty';

/** @returns {'easy'|'normal'|'hard'} */
export function getDifficulty() {
    const val = localStorage.getItem(STORAGE_KEY);
    return DIFFICULTIES[val] ? val : 'normal';
}

/** @param {'easy'|'normal'|'hard'} key */
export function setDifficulty(key) {
    if (DIFFICULTIES[key]) localStorage.setItem(STORAGE_KEY, key);
}

/** @returns {object} the config object for the current difficulty */
export function getDifficultyConfig() {
    return DIFFICULTIES[getDifficulty()];
}
