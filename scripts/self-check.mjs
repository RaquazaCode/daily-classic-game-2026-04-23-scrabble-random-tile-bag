import {
  createGame,
  placeSelectedTile,
  renderGameToText,
  selectRackTile,
  advanceTime
} from '../src/game-core.js';

const state = createGame();

selectRackTile(state, 0);
placeSelectedTile(state, 3, 3);
selectRackTile(state, 0);
placeSelectedTile(state, 4, 3);
advanceTime(state, 1500);

const snapshot = renderGameToText(state);

if (!snapshot.includes('score=')) {
  throw new Error('self-check failed: score line missing');
}
if (!snapshot.includes('rack=')) {
  throw new Error('self-check failed: rack line missing');
}
if (!snapshot.includes('board:')) {
  throw new Error('self-check failed: board dump missing');
}

console.log('self-check complete');
