/**
 * SaveManager — localStorage persistence with 3 profiles.
 * Key format: "gauntlet_profile_[1|2|3]"
 * Auto-save triggers: floor transition, boss defeat, shop exit.
 * Base64 encode + simple checksum for light tamper detection.
 */

const STORAGE_PREFIX = 'gauntlet_profile_';
const MAX_PROFILES = 3;

export class SaveManager {
    constructor() {
        this.activeProfile = null; // 1, 2, or 3
    }

    // ── Profile Management ────────────────────────────────────────────────

    /**
     * Get summary of all 3 profiles (for profile selection screen).
     * @returns {Array<{slot, exists, summary}>}
     */
    getAllProfiles() {
        const profiles = [];
        for (let i = 1; i <= MAX_PROFILES; i++) {
            const data = this._loadRaw(i);
            if (data) {
                profiles.push({
                    slot: i,
                    exists: true,
                    modified: data.modified || false,
                    summary: {
                        profileName: data.permanent?.profileName || null,
                        className: data.permanent?.lastClassName || 'Unknown',
                        classKey: data.permanent?.lastClassKey || 'warrior',
                        totalShards: data.permanent?.soulShards || 0,
                        bestFloor: data.permanent?.bestFloor || 0,
                        totalRuns: data.permanent?.totalRuns || 0,
                        totalPlaytime: data.permanent?.totalPlaytime || 0,
                        unlockedClasses: data.permanent?.unlockedClasses || ['warrior', 'wizard', 'archer'],
                        hasActiveRun: !!data.run,
                        activeRunFloor: data.run?.floor || 0,
                        activeRunClass: data.run?.classKey || null,
                        endingsSeen: data.permanent?.endingsSeen || [],
                    },
                });
            } else {
                profiles.push({ slot: i, exists: false, summary: null });
            }
        }
        return profiles;
    }

    /**
     * Select a profile as active.
     */
    selectProfile(slot) {
        if (slot < 1 || slot > MAX_PROFILES) return false;
        this.activeProfile = slot;
        return true;
    }

    /**
     * Create a new profile (or reset an existing slot).
     */
    createProfile(slot) {
        const data = this._createEmptyProfile();
        this._saveRaw(slot, data);
        this.activeProfile = slot;
        return data;
    }

    /**
     * Delete a profile.
     */
    deleteProfile(slot) {
        try {
            localStorage.removeItem(STORAGE_PREFIX + slot);
        } catch (e) {
            console.warn('SaveManager: failed to delete profile', e);
        }
        if (this.activeProfile === slot) {
            this.activeProfile = null;
        }
    }

    // ── Permanent Data ────────────────────────────────────────────────────

    /**
     * Get permanent (meta-progression) data for active profile.
     */
    getPermanent() {
        const data = this._loadRaw(this.activeProfile);
        return data?.permanent || this._createEmptyProfile().permanent;
    }

    /**
     * Update permanent data fields (merges).
     */
    updatePermanent(updates) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        Object.assign(data.permanent, updates);
        data.permanent.lastSaved = Date.now();
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Add soul shards to permanent pool.
     */
    addSoulShards(amount) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        data.permanent.soulShards = (data.permanent.soulShards || 0) + amount;
        data.permanent.totalShardsEarned = (data.permanent.totalShardsEarned || 0) + amount;
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Spend soul shards. Returns true if successful.
     */
    spendSoulShards(amount) {
        const data = this._loadRaw(this.activeProfile);
        if (!data || (data.permanent.soulShards || 0) < amount) return false;
        data.permanent.soulShards -= amount;
        this._saveRaw(this.activeProfile, data);
        return true;
    }

    /**
     * Unlock a perk by ID for a class.
     */
    unlockPerk(classKey, perkId) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.unlockedPerks[classKey]) {
            data.permanent.unlockedPerks[classKey] = [];
        }
        if (!data.permanent.unlockedPerks[classKey].includes(perkId)) {
            data.permanent.unlockedPerks[classKey].push(perkId);
        }
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Get unlocked perks for a class.
     */
    getUnlockedPerks(classKey) {
        const data = this._loadRaw(this.activeProfile);
        return data?.permanent?.unlockedPerks?.[classKey] || [];
    }

    /**
     * Respec a class — clear all perks, increment respec count.
     */
    respecClass(classKey) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return 0;

        const perks = data.permanent.unlockedPerks[classKey] || [];
        data.permanent.unlockedPerks[classKey] = [];
        data.permanent.respecCount = (data.permanent.respecCount || 0) + 1;
        this._saveRaw(this.activeProfile, data);
        return perks.length; // number of perks refunded
    }

    /**
     * Unlock a class.
     */
    unlockClass(classKey) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.unlockedClasses.includes(classKey)) {
            data.permanent.unlockedClasses.push(classKey);
        }
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Check if a class is unlocked.
     */
    isClassUnlocked(classKey) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return ['warrior', 'wizard', 'archer'].includes(classKey);
        return (data.permanent.unlockedClasses || []).includes(classKey);
    }

    /**
     * Record an achievement.
     */
    addAchievement(achievementId) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.achievements) data.permanent.achievements = [];
        if (!data.permanent.achievements.includes(achievementId)) {
            data.permanent.achievements.push(achievementId);
        }
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Record a cosmetic unlock.
     */
    unlockCosmetic(cosmeticId) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.cosmetics) data.permanent.cosmetics = [];
        if (!data.permanent.cosmetics.includes(cosmeticId)) {
            data.permanent.cosmetics.push(cosmeticId);
        }
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Record a lore entry as discovered.
     */
    discoverLore(loreId) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.discoveredLore) data.permanent.discoveredLore = [];
        if (!data.permanent.discoveredLore.includes(loreId)) {
            data.permanent.discoveredLore.push(loreId);
        }
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Record an ending as seen.
     */
    recordEnding(endingKey) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        if (!data.permanent.endingsSeen) data.permanent.endingsSeen = [];
        if (!data.permanent.endingsSeen.includes(endingKey)) {
            data.permanent.endingsSeen.push(endingKey);
        }
        this._saveRaw(this.activeProfile, data);
    }

    // ── Run Data (temporary, lost on death) ────────────────────────────────

    /**
     * Start a new run — stores temporary data.
     */
    startRun(classKey, companions) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;
        data.run = {
            classKey,
            companions: companions || [],
            floor: 1,
            hp: null, // filled on first save
            mana: null,
            gold: 0,
            gear: { armor: null, accessory: null },
            weapons: [null, null],
            hpPotions: 6,
            mpPotions: 4,
            companionStates: [],
            moralChoices: {},
            killCount: 0,
            damageDealt: 0,
            roomsCleared: 0,
            secretsFound: 0,
            shrinesUsed: 0,
            startTime: Date.now(),
        };
        data.permanent.totalRuns = (data.permanent.totalRuns || 0) + 1;
        data.permanent.lastClassKey = classKey;
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Save current run state (auto-save on floor transition, boss defeat, etc.).
     */
    saveRun(runState) {
        const data = this._loadRaw(this.activeProfile);
        if (!data || !data.run) return;
        Object.assign(data.run, runState);
        data.run.lastSaved = Date.now();
        this._saveRaw(this.activeProfile, data);
    }

    /**
     * Get active run data (null if no run in progress).
     */
    getActiveRun() {
        const data = this._loadRaw(this.activeProfile);
        return data?.run || null;
    }

    /**
     * Check if there's an active run to resume.
     */
    hasActiveRun() {
        return !!this.getActiveRun();
    }

    /**
     * End run (death or victory) — clears run data, updates permanent stats.
     */
    endRun(finalStats) {
        const data = this._loadRaw(this.activeProfile);
        if (!data) return;

        // Update best stats
        const floor = finalStats?.floor || data.run?.floor || 1;
        if (floor > (data.permanent.bestFloor || 0)) {
            data.permanent.bestFloor = floor;
        }

        // Track playtime
        if (data.run?.startTime) {
            const elapsed = Date.now() - data.run.startTime;
            data.permanent.totalPlaytime = (data.permanent.totalPlaytime || 0) + elapsed;
        }

        // Update last class name
        if (data.run?.classKey) {
            const classNames = { warrior: 'Warrior', wizard: 'Wizard', archer: 'Archer', valkyrie: 'Valkyrie', necromancer: 'Necromancer' };
            data.permanent.lastClassName = classNames[data.run.classKey] || data.run.classKey;
            data.permanent.lastClassKey = data.run.classKey;
        }

        // Clear run
        data.run = null;
        this._saveRaw(this.activeProfile, data);
    }

    // ── Internal ──────────────────────────────────────────────────────────

    _createEmptyProfile() {
        return {
            version: 1,
            permanent: {
                profileName: null,
                soulShards: 0,
                totalShardsEarned: 0,
                unlockedClasses: ['warrior', 'wizard', 'archer'],
                unlockedPerks: {},
                respecCount: 0,
                bestFloor: 0,
                totalRuns: 0,
                totalPlaytime: 0,
                lastClassName: null,
                lastClassKey: null,
                achievements: [],
                cosmetics: [],
                discoveredLore: [],
                endingsSeen: [],
                lastSaved: Date.now(),
            },
            run: null,
            modified: false,
        };
    }

    /**
     * Compute a simple checksum for tamper detection.
     */
    _checksum(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // 32-bit int
        }
        return hash.toString(36);
    }

    /**
     * Load raw profile data from localStorage.
     */
    _loadRaw(slot) {
        if (!slot) return null;
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + slot);
            if (!raw) return null;

            // Format: "checksum|base64data"
            const sepIdx = raw.indexOf('|');
            if (sepIdx === -1) return null;

            const storedChecksum = raw.substring(0, sepIdx);
            const encoded = raw.substring(sepIdx + 1);
            const json = atob(encoded);
            const computedChecksum = this._checksum(json);

            const data = JSON.parse(json);

            // Mark as modified if checksums don't match
            if (storedChecksum !== computedChecksum) {
                data.modified = true;
            }

            return data;
        } catch (e) {
            console.warn(`SaveManager: failed to load profile ${slot}`, e);
            return null;
        }
    }

    /**
     * Save raw profile data to localStorage.
     */
    _saveRaw(slot, data) {
        if (!slot) return;
        try {
            const json = JSON.stringify(data);
            const encoded = btoa(json);
            const checksum = this._checksum(json);
            localStorage.setItem(STORAGE_PREFIX + slot, checksum + '|' + encoded);
        } catch (e) {
            console.warn(`SaveManager: failed to save profile ${slot}`, e);
        }
    }
}

/** Singleton instance */
export const saveManager = new SaveManager();
