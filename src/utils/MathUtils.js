/**
 * Normalize a vector to unit length.
 * @param {number} x
 * @param {number} y
 * @returns {{x: number, y: number}}
 */
export function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

/**
 * Distance between two points.
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Angle from point A to point B in radians.
 */
export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Get the cardinal direction string from an angle.
 * @param {number} angle - Angle in radians
 * @returns {string} 'north', 'south', 'east', or 'west'
 */
export function angleToDirection(angle) {
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg < 45) return 'east';
    if (deg >= 45 && deg < 135) return 'south';
    if (deg >= -135 && deg < -45) return 'north';
    return 'west';
}

/**
 * Random integer in range [min, max] inclusive.
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
