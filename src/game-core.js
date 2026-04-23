const BOARD_SIZE = 7;
const CELL_SIZE = 68;
const BOARD_ORIGIN = { x: 44, y: 132 };
const RACK_ORIGIN = { x: 44, y: 640 };
const RACK_CELL_SIZE = 64;
const GAME_DURATION_MS = 180000;
const STEP_MS = 50;
const TURN_TIME_BONUS_MS = 500;
const ADJACENT_DIRS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 }
];

const PREMIUM_CELLS = new Map([
  ['0,0', 2],
  ['0,6', 2],
  ['3,3', 3],
  ['6,0', 2],
  ['6,6', 2],
  ['1,5', 2],
  ['5,1', 2]
]);

const LETTER_POINTS = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10
};

const TILE_DISTRIBUTION = [
  ['A', 9], ['B', 2], ['C', 2], ['D', 4], ['E', 12], ['F', 2], ['G', 3], ['H', 2],
  ['I', 9], ['J', 1], ['K', 1], ['L', 4], ['M', 2], ['N', 6], ['O', 8], ['P', 2],
  ['Q', 1], ['R', 6], ['S', 4], ['T', 6], ['U', 4], ['V', 2], ['W', 2], ['X', 1],
  ['Y', 2], ['Z', 1]
];

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function key(x, y) {
  return `${x},${y}`;
}

function insideBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function createTileBag(random) {
  const bag = [];
  for (const [letter, count] of TILE_DISTRIBUTION) {
    for (let i = 0; i < count; i += 1) bag.push(letter);
  }

  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = bag[i];
    bag[i] = bag[j];
    bag[j] = swap;
  }

  return bag;
}

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function drawTiles(state, amount) {
  while (state.rack.length < amount && state.bag.length > 0) {
    const letter = state.bag.shift();
    state.rack.push({ id: state.tileIdCounter++, letter });
  }
}

function rackIndexFromPointer(x, y) {
  const relX = x - RACK_ORIGIN.x;
  const relY = y - RACK_ORIGIN.y;
  if (relX < 0 || relY < 0) return null;
  if (relY >= RACK_CELL_SIZE) return null;
  const slot = Math.floor(relX / (RACK_CELL_SIZE + 8));
  if (slot < 0 || slot >= 7) return null;
  return slot;
}

function boardCoordFromPointer(x, y) {
  const relX = x - BOARD_ORIGIN.x;
  const relY = y - BOARD_ORIGIN.y;
  if (relX < 0 || relY < 0) return null;
  const gx = Math.floor(relX / CELL_SIZE);
  const gy = Math.floor(relY / CELL_SIZE);
  if (!insideBoard(gx, gy)) return null;
  return { x: gx, y: gy };
}

function hasAdjacentTile(board, x, y) {
  for (const dir of ADJACENT_DIRS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!insideBoard(nx, ny)) continue;
    if (board[ny][nx]) return true;
  }
  return false;
}

function computeLineRun(board, x, y, axis) {
  let length = 1;

  if (axis === 'horizontal') {
    for (let nx = x - 1; nx >= 0; nx -= 1) {
      if (!board[y][nx]) break;
      length += 1;
    }
    for (let nx = x + 1; nx < BOARD_SIZE; nx += 1) {
      if (!board[y][nx]) break;
      length += 1;
    }
    return length;
  }

  for (let ny = y - 1; ny >= 0; ny -= 1) {
    if (!board[ny][x]) break;
    length += 1;
  }
  for (let ny = y + 1; ny < BOARD_SIZE; ny += 1) {
    if (!board[ny][x]) break;
    length += 1;
  }

  return length;
}

function computePlacementScore(board, x, y, letter) {
  const base = LETTER_POINTS[letter] ?? 1;
  const premium = PREMIUM_CELLS.get(key(x, y)) ?? 1;
  let score = base * premium;

  const horizontalRun = computeLineRun(board, x, y, 'horizontal');
  const verticalRun = computeLineRun(board, x, y, 'vertical');
  if (horizontalRun >= 3 || verticalRun >= 3) {
    score += 8;
  }

  if (horizontalRun >= 5 || verticalRun >= 5) {
    score += 20;
  }

  return { score, horizontalRun, verticalRun, base, premium };
}

function countPlacedTiles(board) {
  let total = 0;
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (board[y][x]) total += 1;
    }
  }
  return total;
}

function makeState(seed = 20260423) {
  const random = lcg(seed);
  const bag = createTileBag(random);

  const state = {
    seed,
    random,
    board: createBoard(),
    bag,
    rack: [],
    selectedRackIndex: null,
    score: 0,
    placements: 0,
    collisions: 0,
    invalidMoves: 0,
    bestPlacement: 0,
    tick: 0,
    elapsedMs: 0,
    remainingMs: GAME_DURATION_MS,
    paused: false,
    phase: 'running',
    events: ['Select a tile from your rack, then click any board cell.'],
    tileIdCounter: 1,
    twistLabel: 'random tile bag'
  };

  drawTiles(state, 7);
  return state;
}

export function createGame(seed) {
  return makeState(seed);
}

export function resetGame(state, seed = state.seed) {
  const fresh = makeState(seed);
  Object.assign(state, fresh);
}

export function togglePause(state) {
  if (state.phase !== 'running') return;
  state.paused = !state.paused;
}

function endIfNeeded(state) {
  if (state.phase !== 'running') return;

  if (state.remainingMs <= 0) {
    state.phase = 'finished';
    state.paused = true;
    state.events.unshift('Timer expired. Press N for a new run.');
    state.events = state.events.slice(0, 8);
    return;
  }

  if (state.rack.length === 0 && state.bag.length === 0) {
    state.phase = 'finished';
    state.paused = true;
    state.events.unshift('Tile bag exhausted. Press N for a new run.');
    state.events = state.events.slice(0, 8);
  }
}

export function placeSelectedTile(state, x, y) {
  if (state.phase !== 'running' || state.paused) {
    return { ok: false, reason: 'not_running' };
  }

  if (!insideBoard(x, y)) {
    return { ok: false, reason: 'out_of_bounds' };
  }

  if (state.selectedRackIndex == null || state.selectedRackIndex >= state.rack.length) {
    return { ok: false, reason: 'no_tile_selected' };
  }

  if (state.board[y][x]) {
    state.collisions += 1;
    state.score = Math.max(0, state.score - 5);
    state.events.unshift(`Collision at ${x},${y}. Cell already occupied.`);
    state.events = state.events.slice(0, 8);
    return { ok: false, reason: 'collision' };
  }

  const placedCount = countPlacedTiles(state.board);
  if (placedCount > 0 && !hasAdjacentTile(state.board, x, y)) {
    state.invalidMoves += 1;
    state.score = Math.max(0, state.score - 3);
    state.events.unshift(`Invalid placement at ${x},${y}. Must connect to existing tiles.`);
    state.events = state.events.slice(0, 8);
    return { ok: false, reason: 'not_adjacent' };
  }

  const tile = state.rack[state.selectedRackIndex];
  state.board[y][x] = { letter: tile.letter, turn: state.placements + 1 };
  const scoreInfo = computePlacementScore(state.board, x, y, tile.letter);

  state.score += scoreInfo.score;
  state.bestPlacement = Math.max(state.bestPlacement, scoreInfo.score);
  state.placements += 1;

  state.rack.splice(state.selectedRackIndex, 1);
  state.selectedRackIndex = null;
  drawTiles(state, 7);

  state.remainingMs = Math.max(0, state.remainingMs + TURN_TIME_BONUS_MS);
  state.events.unshift(
    `Placed ${tile.letter} at ${x},${y} for +${scoreInfo.score} (run ${Math.max(scoreInfo.horizontalRun, scoreInfo.verticalRun)}).`
  );
  state.events = state.events.slice(0, 8);

  endIfNeeded(state);
  return { ok: true, score: scoreInfo.score, letter: tile.letter };
}

export function selectRackTile(state, rackIndex) {
  if (state.phase !== 'running') return { ok: false, reason: 'not_running' };
  if (rackIndex < 0 || rackIndex >= state.rack.length) return { ok: false, reason: 'out_of_bounds' };
  state.selectedRackIndex = rackIndex;
  return { ok: true, letter: state.rack[rackIndex].letter };
}

export function handlePointer(state, x, y) {
  const rackIndex = rackIndexFromPointer(x, y);
  if (rackIndex != null) {
    return selectRackTile(state, rackIndex);
  }

  const boardCoord = boardCoordFromPointer(x, y);
  if (!boardCoord) return { ok: false, reason: 'outside' };
  return placeSelectedTile(state, boardCoord.x, boardCoord.y);
}

export function advanceTime(state, ms) {
  if (state.phase !== 'running' || state.paused) return;

  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    const delta = Math.min(STEP_MS, remaining);
    remaining -= delta;
    state.tick += 1;
    state.elapsedMs += delta;
    state.remainingMs = Math.max(0, state.remainingMs - delta);
  }

  endIfNeeded(state);
}

function boardToLines(board) {
  return board.map((row) => row.map((cell) => (cell ? cell.letter : '.')).join('')).join('\n');
}

export function renderGameToText(state) {
  const rackLetters = state.rack.map((tile) => tile.letter).join('');
  const selected =
    state.selectedRackIndex == null || state.selectedRackIndex >= state.rack.length
      ? 'none'
      : state.rack[state.selectedRackIndex].letter;

  return [
    `phase=${state.phase}`,
    `paused=${state.paused}`,
    `score=${state.score}`,
    `placements=${state.placements}`,
    `collisions=${state.collisions}`,
    `invalid_moves=${state.invalidMoves}`,
    `best_placement=${state.bestPlacement}`,
    `remaining_ms=${state.remainingMs}`,
    `bag_remaining=${state.bag.length}`,
    `selected=${selected}`,
    `rack=${rackLetters}`,
    'board:',
    boardToLines(state.board),
    `events=${state.events.join(' | ')}`
  ].join('\n');
}

export function getViewModel(state) {
  const premiumCells = [];
  for (const [coordKey, mult] of PREMIUM_CELLS.entries()) {
    const [x, y] = coordKey.split(',').map(Number);
    premiumCells.push({ x, y, mult });
  }

  return {
    width: 620,
    height: 760,
    boardSize: BOARD_SIZE,
    cellSize: CELL_SIZE,
    boardOrigin: { ...BOARD_ORIGIN },
    rackOrigin: { ...RACK_ORIGIN },
    rackCellSize: RACK_CELL_SIZE,
    board: cloneBoard(state.board),
    rack: state.rack.map((tile) => ({ ...tile })),
    selectedRackIndex: state.selectedRackIndex,
    score: state.score,
    placements: state.placements,
    collisions: state.collisions,
    invalidMoves: state.invalidMoves,
    bestPlacement: state.bestPlacement,
    remainingMs: state.remainingMs,
    elapsedMs: state.elapsedMs,
    bagRemaining: state.bag.length,
    phase: state.phase,
    paused: state.paused,
    events: [...state.events],
    premiumCells,
    twistLabel: state.twistLabel
  };
}
