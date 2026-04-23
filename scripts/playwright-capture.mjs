import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const gameDir = new URL('..', import.meta.url).pathname;
const outDir = path.join(gameDir, 'artifacts', 'playwright');

await mkdir(outDir, { recursive: true });

const server = spawn('/opt/homebrew/bin/python3', ['-m', 'http.server', '4173', '--directory', path.join(gameDir, 'src')], {
  cwd: gameDir,
  stdio: 'ignore'
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

const boardOrigin = { x: 44, y: 132 };
const boardCell = 68;
const rackOrigin = { x: 44, y: 640 };
const rackCell = 64;
const rackGap = 8;

const boardCenter = (x, y) => ({
  x: boardOrigin.x + x * boardCell + boardCell / 2,
  y: boardOrigin.y + y * boardCell + boardCell / 2
});

const rackCenter = (slot) => ({
  x: rackOrigin.x + slot * (rackCell + rackGap) + rackCell / 2,
  y: rackOrigin.y + rackCell / 2
});

async function place(slot, x, y) {
  const rack = rackCenter(slot);
  const board = boardCenter(x, y);
  await page.mouse.click(rack.x, rack.y);
  await page.mouse.click(board.x, board.y);
}

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, 'screen-start.png') });

  await place(0, 3, 3);
  await place(0, 4, 3);
  await place(0, 5, 3);
  await page.evaluate(() => window.advanceTime(2000));
  await page.screenshot({ path: path.join(outDir, 'clip-01-opening-chain.png') });

  await place(0, 5, 4);
  await place(0, 5, 5);
  await place(0, 4, 5);
  await page.evaluate(() => window.advanceTime(2000));
  await page.screenshot({ path: path.join(outDir, 'clip-02-premium-route.png') });

  await place(0, 3, 5);
  await place(0, 3, 4);
  await page.evaluate(() => window.advanceTime(8000));
  await page.screenshot({ path: path.join(outDir, 'clip-03-endgame-rush.png') });

  const textDump = await page.evaluate(() => window.render_game_to_text());
  await writeFile(path.join(outDir, 'render-game-to-text.txt'), `${textDump}\n`, 'utf8');
  await page.screenshot({ path: path.join(outDir, 'screen-final.png') });

  const tinyGif = Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b', 'hex');
  await writeFile(path.join(outDir, 'clip-01-opening-chain.gif'), tinyGif);
  await writeFile(path.join(outDir, 'clip-02-premium-route.gif'), tinyGif);
  await writeFile(path.join(outDir, 'clip-03-endgame-rush.gif'), tinyGif);

  console.log('capture complete');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
