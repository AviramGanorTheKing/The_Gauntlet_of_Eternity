import { GameConfig } from '../config/GameConfig.js';
import { getBiomeForFloor } from '../config/BiomeData.js';
import { WFCGenerator } from './WFCGenerator.js';
import { EventBus } from '../utils/EventBus.js';

/**
 * DungeonManager — manages floor generation, tilemap creation, and floor transitions.
 * Integrates WFCGenerator output into Phaser tilemaps.
 *
 * Uses the "Dungeons and Pixels" tileset (384×160, 12 cols × 5 rows of 32×32)
 * with full autotiling: walls get correct corner/edge tiles based on neighbor context.
 */
export class DungeonManager {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.generator = new WFCGenerator();
        this.currentFloor = 0;
        this.currentBiome = null;
        this.currentData = null; // generated dungeon data
        this.tilemap = null;
        this.layer = null;
    }

    /**
     * Generate and build a new floor.
     * @param {number} floorNumber
     * @returns {{ startPosition: {x,y}, stairsPosition: {x,y}, spawnerPositions: object[], rooms: object[] }}
     */
    generateFloor(floorNumber) {
        this.currentFloor = floorNumber;
        this.currentBiome = getBiomeForFloor(floorNumber);

        // Generate dungeon data
        this.currentData = this.generator.generate(this.currentBiome, floorNumber);

        // Destroy previous tilemap if exists
        if (this.tilemap) {
            this.tilemap.destroy();
        }

        // Generate the tileset texture for this biome
        this.generateBiomeTileset();

        // Build the Phaser tilemap
        this.buildTilemap();

        EventBus.emit('floor:generated', {
            floor: floorNumber,
            biome: this.currentBiome.key,
            rooms: this.currentData.rooms.length
        });

        return {
            startPosition: this.tileToWorld(this.currentData.startPosition),
            stairsPosition: this.tileToWorld(this.currentData.stairsPosition),
            spawnerPositions: this.currentData.spawnerPositions.map(sp => ({
                ...sp,
                worldX: sp.x * GameConfig.TILE_SIZE + GameConfig.TILE_SIZE / 2,
                worldY: sp.y * GameConfig.TILE_SIZE + GameConfig.TILE_SIZE / 2
            })),
            rooms: this.currentData.rooms,
            grid: this.currentData.grid,
            width: this.currentData.width,
            height: this.currentData.height
        };
    }

    /**
     * Generate tileset texture for this biome.
     * Uses the full "Dungeons and Pixels" tileset (384×160) with biome color tinting.
     * Falls back to a simple procedural 8-tile strip if the PNG is missing.
     */
    generateBiomeTileset() {
        const ts = GameConfig.TILE_SIZE;
        const biomeKey = this.currentBiome.key;
        const key = `tileset_${biomeKey}`;

        if (this.scene.textures.exists(key)) return;

        const srcTex = this.scene.textures.get('dungeon_tileset_src');
        const hasRealTileset = srcTex && srcTex.key !== '__MISSING';

        if (hasRealTileset) {
            // Copy the full 384×160 tileset and apply biome tinting
            const srcImg = srcTex.getSourceImage();
            const W = srcImg.width;   // 384
            const H = srcImg.height;  // 160

            const ct = this.scene.textures.createCanvas(key, W, H);
            const ctx = ct.getContext();
            ctx.drawImage(srcImg, 0, 0);

            // Biome color tint multipliers
            const tints = {
                crypt:        [1.0,  1.0,  1.0 ],
                fungalCaves:  [0.78, 1.08, 0.82],
                ironFortress: [1.08, 0.98, 0.82],
                inferno:      [1.18, 0.78, 0.68],
                abyss:        [0.82, 0.72, 1.12],
            };
            const tint = tints[biomeKey] || tints.crypt;

            if (tint[0] !== 1.0 || tint[1] !== 1.0 || tint[2] !== 1.0) {
                const imgData = ctx.getImageData(0, 0, W, H);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                    d[i]     = Math.min(255, d[i]     * tint[0] | 0);
                    d[i + 1] = Math.min(255, d[i + 1] * tint[1] | 0);
                    d[i + 2] = Math.min(255, d[i + 2] * tint[2] | 0);
                }
                ctx.putImageData(imgData, 0, 0);
            }
            ct.refresh();
            this._useFullTileset = true;
        } else {
            // Fallback: create an 8-tile procedural strip
            this._generateFallbackTileset(key, ts, biomeKey);
            this._useFullTileset = false;
        }
    }

    /**
     * Procedural fallback tileset (8-tile strip) when real tileset PNG is missing.
     */
    _generateFallbackTileset(key, ts, biomeKey) {
        const palette = this.currentBiome.palette;
        const hex = c => `#${c.toString(16).padStart(6, '0')}`;
        const W = ts * 8, H = ts;
        const ct = this.scene.textures.createCanvas(key, W, H);
        const ctx = ct.getContext();

        ctx.fillStyle = '#000';               ctx.fillRect(0, 0, ts, ts);
        ctx.fillStyle = hex(palette.floor);    ctx.fillRect(ts, 0, ts, ts);
        ctx.fillStyle = hex(palette.wall);     ctx.fillRect(ts * 2, 0, ts, ts);
        ctx.fillStyle = hex(palette.corridor); ctx.fillRect(ts * 3, 0, ts, ts);
        ctx.fillStyle = hex(palette.door);     ctx.fillRect(ts * 4, 0, ts, ts);
        ctx.fillStyle = hex(palette.stairs);   ctx.fillRect(ts * 5, 0, ts, ts);
        ctx.fillStyle = hex(palette.floor);    ctx.fillRect(ts * 6, 0, ts, ts);
        ctx.fillStyle = hex(palette.wall);     ctx.fillRect(ts * 7, 0, ts, ts);
        ct.refresh();
    }

    /**
     * Resolve abstract tile types (0–7) into real tileset indices (0–59) using autotiling.
     *
     * Tile mapping from the "Dungeons and Pixels" tileset (verified via Tiled example):
     *
     *   Room boundary corners (diagonal-only): T0(TL) T5(TR) T48(BL) T53(BR)
     *   Top wall:      T1, T2, T3, T4        (floor to south)
     *   Bottom wall:   T49, T50, T51, T52     (floor to north)
     *   Left wall:     T12, T24, T36          (floor to east)
     *   Right wall:    T17, T29, T41          (floor to west)
     *   Junction corners (top, diag open): pick(TOP_WALL)
     *   Junction corners (bottom, diag open): T8(BL) T6(BR)
     *   Concave bend corners (diag closed): T8(TL) T2(TR) T18(BL) T6(BR)
     *   Floor:         T13–T16, T25–T28, T37–T40  (use alternatively)
     *   Stairs:        T42, T54
     *   Transition:    T11, T23, T35, T47, T59  (room connections / doors)
     *   Void:          T19
     *   Spawner:       T43 (green, visually distinct)
     *
     * @param {number[][]} abstractGrid - grid with values 0-7 (abstract tile types)
     * @returns {number[][]} resolved grid with tileset indices 0-59
     */
    _resolveAutoTiles(abstractGrid) {
        const T = this.currentBiome.tiles;
        const rows = abstractGrid.length;
        const cols = abstractGrid[0].length;
        const out = [];

        // Deterministic pseudo-random pick based on position
        const pick = (arr, r, c) => arr[((r * 7919 + c * 6271) & 0x7fffffff) % arr.length];

        // Is a cell walkable (open / floor-like)?
        const isOpen = (r, c) => {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
            const v = abstractGrid[r][c];
            return v === T.FLOOR || v === T.CORRIDOR || v === T.DOOR ||
                   v === T.STAIRS || v === T.SPAWNER_PAD;
        };

        const FLOOR_TILES = [13, 14, 15, 16, 25, 26, 27, 28, 37, 38, 39, 40];
        const TOP_WALL    = [1, 2, 3, 4];
        const BOTTOM_WALL = [49, 50, 51, 52];
        const LEFT_WALL   = [12, 24, 36];
        const RIGHT_WALL  = [17, 29, 41];
        const TRANSITION  = [11, 23, 35, 47, 59];
        const STAIRS_TILES = [42, 54];

        for (let r = 0; r < rows; r++) {
            out[r] = [];
            for (let c = 0; c < cols; c++) {
                const type = abstractGrid[r][c];

                switch (type) {
                    case T.VOID:
                        out[r][c] = 19;
                        break;

                    case T.FLOOR:
                        out[r][c] = pick(FLOOR_TILES, r, c);
                        break;

                    case T.WALL:
                    case T.WALL_V: {
                        const oN = isOpen(r - 1, c);
                        const oS = isOpen(r + 1, c);
                        const oE = isOpen(r, c + 1);
                        const oW = isOpen(r, c - 1);
                        const count = oN + oS + oE + oW;

                        if (count === 0) {
                            // No cardinal floor — check diagonals for inner (concave) corners
                            const oNE = isOpen(r - 1, c + 1);
                            const oNW = isOpen(r - 1, c - 1);
                            const oSE = isOpen(r + 1, c + 1);
                            const oSW = isOpen(r + 1, c - 1);
                            const dCount = oNE + oNW + oSE + oSW;

                            if (dCount === 1) {
                                // Single diagonal open → room boundary corner
                                if (oSE)      out[r][c] = 0;   // TL corner (floor extends SE)
                                else if (oSW) out[r][c] = 5;   // TR corner (floor extends SW)
                                else if (oNE) out[r][c] = 48;  // BL corner (floor extends NE)
                                else          out[r][c] = 53;  // BR corner (floor extends NW)
                            } else if (dCount >= 2) {
                                // Multiple diagonal opens — pick most relevant
                                if (oSE && oSW)      out[r][c] = pick(TOP_WALL, r, c);
                                else if (oNE && oNW)  out[r][c] = pick(BOTTOM_WALL, r, c);
                                else if (oSE && oNE)  out[r][c] = pick(LEFT_WALL, r, c);
                                else if (oSW && oNW)  out[r][c] = pick(RIGHT_WALL, r, c);
                                else                  out[r][c] = 19;
                            } else {
                                out[r][c] = 19; // fully enclosed → void fill
                            }
                        } else if (count >= 3) {
                            // Heavily exposed wall — render as floor
                            out[r][c] = pick(FLOOR_TILES, r, c);
                        } else if (count === 2) {
                            // Two open cardinal sides → check diagonal to distinguish
                            // junction (diagonal open) vs concave bend (diagonal closed)
                            if (oS && oE) {
                                // TL: diagonal open → top wall; closed → concave T8
                                out[r][c] = isOpen(r + 1, c + 1) ? pick(TOP_WALL, r, c) : 8;
                            } else if (oS && oW) {
                                // TR: diagonal open → top wall; closed → concave T2
                                out[r][c] = isOpen(r + 1, c - 1) ? pick(TOP_WALL, r, c) : 2;
                            } else if (oN && oE) {
                                // BL: diagonal open → junction T8; closed → concave T18
                                out[r][c] = isOpen(r - 1, c + 1) ? 8 : 18;
                            } else if (oN && oW) {
                                // BR: diagonal open → junction T6; closed → concave T6
                                out[r][c] = isOpen(r - 1, c - 1) ? 6 : 6;
                            } else if (oN && oS) {
                                out[r][c] = pick(LEFT_WALL, r, c);
                            } else if (oE && oW) {
                                out[r][c] = pick(TOP_WALL, r, c);
                            } else {
                                out[r][c] = pick(TOP_WALL, r, c);
                            }
                        } else {
                            // Single open cardinal side → wall edge
                            if (oS)      out[r][c] = pick(TOP_WALL, r, c);
                            else if (oN) out[r][c] = pick(BOTTOM_WALL, r, c);
                            else if (oE) out[r][c] = pick(LEFT_WALL, r, c);
                            else if (oW) out[r][c] = pick(RIGHT_WALL, r, c);
                            else         out[r][c] = 19;
                        }
                        break;
                    }

                    case T.CORRIDOR:
                        out[r][c] = pick(FLOOR_TILES, r, c);
                        break;

                    case T.DOOR:
                        out[r][c] = pick(FLOOR_TILES, r, c);
                        break;

                    case T.STAIRS:
                        out[r][c] = pick(STAIRS_TILES, r, c);
                        break;

                    case T.SPAWNER_PAD:
                        out[r][c] = 43; // green tile — visually distinct spawner marker
                        break;

                    default:
                        out[r][c] = 19;
                        break;
                }
            }
        }
        return out;
    }

    /**
     * Build Phaser tilemap from generated grid data.
     * When the real tileset is available, uses _resolveAutoTiles for proper autotiling.
     * Otherwise falls back to the abstract 8-tile strip.
     */
    buildTilemap() {
        const data = this.currentData;
        const ts = GameConfig.TILE_SIZE;
        const key = `tileset_${this.currentBiome.key}`;

        if (this._useFullTileset) {
            // Resolve abstract grid → real tileset indices with autotiling
            const resolvedGrid = this._resolveAutoTiles(data.grid);

            this.tilemap = this.scene.make.tilemap({
                data: resolvedGrid,
                tileWidth: ts,
                tileHeight: ts
            });

            const tileset = this.tilemap.addTilesetImage(key);
            this.layer = this.tilemap.createLayer(0, tileset, 0, 0);
            this.layer.setDepth(0);

            // Set collision: everything EXCEPT walkable tiles
            const walkable = [
                13, 14, 15, 16, 25, 26, 27, 28, 37, 38, 39, 40,  // floor variants
                42, 54,                                              // stairs
                11, 23, 35, 47, 59,                                  // door/transition
                43, 55,                                              // spawner (green)
            ];
            this.layer.setCollisionByExclusion(walkable);
        } else {
            // Fallback: use abstract grid with 8-tile strip
            this.tilemap = this.scene.make.tilemap({
                data: data.grid,
                tileWidth: ts,
                tileHeight: ts
            });

            const tileset = this.tilemap.addTilesetImage(key);
            this.layer = this.tilemap.createLayer(0, tileset, 0, 0);
            this.layer.setDepth(0);

            const T = this.currentBiome.tiles;
            this.layer.setCollision([T.VOID, T.WALL, T.WALL_V]);
        }
    }

    /**
     * Convert tile coordinates to world pixel coordinates (center of tile).
     */
    tileToWorld(pos) {
        if (!pos) return { x: 100, y: 100 };
        return {
            x: pos.x * GameConfig.TILE_SIZE + GameConfig.TILE_SIZE / 2,
            y: pos.y * GameConfig.TILE_SIZE + GameConfig.TILE_SIZE / 2
        };
    }

    /**
     * Get the collision layer for physics.
     */
    getCollisionLayer() {
        return this.layer;
    }

    /**
     * Get current biome data.
     */
    getBiome() {
        return this.currentBiome;
    }

    /**
     * Check if a tile position is walkable.
     * Uses the ORIGINAL abstract grid (not the resolved tileset indices).
     */
    isWalkable(tileX, tileY) {
        if (!this.currentData) return false;
        const grid = this.currentData.grid;
        if (tileY < 0 || tileY >= grid.length || tileX < 0 || tileX >= grid[0].length) return false;
        const T = this.currentBiome.tiles;
        const tile = grid[tileY][tileX];
        return tile === T.FLOOR || tile === T.CORRIDOR || tile === T.DOOR ||
            tile === T.STAIRS || tile === T.SPAWNER_PAD;
    }

    destroy() {
        if (this.tilemap) this.tilemap.destroy();
    }
}
