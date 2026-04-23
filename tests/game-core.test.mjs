import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTime,
  createGame,
  handlePointer,
  placeSelectedTile,
  renderGameToText,
  resetGame,
  selectRackTile,
  togglePause
} from '../src/game-core.js';

const BOARD_ORIGIN_X = 44;
const BOARD_ORIGIN_Y = 132;
const BOARD_CELL_SIZE = 68;
const RACK_ORIGIN_X = 44;
const RACK_ORIGIN_Y = 640;
const RACK_CELL_SIZE = 64;
const RACK_GAP = 8;

function clickRack(state, slot) {
  const x = RACK_ORIGIN_X + slot * (RACK_CELL_SIZE + RACK_GAP) + RACK_CELL_SIZE / 2;
  const y = RACK_ORIGIN_Y + RACK_CELL_SIZE / 2;
  return handlePointer(state, x, y);
}

function clickBoard(state, x, y) {
  const px = BOARD_ORIGIN_X + x * BOARD_CELL_SIZE + BOARD_CELL_SIZE / 2;
  const py = BOARD_ORIGIN_Y + y * BOARD_CELL_SIZE + BOARD_CELL_SIZE / 2;
  return handlePointer(state, px, py);
}

test('deterministic timeline yields identical text dump', () => {
  const a = createGame(5001);
  const b = createGame(5001);

  clickRack(a, 0);
  clickBoard(a, 3, 3);
  advanceTime(a, 1200);
  clickRack(a, 0);
  clickBoard(a, 4, 3);
  advanceTime(a, 800);

  clickRack(b, 0);
  clickBoard(b, 3, 3);
  advanceTime(b, 600);
  advanceTime(b, 600);
  clickRack(b, 0);
  clickBoard(b, 4, 3);
  advanceTime(b, 800);

  assert.equal(renderGameToText(a), renderGameToText(b));
});

test('collision penalizes and does not overwrite tile', () => {
  const state = createGame();
  clickRack(state, 0);
  const first = clickBoard(state, 3, 3);
  assert.equal(first.ok, true);

  clickRack(state, 0);
  const second = clickBoard(state, 3, 3);
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'collision');
  assert.equal(state.collisions, 1);
});

test('adjacency rule blocks disconnected placements', () => {
  const state = createGame();
  selectRackTile(state, 0);
  placeSelectedTile(state, 2, 2);

  selectRackTile(state, 0);
  const result = placeSelectedTile(state, 6, 6);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_adjacent');
  assert.equal(state.invalidMoves, 1);
});

test('pause blocks clock progression', () => {
  const state = createGame();
  togglePause(state);
  const before = state.remainingMs;
  advanceTime(state, 3000);
  assert.equal(state.remainingMs, before);
});

test('reset restores baseline state', () => {
  const state = createGame();
  selectRackTile(state, 0);
  placeSelectedTile(state, 3, 3);
  advanceTime(state, 7000);
  resetGame(state);

  assert.equal(state.score, 0);
  assert.equal(state.placements, 0);
  assert.equal(state.collisions, 0);
  assert.equal(state.phase, 'running');
  assert.equal(state.rack.length, 7);
});
