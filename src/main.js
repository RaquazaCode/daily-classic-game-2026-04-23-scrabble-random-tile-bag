import {
  advanceTime,
  createGame,
  getViewModel,
  handlePointer,
  renderGameToText,
  resetGame,
  togglePause
} from './game-core.js';

const state = createGame();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const rackHint = document.getElementById('rack-hint');
const eventList = document.getElementById('events');

let last = performance.now();
let accumulator = 0;
const FIXED_STEP = 50;

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function drawBackground(vm) {
  const gradient = ctx.createLinearGradient(0, 0, vm.width, vm.height);
  gradient.addColorStop(0, '#1b2333');
  gradient.addColorStop(1, '#0b111d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, vm.width, vm.height);

  ctx.fillStyle = '#121c2d';
  ctx.fillRect(24, 26, vm.width - 48, vm.height - 50);
}

function drawBoard(vm) {
  const { boardOrigin, cellSize, boardSize } = vm;

  ctx.fillStyle = '#0f1a2a';
  ctx.fillRect(boardOrigin.x - 2, boardOrigin.y - 2, cellSize * boardSize + 4, cellSize * boardSize + 4);

  for (const premium of vm.premiumCells) {
    const x = boardOrigin.x + premium.x * cellSize;
    const y = boardOrigin.y + premium.y * cellSize;
    ctx.fillStyle = premium.mult === 3 ? '#8d5f2d' : '#5a4a85';
    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
  }

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const px = boardOrigin.x + x * cellSize;
      const py = boardOrigin.y + y * cellSize;
      ctx.strokeStyle = '#334861';
      ctx.strokeRect(px, py, cellSize, cellSize);

      const cell = vm.board[y][x];
      if (!cell) continue;

      ctx.fillStyle = '#f2d8a7';
      ctx.fillRect(px + 6, py + 6, cellSize - 12, cellSize - 12);
      ctx.strokeStyle = '#b99763';
      ctx.strokeRect(px + 6, py + 6, cellSize - 12, cellSize - 12);

      ctx.fillStyle = '#272017';
      ctx.font = '700 28px "Trebuchet MS", sans-serif';
      ctx.fillText(cell.letter, px + 21, py + 41);
    }
  }

  ctx.fillStyle = '#98b8d9';
  ctx.font = '500 14px "Trebuchet MS", sans-serif';
  ctx.fillText('Premium cells: purple x2, bronze x3', boardOrigin.x, boardOrigin.y + boardSize * cellSize + 24);
}

function drawRack(vm) {
  const { rackOrigin, rackCellSize } = vm;

  ctx.fillStyle = '#0f1a2a';
  ctx.fillRect(rackOrigin.x - 2, rackOrigin.y - 2, 7 * (rackCellSize + 8) - 4, rackCellSize + 4);

  for (let i = 0; i < 7; i += 1) {
    const tile = vm.rack[i];
    const x = rackOrigin.x + i * (rackCellSize + 8);
    const y = rackOrigin.y;

    const isSelected = i === vm.selectedRackIndex;
    ctx.fillStyle = isSelected ? '#ffd36a' : '#ebd3a7';
    ctx.fillRect(x, y, rackCellSize, rackCellSize);
    ctx.strokeStyle = isSelected ? '#ff9d00' : '#b99763';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, rackCellSize, rackCellSize);

    if (!tile) continue;
    ctx.fillStyle = '#241f18';
    ctx.font = '700 30px "Trebuchet MS", sans-serif';
    ctx.fillText(tile.letter, x + 22, y + 40);
  }
}

function draw() {
  const vm = getViewModel(state);
  if (canvas.width !== vm.width) canvas.width = vm.width;
  if (canvas.height !== vm.height) canvas.height = vm.height;

  drawBackground(vm);

  ctx.fillStyle = '#d6e4f2';
  ctx.font = '700 30px "Trebuchet MS", sans-serif';
  ctx.fillText('Scrabble: Random Tile Bag', 44, 70);

  ctx.fillStyle = '#9cb8d4';
  ctx.font = '500 15px "Trebuchet MS", sans-serif';
  ctx.fillText('Select rack tile, then place on board. Keep all tiles connected.', 44, 98);

  drawBoard(vm);
  drawRack(vm);

  const phaseLabel = vm.phase === 'running' ? 'Running' : 'Finished';
  status.textContent = `Score ${vm.score} | Best ${vm.bestPlacement} | Placed ${vm.placements} | Bag ${vm.bagRemaining} | Time ${formatTime(vm.remainingMs)} | ${phaseLabel}${vm.paused ? ' (paused)' : ''}`;
  rackHint.textContent =
    vm.selectedRackIndex == null
      ? 'Selected tile: none'
      : `Selected tile: slot ${vm.selectedRackIndex + 1} (${vm.rack[vm.selectedRackIndex]?.letter ?? 'empty'})`;

  eventList.innerHTML = vm.events.map((event) => `<li>${event}</li>`).join('');
}

function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  accumulator += dt;

  while (accumulator >= FIXED_STEP) {
    advanceTime(state, FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  handlePointer(state, x, y);
  draw();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyP') {
    togglePause(state);
    draw();
    return;
  }

  if (event.code === 'KeyR') {
    resetGame(state);
    draw();
    return;
  }

  if (event.code === 'KeyN' && state.phase !== 'running') {
    resetGame(state);
    draw();
  }
});

window.advanceTime = (ms) => {
  advanceTime(state, ms);
  draw();
};

window.render_game_to_text = () => renderGameToText(state);

requestAnimationFrame(frame);
