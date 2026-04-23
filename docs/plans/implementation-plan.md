# Implementation Plan - Scrabble Random Tile Bag (2026-04-23)

## Goal
Ship a deterministic, unattended-safe Scrabble-inspired web MVP with the `random tile bag` twist and required browser hooks.

## Scope
- Deterministic seeded tile bag and fixed-step clock loop.
- Pointer-driven input (select rack tile, place on board).
- Core rules: occupancy collision, adjacency constraint, premium multipliers, combo runs.
- Score/time system, pause/restart/reset controls.
- Verification via automated tests, self-check, build, and Playwright artifact capture.

## Architecture
1. `src/game-core.js`
- State container and seeded RNG.
- Tile bag generation/shuffle and rack refill.
- Placement validation and scoring.
- Deterministic time progression and text snapshot rendering.

2. `src/main.js`
- Canvas rendering and HUD.
- Pointer and keyboard event handling.
- Expose hooks: `window.advanceTime(ms)` and `window.render_game_to_text()`.

3. Verification scripts
- `tests/game-core.test.mjs`: deterministic behavior + rule assertions.
- `scripts/self-check.mjs`: smoke check for runtime snapshot output.
- `scripts/playwright-capture.mjs`: scripted interaction + captures.

## Twist Design
- Use a seeded random tile bag that reshuffles once per run in a deterministic way.
- Rack refills from the shuffled bag; bag order is fixed for a given seed and action timeline.

## Risks and Mitigations
- Pointer-only controls can be flaky in automation: mitigate with deterministic `window.advanceTime` and scripted click coordinates.
- Scoring drift across runs: mitigate with fixed-step time and deterministic draw order.

## Acceptance Criteria
- Game boots with deterministic behavior.
- Rules and scoring are enforced in tests.
- Hooks are available from browser console.
- `pnpm test`, `pnpm build`, `pnpm capture` pass and emit artifacts.
