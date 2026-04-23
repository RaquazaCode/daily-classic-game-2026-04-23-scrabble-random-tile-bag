# Design - Scrabble Random Tile Bag

## Core Idea
A fast, deterministic Scrabble-inspired solo score attack. Players draw from a seeded random tile bag, place letters on a compact board, and chase chain bonuses before the timer expires.

## Twist
`random tile bag`: each run shuffles the full tile distribution once using a fixed seed and deterministic PRNG. Rack refill order is stable under the same action timeline.

## MVP Loop
1. Select one tile from rack.
2. Place on the board (must be empty and connected to existing tiles after first move).
3. Score base letter points, premium-cell multipliers, and run bonuses.
4. Rack auto-refills from the bag.
5. Continue until timer expires or bag + rack are empty.

## Controls
- Mouse click rack tile, then board cell.
- `P` pause/resume.
- `R` reset current run.
- `N` start a new run when finished.

## Determinism and Hooks
- Fixed-step simulation (`50ms`) for stable replay.
- `window.advanceTime(ms)` for scripted progression.
- `window.render_game_to_text()` for state snapshots used by tests/capture automation.
