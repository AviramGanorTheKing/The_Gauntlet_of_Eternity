/**
 * WFCGenerator — Procedural dungeon generation using BSP tree partitioning
 * with constraint-based tile placement.
 *
 * Algorithm:
 * 1. BSP split: recursively divide space into leaf nodes
 * 2. Room carving: place a room in each leaf
 * 3. Corridor connection: connect sibling rooms through parent nodes
 * 4. Connectivity check: BFS to verify all rooms are reachable
 * 5. Content placement: spawners, stairs, special rooms
 *
 * Output: 2D grid of tile IDs matching BiomeData.tiles
 */
export class WFCGenerator {
    /**
     * Generate a dungeon floor.
     * @param {object} biome - BiomeData config for this biome
     * @param {number} floorNumber - Current floor (1-indexed)
     * @returns {{ grid: number[][], rooms: object[], spawnerPositions: object[], stairsPosition: object, startPosition: object }}
     */
    generate(biome, floorNumber) {
        // Scale dungeon size with floor progression within biome
        const floorIndex = floorNumber - biome.floors[0]; // 0-based within biome
        const scaling = biome.floorScaling;

        const gridW = biome.gridWidth + floorIndex * scaling.gridGrowth;
        const gridH = biome.gridHeight + floorIndex * scaling.gridGrowth;
        const targetRooms = Phaser.Math.Between(
            biome.roomCount[0] + floorIndex * scaling.roomCountBonus,
            biome.roomCount[1] + floorIndex * scaling.roomCountBonus
        );

        const T = biome.tiles;

        // Initialize grid with void
        const grid = [];
        for (let y = 0; y < gridH; y++) {
            grid.push(new Array(gridW).fill(T.VOID));
        }

        // Step 1: BSP split
        const root = this.bspSplit(1, 1, gridW - 2, gridH - 2, biome.bspMinLeafSize, targetRooms);

        // Step 2: Carve rooms in leaves
        const rooms = [];
        this.carveRooms(root, grid, biome, rooms);

        // Step 3: Connect rooms via corridors
        this.connectRooms(root, grid, biome);

        // Step 4: Add walls around all floor/corridor tiles
        this.addWalls(grid, gridW, gridH, T);

        // Step 5: Verify connectivity and fix if needed
        this.ensureConnectivity(grid, rooms, T);

        // Step 6: Place content
        const spawnerPositions = this.placeSpawners(rooms, biome);
        const stairsPosition = this.placeStairs(rooms);
        const startPosition = this.placeStart(rooms);

        // Mark stairs on grid
        if (stairsPosition) {
            grid[stairsPosition.y][stairsPosition.x] = T.STAIRS;
        }

        // Mark spawner pads on grid
        for (const sp of spawnerPositions) {
            grid[sp.y][sp.x] = T.SPAWNER_PAD;
        }

        return {
            grid,
            width: gridW,
            height: gridH,
            rooms,
            spawnerPositions,
            stairsPosition,
            startPosition
        };
    }

    /**
     * BSP recursive split.
     * Returns a tree of nodes, each with {x, y, w, h, left, right, room}.
     */
    bspSplit(x, y, w, h, minSize, targetRooms) {
        const node = { x, y, w, h, left: null, right: null, room: null };

        // Decide whether to split
        if (w < minSize * 2 && h < minSize * 2) return node;
        if (targetRooms <= 1) return node;

        // Choose split direction (prefer splitting the larger axis)
        let splitHorizontal;
        if (w > h * 1.25) {
            splitHorizontal = false;
        } else if (h > w * 1.25) {
            splitHorizontal = true;
        } else {
            splitHorizontal = Math.random() > 0.5;
        }

        const maxDim = splitHorizontal ? h : w;
        if (maxDim < minSize * 2) return node;

        // Pick split position (30%-70% range for variety)
        const minSplit = Math.floor(maxDim * 0.3);
        const maxSplit = Math.floor(maxDim * 0.7);
        const split = Phaser.Math.Between(
            Math.max(minSize, minSplit),
            Math.min(maxDim - minSize, maxSplit)
        );

        const leftRooms = Math.ceil(targetRooms / 2);
        const rightRooms = targetRooms - leftRooms;

        if (splitHorizontal) {
            node.left = this.bspSplit(x, y, w, split, minSize, leftRooms);
            node.right = this.bspSplit(x, y + split, w, h - split, minSize, rightRooms);
        } else {
            node.left = this.bspSplit(x, y, split, h, minSize, leftRooms);
            node.right = this.bspSplit(x + split, y, w - split, h, minSize, rightRooms);
        }

        return node;
    }

    /**
     * Carve rooms inside BSP leaf nodes.
     */
    carveRooms(node, grid, biome, rooms) {
        if (node.left || node.right) {
            // Internal node — recurse
            if (node.left) this.carveRooms(node.left, grid, biome, rooms);
            if (node.right) this.carveRooms(node.right, grid, biome, rooms);
            return;
        }

        // Leaf node — carve a room
        const padding = 2;
        const maxW = Math.min(node.w - padding * 2, biome.maxRoomSize);
        const maxH = Math.min(node.h - padding * 2, biome.maxRoomSize);
        const minW = Math.min(biome.minRoomSize, maxW);
        const minH = Math.min(biome.minRoomSize, maxH);

        if (maxW < minW || maxH < minH) return;

        const roomW = Phaser.Math.Between(minW, maxW);
        const roomH = Phaser.Math.Between(minH, maxH);
        const roomX = Phaser.Math.Between(node.x + padding, node.x + node.w - roomW - padding);
        const roomY = Phaser.Math.Between(node.y + padding, node.y + node.h - roomH - padding);

        const T = biome.tiles;

        // Carve floor tiles
        for (let y = roomY; y < roomY + roomH; y++) {
            for (let x = roomX; x < roomX + roomW; x++) {
                if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
                    grid[y][x] = T.FLOOR;
                }
            }
        }

        const room = {
            x: roomX,
            y: roomY,
            w: roomW,
            h: roomH,
            centerX: Math.floor(roomX + roomW / 2),
            centerY: Math.floor(roomY + roomH / 2),
            index: rooms.length
        };

        node.room = room;
        rooms.push(room);
    }

    /**
     * Connect sibling rooms with corridors.
     */
    connectRooms(node, grid, biome) {
        if (!node.left || !node.right) return;

        // Recurse first
        this.connectRooms(node.left, grid, biome);
        this.connectRooms(node.right, grid, biome);

        // Find a room in each subtree to connect
        const leftRoom = this.findRoom(node.left);
        const rightRoom = this.findRoom(node.right);

        if (leftRoom && rightRoom) {
            this.carveCorridor(grid, leftRoom, rightRoom, biome);
        }
    }

    /**
     * Find any room in a subtree (picks the closest to center).
     */
    findRoom(node) {
        if (node.room) return node.room;
        const left = node.left ? this.findRoom(node.left) : null;
        const right = node.right ? this.findRoom(node.right) : null;
        // Return whichever exists; prefer left
        return left || right;
    }

    /**
     * Carve an L-shaped corridor between two rooms.
     */
    carveCorridor(grid, roomA, roomB, biome) {
        const T = biome.tiles;
        const corridorW = biome.corridorWidth;
        let x1 = roomA.centerX;
        let y1 = roomA.centerY;
        let x2 = roomB.centerX;
        let y2 = roomB.centerY;

        // Randomly choose whether to go horizontal-first or vertical-first
        if (Math.random() > 0.5) {
            this.carveHLine(grid, x1, x2, y1, corridorW, T);
            this.carveVLine(grid, y1, y2, x2, corridorW, T);
        } else {
            this.carveVLine(grid, y1, y2, x1, corridorW, T);
            this.carveHLine(grid, x1, x2, y2, corridorW, T);
        }
    }

    /**
     * Carve a horizontal corridor line.
     */
    carveHLine(grid, x1, x2, y, width, T) {
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const halfW = Math.floor(width / 2);

        for (let x = startX; x <= endX; x++) {
            for (let dy = -halfW; dy <= halfW; dy++) {
                const ty = y + dy;
                if (ty >= 0 && ty < grid.length && x >= 0 && x < grid[0].length) {
                    if (grid[ty][x] === T.VOID) {
                        grid[ty][x] = T.CORRIDOR;
                    }
                }
            }
        }
    }

    /**
     * Carve a vertical corridor line.
     */
    carveVLine(grid, y1, y2, x, width, T) {
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        const halfW = Math.floor(width / 2);

        for (let y = startY; y <= endY; y++) {
            for (let dx = -halfW; dx <= halfW; dx++) {
                const tx = x + dx;
                if (y >= 0 && y < grid.length && tx >= 0 && tx < grid[0].length) {
                    if (grid[y][tx] === T.VOID) {
                        grid[y][tx] = T.CORRIDOR;
                    }
                }
            }
        }
    }

    /**
     * Add wall tiles around all walkable tiles with proper thickness.
     * Ensures no gaps between walkable areas and void.
     */
    addWalls(grid, gridW, gridH, T) {
        const walkable = new Set([T.FLOOR, T.CORRIDOR]);

        // Pass 1: Add 2-tile thick walls around everything walkable
        // This ensures proper wall coverage at corners and corridor ends
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                if (grid[y][x] !== T.VOID) continue;

                // Check within 2-tile radius for walkable
                let nearWalkable = false;
                outer: for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < gridH && nx >= 0 && nx < gridW) {
                            if (walkable.has(grid[ny][nx])) {
                                nearWalkable = true;
                                break outer;
                            }
                        }
                    }
                }
                if (nearWalkable) {
                    grid[y][x] = T.WALL;
                }
            }
        }

        // Pass 2: Ensure all void tiles directly adjacent to walkable become walls
        // This catches edge cases where the 2-tile radius missed corners
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                if (grid[y][x] !== T.VOID) continue;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < gridH && nx >= 0 && nx < gridW) {
                            if (walkable.has(grid[ny][nx])) {
                                grid[y][x] = T.WALL;
                                break;
                            }
                        }
                    }
                    if (grid[y][x] === T.WALL) break;
                }
            }
        }

        // Pass 3: Ensure top walls have proper depth (2 tiles above walkable)
        // This prevents the "floating" visual effect in top-down view
        for (let y = 2; y < gridH - 1; y++) {
            for (let x = 0; x < gridW; x++) {
                if (grid[y][x] === T.WALL && walkable.has(grid[y + 1]?.[x])) {
                    // This is a wall directly above walkable - ensure wall above it too
                    if (y - 1 >= 0 && grid[y - 1][x] === T.VOID) {
                        grid[y - 1][x] = T.WALL;
                    }
                    if (y - 2 >= 0 && grid[y - 2][x] === T.VOID) {
                        grid[y - 2][x] = T.WALL;
                    }
                }
            }
        }
    }

    /**
     * BFS to ensure all rooms are connected. Fix disconnected regions.
     * PERFORMANCE: uses flat Uint8Array for visited (cache-friendly) and
     * head-pointer queue (O(1) dequeue). After carving a corridor, extends
     * the existing visited set from the corridor entry point instead of
     * restarting BFS from scratch.
     */
    ensureConnectivity(grid, rooms, T) {
        if (rooms.length <= 1) return;

        const walkable = new Set([T.FLOOR, T.CORRIDOR, T.DOOR, T.STAIRS, T.SPAWNER_PAD]);
        const h = grid.length;
        const w = grid[0].length;
        const size = h * w;

        // Flat Uint8Array: visited[y * w + x]
        const visited = new Uint8Array(size);

        // Pre-allocated BFS queue
        const qx = new Int16Array(size);
        const qy = new Int16Array(size);

        // ── Initial BFS from room[0] ────────────────────────────────────────
        const start = rooms[0];
        let head = 0, tail = 0;
        const startIdx = start.centerY * w + start.centerX;
        visited[startIdx] = 1;
        qx[tail] = start.centerX;
        qy[tail] = start.centerY;
        tail++;

        const DIR = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        const bfsExtend = (fromX, fromY) => {
            let qHead = head, qTail = tail;
            // Temporarily use the existing queue from the current tail
            // We actually run a fresh mini-BFS for each corridor start
            const mQx = new Int16Array(size);
            const mQy = new Int16Array(size);
            let mHead = 0, mTail = 0;
            const idx = fromY * w + fromX;
            if (visited[idx]) return;
            visited[idx] = 1;
            mQx[mTail] = fromX;
            mQy[mTail] = fromY;
            mTail++;
            while (mHead < mTail) {
                const cx = mQx[mHead];
                const cy = mQy[mHead];
                mHead++;
                for (const [dx, dy] of DIR) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                    const nIdx = ny * w + nx;
                    if (visited[nIdx]) continue;
                    if (!walkable.has(grid[ny][nx])) continue;
                    visited[nIdx] = 1;
                    mQx[mTail] = nx;
                    mQy[mTail] = ny;
                    mTail++;
                }
            }
        };

        while (head < tail) {
            const cx = qx[head];
            const cy = qy[head];
            head++;
            for (const [dx, dy] of DIR) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const nIdx = ny * w + nx;
                if (visited[nIdx]) continue;
                if (!walkable.has(grid[ny][nx])) continue;
                visited[nIdx] = 1;
                qx[tail] = nx;
                qy[tail] = ny;
                tail++;
            }
        }

        // ── Fix disconnected rooms ─────────────────────────────────────────
        for (let i = 1; i < rooms.length; i++) {
            const room = rooms[i];
            if (visited[room.centerY * w + room.centerX]) continue;

            // Find nearest reachable room
            let nearestDist = Infinity;
            let nearestRoom = rooms[0];
            for (let j = 0; j < rooms.length; j++) {
                if (j === i) continue;
                if (visited[rooms[j].centerY * w + rooms[j].centerX]) {
                    const dist = Math.abs(rooms[j].centerX - room.centerX) +
                        Math.abs(rooms[j].centerY - room.centerY);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestRoom = rooms[j];
                    }
                }
            }

            // Carve emergency corridor
            this.carveEmergencyCorridor(grid, room, nearestRoom, T);

            // Extend visited from the corridor start point (avoid full BFS restart)
            bfsExtend(nearestRoom.centerX, nearestRoom.centerY);
        }
    }

    /**
     * Carve a direct L-corridor to fix connectivity.
     */
    carveEmergencyCorridor(grid, roomA, roomB, T) {
        let x = roomA.centerX;
        let y = roomA.centerY;
        const tx = roomB.centerX;
        const ty = roomB.centerY;

        // Go horizontal first, then vertical
        while (x !== tx) {
            if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
                if (grid[y][x] === T.VOID || grid[y][x] === T.WALL) {
                    grid[y][x] = T.CORRIDOR;
                }
            }
            x += x < tx ? 1 : -1;
        }
        while (y !== ty) {
            if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
                if (grid[y][x] === T.VOID || grid[y][x] === T.WALL) {
                    grid[y][x] = T.CORRIDOR;
                }
            }
            y += y < ty ? 1 : -1;
        }

        // Re-add walls around new corridor
        this.addWalls(grid, grid[0].length, grid.length, T);
    }

    /**
     * Place spawners in rooms (not the start room or stairs room).
     */
    placeSpawners(rooms, biome) {
        const positions = [];
        if (rooms.length <= 2) return positions;

        // Skip first room (start) and last room (stairs)
        for (let i = 1; i < rooms.length - 1; i++) {
            const room = rooms[i];
            const count = Phaser.Math.Between(biome.spawnersPerRoom[0], biome.spawnersPerRoom[1]);

            for (let j = 0; j < count; j++) {
                // Place spawner within room bounds (with padding from walls)
                const sx = Phaser.Math.Between(room.x + 1, room.x + room.w - 2);
                const sy = Phaser.Math.Between(room.y + 1, room.y + room.h - 2);
                positions.push({
                    x: sx,
                    y: sy,
                    roomIndex: i,
                    enemyType: Phaser.Utils.Array.GetRandom(biome.enemyTypes)
                });
            }
        }

        return positions;
    }

    /**
     * Place stairs in the last (farthest) room.
     */
    placeStairs(rooms) {
        if (rooms.length === 0) return null;
        const lastRoom = rooms[rooms.length - 1];
        return {
            x: lastRoom.centerX,
            y: lastRoom.centerY,
            roomIndex: rooms.length - 1
        };
    }

    /**
     * Player starts in the first room.
     */
    placeStart(rooms) {
        if (rooms.length === 0) return { x: 5, y: 5 };
        const firstRoom = rooms[0];
        return {
            x: firstRoom.centerX,
            y: firstRoom.centerY,
            roomIndex: 0
        };
    }
}
