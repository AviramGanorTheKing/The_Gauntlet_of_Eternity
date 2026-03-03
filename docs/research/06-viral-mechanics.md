# Viral Mechanics Analysis (Round 1)

## Research Date: March 2, 2026

---

## Key Findings

### The Browser Advantage
Browser-based delivery is the single biggest viral advantage. Zero-friction sharing: link → playing in seconds. Most indie games lose 90% of interested viewers at the "go to Steam, buy, download, install" funnel. Browser games lose almost none.

### Five Recommended Features (Ranked by Impact-to-Effort)

#### 1. Sharable Run Replay Links (VERY HIGH IMPACT, MEDIUM EFFORT)
Generate unique URL encoding run seed + class + choices. Anyone clicks to watch replay or attempt same run. Every shared link = new player acquisition.

**Implementation:** Encode dungeon seed, class, companion, RNG state into URL parameter. On load: "Watch this run" or "Try this seed."

#### 2. Announcer + Twitch Chat Shrine Voting (HIGH IMPACT, LOW EFFORT)
Twitch chat votes on shrine/moral choices. Announcer reads result. Every shrine = clippable tension moment.

**Implementation:** Optional Twitch IRC/WebSocket integration. 30-second voting at shrines. Toggle in settings.

#### 3. CRT Corruption Death Screen (HIGH IMPACT, LOW EFFORT)
Death triggers progressive CRT glitch — scanline tearing, chromatic aberration explosion, screen melt, static bursts. Different per death cause (poison = green static, fire = scanlines burn out, boss = TV shutdown).

**Implementation:** 5-6 death shader variations. 2-3 second tween of existing CRT uniforms + 1-2 additional distortion passes.

#### 4. Ghost Runs — See How Others Died (MEDIUM IMPACT, MEDIUM EFFORT)
Translucent ghosts of other players' final moments at floor start. Creates indirect difficulty signal and emergent social connection.

**Implementation:** On death, serialize compact record (floor, position, cause, class). Simple backend (Firebase free tier). Fetch 5-10 recent deaths per floor on load.

#### 5. Daily Gauntlet Challenge (MEDIUM IMPACT, LOW EFFORT)
Fixed-seed daily run with unique modifier ("No potions, double gold"). Global leaderboard.

**Implementation:** UTC date as seed. Pool of 30-40 modifiers. Hash date to select modifier. Local leaderboard (zero backend) or minimal API for global.

---

## Sources
- How Balatro hit 1 million sales (newsletter.gamediscover.co)
- 2025 Indie Game Trends (accio.com)
- How itch.io game became million-dollar hit: The Roottrees are Dead (howtomarketagame.com)
- Twitch Chat Integrated Video Games (boardgamefightclub.com)
- Noita Daily Run (noita.fandom.com)
