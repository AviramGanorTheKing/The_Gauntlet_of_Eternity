import { GameConfig } from '../config/GameConfig.js';

/**
 * FogOfWar — room-based visibility system.
 *
 * Two tile states:
 *   HIDDEN (0)   — never seen, fully black
 *   REVEALED (1) — explored, fully lit (stays lit forever)
 *
 * When player enters an area, flood-fills to reveal the entire connected room/corridor.
 * No "candle" effect - rooms light up completely when you enter them.
 *
 * PERFORMANCE NOTES:
 *  - redrawFog uses beginDraw/endDraw to batch all sprites into a single draw call.
 *  - floodFillReveal uses a head-pointer queue (O(1) dequeue) instead of Array.shift() (O(n)).
 *  - Entity visibility is no longer swept globally; enemies check their own tile on update.
 */

const FOG_HIDDEN = 0;
const FOG_REVEALED = 1;

export class FogOfWar {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} gridWidth - dungeon width in tiles
     * @param {number} gridHeight - dungeon height in tiles
     * @param {number[][]} dungeonGrid - the tile data grid
     * @param {object} tiles - BiomeData.tiles mapping
     */
    constructor(scene, gridWidth, gridHeight, dungeonGrid, tiles) {
        this.scene = scene;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.dungeonGrid = dungeonGrid;
        this.tiles = tiles;
        this.tileSize = GameConfig.TILE_SIZE;

        // Fog state grid — flat Uint8Array for cache efficiency
        // Index = y * gridWidth + x
        this.fogGrid = new Uint8Array(gridWidth * gridHeight); // 0 = HIDDEN

        // Track player's last tile position
        this.lastPlayerTileX = -1;
        this.lastPlayerTileY = -1;

        // Walkable tiles that can be flood-filled
        this.walkableTiles = new Set([
            tiles.FLOOR, tiles.CORRIDOR, tiles.DOOR,
            tiles.STAIRS, tiles.SPAWNER_PAD
        ]);

        // Re-usable BFS queue array (avoid repeated allocation)
        this._bfsQueueX = new Int16Array(gridWidth * gridHeight);
        this._bfsQueueY = new Int16Array(gridWidth * gridHeight);

        // Re-usable BFS visited bitset
        this._bfsVisited = new Uint8Array(gridWidth * gridHeight);

        // Create dark overlay using a RenderTexture
        this.fogTexture = scene.add.renderTexture(
            0, 0,
            gridWidth * this.tileSize,
            gridHeight * this.tileSize
        );
        this.fogTexture.setDepth(50);
        this.fogTexture.setOrigin(0, 0);

        // Create fog tile texture (a single black square)
        this.createFogTile();

        // Initial fill — everything dark
        this.redrawFog();
    }

    createFogTile() {
        const ts = this.tileSize;

        if (!this.scene.textures.exists('fog_hidden')) {
            const gfx = this.scene.make.graphics({ add: false });
            gfx.fillStyle(0x000000, 1.0);
            gfx.fillRect(0, 0, ts, ts);
            gfx.generateTexture('fog_hidden', ts, ts);
            gfx.destroy();
        }
    }

    /**
     * Call each frame — reveals room when player enters new tile.
     * @param {number} playerX - world X (pixel position)
     * @param {number} playerY - world Y (pixel position)
     */
    update(playerX, playerY) {
        const tileX = (playerX / this.tileSize) | 0;
        const tileY = (playerY / this.tileSize) | 0;

        // Only update if player moved to a new tile
        if (tileX === this.lastPlayerTileX && tileY === this.lastPlayerTileY) {
            return false;
        }

        this.lastPlayerTileX = tileX;
        this.lastPlayerTileY = tileY;

        // If this tile is already revealed, no need to flood fill
        const idx = tileY * this.gridWidth + tileX;
        if (tileY >= 0 && tileY < this.gridHeight && tileX >= 0 && tileX < this.gridWidth &&
            this.fogGrid[idx] === FOG_REVEALED) {
            return false;
        }

        // Flood fill to reveal connected room/corridor
        this.floodFillReveal(tileX, tileY);

        // Redraw the fog overlay (batched)
        this.redrawFog();

        // Notify listeners that visibility changed
        if (this.onVisibilityChange) {
            this.onVisibilityChange();
        }

        return true;
    }

    /**
     * Flood fill reveal starting from a tile position.
     * Uses a head-pointer queue for O(1) dequeue (instead of Array.shift which is O(n)).
     * Uses a flat Uint8Array for visited tracking (cache-friendly).
     */
    floodFillReveal(startX, startY) {
        if (startX < 0 || startX >= this.gridWidth || startY < 0 || startY >= this.gridHeight) {
            return;
        }

        const gw = this.gridWidth;
        const gh = this.gridHeight;
        const fogGrid = this.fogGrid;
        const dungeonGrid = this.dungeonGrid;
        const walkableTiles = this.walkableTiles;
        const wallTile = this.tiles.WALL;

        // Reuse pre-allocated queue arrays and visited bitset
        const qx = this._bfsQueueX;
        const qy = this._bfsQueueY;
        const visited = this._bfsVisited;

        // Zero out visited (only what we touched last time — full reset is cheaper since it's already allocated)
        // We use fill(0) on the whole array; Uint8Array.fill is a native op, very fast.
        visited.fill(0);

        let head = 0;
        let tail = 0;

        const startIdx = startY * gw + startX;
        visited[startIdx] = 1;
        qx[tail] = startX;
        qy[tail] = startY;
        tail++;

        // Pre-computed direction arrays (avoids array spread per BFS node)
        const ALL_DIRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

        while (head < tail) {
            const x = qx[head];
            const y = qy[head];
            head++; // O(1) dequeue

            // Reveal this tile
            fogGrid[y * gw + x] = FOG_REVEALED;

            const tile = dungeonGrid[y][x];
            const isWalkable = walkableTiles.has(tile);

            // If this is a wall/void, don't flood further from here
            if (!isWalkable) continue;

            for (const [dx, dy] of ALL_DIRS) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;

                const nIdx = ny * gw + nx;
                if (visited[nIdx]) continue;
                visited[nIdx] = 1;

                const neighborTile = dungeonGrid[ny][nx];
                const neighborWalkable = walkableTiles.has(neighborTile);

                // Reveal walls adjacent to walkable; continue flood only through walkable
                if (neighborWalkable || neighborTile === wallTile) {
                    qx[tail] = nx;
                    qy[tail] = ny;
                    tail++;
                }
            }
        }
    }

    /**
     * Redraw the fog overlay texture — BATCHED with beginDraw/endDraw.
     * All hidden tiles are drawn in a single render pass instead of one draw-call per tile.
     */
    redrawFog() {
        const ts = this.tileSize;
        const fogGrid = this.fogGrid;
        const gw = this.gridWidth;

        // Compute camera-culled tile range
        const cam = this.scene.cameras.main;
        const startX = Math.max(0, (cam.scrollX / ts - 2) | 0);
        const startY = Math.max(0, (cam.scrollY / ts - 2) | 0);
        const endX = Math.min(this.gridWidth, ((cam.scrollX + cam.width / cam.zoom) / ts + 2) | 0);
        const endY = Math.min(this.gridHeight, ((cam.scrollY + cam.height / cam.zoom) / ts + 2) | 0);

        this.fogTexture.clear();

        // Batch all draws into a single WebGL pass
        this.fogTexture.beginDraw();

        for (let y = startY; y < endY; y++) {
            const rowBase = y * gw;
            for (let x = startX; x < endX; x++) {
                if (fogGrid[rowBase + x] === FOG_HIDDEN) {
                    this.fogTexture.batchDraw('fog_hidden', x * ts, y * ts);
                }
            }
        }

        this.fogTexture.endDraw();
    }

    /**
     * Check if a tile position is currently visible (revealed).
     */
    isVisible(tileX, tileY) {
        if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) return false;
        return this.fogGrid[tileY * this.gridWidth + tileX] === FOG_REVEALED;
    }

    /**
     * Check if a tile has been explored (same as visible for this system).
     */
    isExplored(tileX, tileY) {
        return this.isVisible(tileX, tileY);
    }

    destroy() {
        if (this.fogTexture) this.fogTexture.destroy();
    }
}
