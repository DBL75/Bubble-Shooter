const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 1000;
const HEIGHT = 860;
const FPS = 60;

const COLORS = {
  WHITE: "#f5f5f5",
  BLACK: "#191919",
  DARK: "#12141e",
  PANEL: "#1e2230",
  GRID: "#373c50",
  RED: "#ff5f5f",
  BLUE: "#46aaff",
  GREEN: "#5aeb96",
  YELLOW: "#ffdc46",
  PURPLE: "#c378ff",
  CYAN: "#78ebff",
  ORANGE: "#ffa546",
  GRAY: "#bec3d2",
  BOMB: "#f7f1d2",
  BOMB_CORE: "#ff6f3c"
};

const BUBBLE_COLORS = [
  COLORS.RED,
  COLORS.BLUE,
  COLORS.GREEN,
  COLORS.YELLOW,
  COLORS.PURPLE,
  COLORS.ORANGE
];

const keys = new Set();

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  game.handleKeyDown(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function drawText(text, x, y, size = 22, color = COLORS.WHITE, align = "left", weight = "500") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawRoundedRect(x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

class GameObject {
  constructor() {
    this.alive = true;
  }

  destroy() {
    this.alive = false;
  }

  update(_game) {}
  draw(_ctx) {}
}

class Bubble extends GameObject {
  constructor(x, y, color, radius, isBomb = false) {
    super();
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = radius;
    this.isBomb = isBomb;
  }

  drawBody() {
    if (this.isBomb) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.WHITE;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.BOMB_CORE;
      ctx.fill();

      ctx.strokeStyle = COLORS.YELLOW;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = COLORS.WHITE;
      ctx.font = "bold 22px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("B", this.x, this.y + 1);
      return;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.WHITE;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.34, this.y - this.radius * 0.34, Math.max(4, this.radius / 4), 0, Math.PI * 2);
    ctx.fillStyle = COLORS.WHITE;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class FixedBubble extends Bubble {
  constructor(x, y, color, radius, row, col, isBomb = false) {
    super(x, y, color, radius, isBomb);
    this.row = row;
    this.col = col;
  }

  setGridPosition(row, col, x, y) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
  }

  draw() {
    this.drawBody();
  }
}

class MovingBubble extends Bubble {
  constructor(x, y, color, radius, angle, isBomb = false) {
    super(x, y, color, radius, isBomb);
    this.speed = 9.0;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(game) {
    this.x += this.vx;
    this.y += this.vy;

    const leftWall = game.board.left + this.radius;
    const rightWall = game.board.right - this.radius;

    if (this.x <= leftWall) {
      this.x = leftWall;
      this.vx *= -1;
    } else if (this.x >= rightWall) {
      this.x = rightWall;
      this.vx *= -1;
    }
  }

  draw() {
    this.drawBody();
  }
}

class Shooter extends GameObject {
  constructor(x, y, radius, colors) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.minAngle = 205 * Math.PI / 180;
    this.maxAngle = 335 * Math.PI / 180;
    this.angle = 270 * Math.PI / 180;
    this.turnSpeed = 2.2 * Math.PI / 180;
    this.colors = colors.slice();
    this.currentColor = randChoice(this.colors);
    this.nextColor = randChoice(this.colors);
  }

  rotateLeft() {
    this.angle = Math.max(this.minAngle, this.angle - this.turnSpeed);
  }

  rotateRight() {
    this.angle = Math.min(this.maxAngle, this.angle + this.turnSpeed);
  }

  shoot(isBombShot = false) {
    const shotColor = isBombShot ? COLORS.BOMB_CORE : this.currentColor;
    const bubble = new MovingBubble(this.x, this.y - this.radius, shotColor, this.radius, this.angle, isBombShot);
    if (!isBombShot) {
      this.currentColor = this.nextColor;
      this.nextColor = randChoice(this.colors);
    }
    return bubble;
  }

  update(_game) {
    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      this.rotateLeft();
    }
    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      this.rotateRight();
    }
  }

  draw(game) {
    const endX = this.x + Math.cos(this.angle) * 90;
    const endY = this.y + Math.sin(this.angle) * 90;

    ctx.strokeStyle = game.bombLoaded ? COLORS.YELLOW : COLORS.CYAN;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.GRAY;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.DARK;
    ctx.fill();

    const currentX = this.x;
    const currentY = this.y - this.radius;
    const previewBubble = new Bubble(currentX, currentY, this.currentColor, this.radius, game.bombLoaded);
    previewBubble.drawBody();

    const previewX = this.x + 102;
    const previewY = this.y + 10;
    const previewR = this.radius - 4;
    const nextBubble = new Bubble(previewX, previewY, this.nextColor, previewR, false);
    nextBubble.drawBody();
    drawText("NEXT", previewX, previewY + 22, 15, COLORS.WHITE, "center", "700");
  }
}

class Board {
  constructor() {
    this.radius = 20;
    this.diameter = this.radius * 2;
    this.rowHeight = Math.floor(this.radius * Math.sqrt(3));
    this.cols = 12;
    this.rows = 14;
    this.left = Math.floor(WIDTH / 2 - this.cols * this.diameter / 2 - this.radius);
    this.top = 70;
    this.descent = 0;
    this.descentStep = Math.floor(this.rowHeight / 2);
    this.dropEvery = 6;
    this.shotsTaken = 0;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.populateInitialRows(5);
  }

  get right() {
    return this.left + this.cols * this.diameter + this.radius;
  }

  get bottomLimit() {
    return HEIGHT - 145;
  }

  populateInitialRows(filledRows) {
    for (let row = 0; row < filledRows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (row % 2 === 1 && col === this.cols - 1) {
          continue;
        }
        const color = randChoice(BUBBLE_COLORS);
        const [x, y] = this.cellCenter(row, col);
        this.grid[row][col] = new FixedBubble(x, y, color, this.radius, row, col);
      }
    }
  }

  cellCenter(row, col) {
    const offset = row % 2 === 1 ? this.radius : 0;
    const x = this.left + this.radius + col * this.diameter + offset;
    const y = this.top + this.radius + row * this.rowHeight + this.descent;
    return [x, y];
  }

  validCell(row, col) {
    if (!(0 <= row && row < this.rows && 0 <= col && col < this.cols)) {
      return false;
    }
    if (row % 2 === 1 && col === this.cols - 1) {
      return false;
    }
    return true;
  }

  getBubble(row, col) {
    if (!this.validCell(row, col)) {
      return null;
    }
    return this.grid[row][col];
  }

  neighbors(row, col) {
    const candidates = row % 2 === 0
      ? [[row, col - 1], [row, col + 1], [row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]]
      : [[row, col - 1], [row, col + 1], [row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]];
    return candidates.filter(([r, c]) => this.validCell(r, c));
  }

  iterBubbles() {
    const result = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const bubble = this.grid[row][col];
        if (bubble !== null) {
          result.push(bubble);
        }
      }
    }
    return result;
  }

  draw() {
    drawRoundedRect(this.left - 20, this.top - 20, this.right - this.left + 40, this.bottomLimit - this.top + 35, 18, COLORS.PANEL, COLORS.GRID, 2);

    ctx.strokeStyle = COLORS.RED;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.left - 5, this.bottomLimit);
    ctx.lineTo(this.right + 5, this.bottomLimit);
    ctx.stroke();

    for (const bubble of this.iterBubbles()) {
      bubble.draw();
    }
  }

  findCollisionCell(movingBubble) {
    let best = null;
    let bestDist = Infinity;
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const bubble = this.grid[row][col];
        if (bubble === null) {
          continue;
        }
        const dist = hypot(bubble.x - movingBubble.x, bubble.y - movingBubble.y);
        if (dist <= this.diameter - 3 && dist < bestDist) {
          bestDist = dist;
          best = [row, col];
        }
      }
    }
    return best;
  }

  collidesWithFixedBubble(movingBubble) {
    return this.findCollisionCell(movingBubble) !== null;
  }

  shouldAttach(movingBubble) {
    const topHit = movingBubble.y <= this.top + this.radius + this.descent;
    return topHit || this.collidesWithFixedBubble(movingBubble);
  }

  nearestEmptyCell(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (!this.validCell(row, col)) {
          continue;
        }
        if (this.grid[row][col] !== null) {
          continue;
        }
        const [cx, cy] = this.cellCenter(row, col);
        const dist = hypot(cx - x, cy - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = [row, col];
        }
      }
    }
    return best;
  }

  attachMovingBubble(movingBubble) {
    const cell = this.nearestEmptyCell(movingBubble.x, movingBubble.y);
    if (cell === null) {
      return null;
    }
    const [row, col] = cell;
    const [x, y] = this.cellCenter(row, col);
    const fixed = new FixedBubble(x, y, movingBubble.color, this.radius, row, col, false);
    this.grid[row][col] = fixed;
    this.shotsTaken += 1;
    return fixed;
  }

  clusterFrom(startRow, startCol) {
    const start = this.getBubble(startRow, startCol);
    if (start === null) {
      return [];
    }

    const color = start.color;
    const visited = new Set();
    const queue = [[startRow, startCol]];
    const cluster = [];

    while (queue.length > 0) {
      const [row, col] = queue.shift();
      const key = `${row},${col}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const bubble = this.getBubble(row, col);
      if (bubble === null || bubble.color !== color) {
        continue;
      }

      cluster.push([row, col]);
      for (const [nr, nc] of this.neighbors(row, col)) {
        if (!visited.has(`${nr},${nc}`)) {
          queue.push([nr, nc]);
        }
      }
    }
    return cluster;
  }

  removeCells(cells) {
    let removed = 0;
    for (const [row, col] of cells) {
      if (this.getBubble(row, col) !== null) {
        this.grid[row][col] = null;
        removed += 1;
      }
    }
    return removed;
  }

  floatingCells() {
    const visited = new Set();
    const queue = [];

    for (let col = 0; col < this.cols; col += 1) {
      if (this.getBubble(0, col) !== null) {
        queue.push([0, col]);
      }
    }

    while (queue.length > 0) {
      const [row, col] = queue.shift();
      const key = `${row},${col}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      for (const [nr, nc] of this.neighbors(row, col)) {
        if (this.getBubble(nr, nc) !== null && !visited.has(`${nr},${nc}`)) {
          queue.push([nr, nc]);
        }
      }
    }

    const floating = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.getBubble(row, col) !== null && !visited.has(`${row},${col}`)) {
          floating.push([row, col]);
        }
      }
    }
    return floating;
  }

  resolveAfterAttach(fixedBubble) {
    let removed = 0;
    const cluster = this.clusterFrom(fixedBubble.row, fixedBubble.col);

    if (cluster.length >= 3) {
      removed += this.removeCells(cluster);
      const floating = this.floatingCells();
      removed += this.removeCells(floating);
    }

    this.applyDescentIfNeeded();
    return removed;
  }

  bombCellsAround(row, col) {
    const cellSet = new Set([`${row},${col}`]);
    for (const [nr, nc] of this.neighbors(row, col)) {
      cellSet.add(`${nr},${nc}`);
    }
    return Array.from(cellSet).map((key) => key.split(",").map(Number));
  }

  resolveBomb(movingBubble) {
    let target = this.findCollisionCell(movingBubble);
    if (target === null) {
      const cell = this.nearestEmptyCell(movingBubble.x, movingBubble.y);
      if (cell === null) {
        return 0;
      }
      target = cell;
    }

    const [row, col] = target;
    const removedCells = this.bombCellsAround(row, col);
    let removed = this.removeCells(removedCells);
    removed += this.removeCells(this.floatingCells());
    this.shotsTaken += 1;
    this.applyDescentIfNeeded();
    return removed;
  }

  applyDescentIfNeeded() {
    if (this.shotsTaken > 0 && this.shotsTaken % this.dropEvery === 0) {
      this.descent += this.descentStep;
      for (const bubble of this.iterBubbles()) {
        const [x, y] = this.cellCenter(bubble.row, bubble.col);
        bubble.setGridPosition(bubble.row, bubble.col, x, y);
      }
    }
  }

  lowestBubbleY() {
    let lowest = 0;
    for (const bubble of this.iterBubbles()) {
      lowest = Math.max(lowest, bubble.y + bubble.radius);
    }
    return lowest;
  }

  isGameOver() {
    return this.lowestBubbleY() >= this.bottomLimit;
  }

  isCleared() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.validCell(row, col) && this.grid[row][col] !== null) {
          return false;
        }
      }
    }
    return true;
  }
}

class BubbleShooterGame {
  constructor() {
    this.board = new Board();
    this.shooter = new Shooter(WIDTH / 2, HEIGHT - 95, this.board.radius, BUBBLE_COLORS);
    this.currentShot = null;
    this.score = 0;
    this.skillGauge = 35;
    this.bombLoaded = false;
    this.state = "playing";
    this.message = "같은 색 버블 3개 이상을 연결해 제거하세요.";
  }

  reset() {
    this.board = new Board();
    this.shooter = new Shooter(WIDTH / 2, HEIGHT - 95, this.board.radius, BUBBLE_COLORS);
    this.currentShot = null;
    this.score = 0;
    this.skillGauge = 35;
    this.bombLoaded = false;
    this.state = "playing";
    this.message = "새 게임을 시작합니다.";
  }

  handleKeyDown(code) {
    if (code === "KeyR") {
      this.reset();
      return;
    }

    if (this.state !== "playing") {
      return;
    }

    if (code === "Space" && this.currentShot === null) {
      this.currentShot = this.shooter.shoot(this.bombLoaded);
      if (this.bombLoaded) {
        this.bombLoaded = false;
        this.message = "폭탄 버블 발사! 충돌 지점 주변이 제거됩니다.";
      } else {
        this.message = "버블 발사!";
      }
    }

    if (code === "KeyE") {
      this.loadBomb();
    }
  }

  loadBomb() {
    if (this.currentShot !== null || this.bombLoaded) {
      return;
    }
    if (this.skillGauge < 100) {
      this.message = `스킬 게이지가 부족합니다. 현재 ${Math.floor(this.skillGauge)}%`;
      return;
    }
    this.skillGauge = 0;
    this.bombLoaded = true;
    this.message = "폭탄 버블 장전 완료. 다음 발사는 주변 버블을 제거합니다.";
  }

  handleShotAttachment() {
    if (this.currentShot === null) {
      return;
    }

    let removed = 0;

    if (this.currentShot.isBomb) {
      removed = this.board.resolveBomb(this.currentShot);
      this.score += removed * 25;
      this.skillGauge = clamp(this.skillGauge + removed * 4, 0, 100);
      this.message = removed > 0 ? `폭탄으로 ${removed}개의 버블을 제거했습니다.` : "폭탄이 빈 곳에 맞았습니다.";
    } else {
      const fixed = this.board.attachMovingBubble(this.currentShot);
      if (fixed !== null) {
        removed = this.board.resolveAfterAttach(fixed);
      }
      this.score += removed * 15;
      this.skillGauge = clamp(this.skillGauge + 16 + removed * 10, 0, 100);
      this.message = removed >= 3 ? `${removed}개의 버블을 제거했습니다.` : "3개 이상 연결되지 않아 제거되지 않았습니다.";
    }

    this.currentShot = null;

    if (this.board.isGameOver()) {
      this.state = "lose";
    } else if (this.board.isCleared()) {
      this.state = "win";
    }
  }

  update() {
    if (this.state !== "playing") {
      return;
    }

    this.shooter.update(this);

    if (this.currentShot !== null) {
      this.currentShot.update(this);
      if (this.board.shouldAttach(this.currentShot)) {
        this.handleShotAttachment();
      }
    }
  }

  drawPredictedGuide() {
    const points = [];
    let x = this.shooter.x;
    let y = this.shooter.y;
    let vx = Math.cos(this.shooter.angle) * 14;
    let vy = Math.sin(this.shooter.angle) * 14;

    for (let i = 0; i < 75; i += 1) {
      x += vx;
      y += vy;

      const leftWall = this.board.left + this.board.radius;
      const rightWall = this.board.right - this.board.radius;
      if (x <= leftWall) {
        x = leftWall;
        vx *= -1;
      } else if (x >= rightWall) {
        x = rightWall;
        vx *= -1;
      }

      points.push([x, y]);

      if (y <= this.board.top + this.board.radius + this.board.descent) {
        break;
      }
      const fake = { x, y, radius: this.board.radius };
      if (this.board.collidesWithFixedBubble(fake)) {
        break;
      }
    }

    ctx.fillStyle = this.bombLoaded ? COLORS.YELLOW : COLORS.CYAN;
    points.forEach(([px, py], idx) => {
      if (idx % 4 === 0) {
        ctx.beginPath();
        ctx.arc(px, py, 3.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawUI() {
    drawText("BOMB SKILL BUBBLE SHOOTER", WIDTH / 2, 17, 39, COLORS.WHITE, "center", "800");

    drawRoundedRect(WIDTH - 252, 82, 222, 326, 18, COLORS.PANEL, COLORS.GRID, 2);

    const remain = this.board.dropEvery - (this.board.shotsTaken % this.board.dropEvery || 0);
    const remainText = remain === this.board.dropEvery ? `${this.board.dropEvery}발` : `${remain}발`;

    const lines = [
      ["점수", String(this.score), 23, COLORS.WHITE],
      ["천장 하강까지", remainText, 23, COLORS.WHITE],
      ["현재 상태", this.bombLoaded ? "폭탄 장전" : "일반 버블", 19, this.bombLoaded ? COLORS.YELLOW : COLORS.CYAN],
      ["조준", "← → / A D", 18, COLORS.WHITE],
      ["발사", "SPACE", 18, COLORS.WHITE],
      ["폭탄 장전", "E", 18, COLORS.WHITE],
      ["재시작", "R", 18, COLORS.WHITE]
    ];

    let y = 100;
    for (const [label, value, size, color] of lines) {
      drawText(`${label}: ${value}`, WIDTH - 232, y, size, color, "left", size >= 23 ? "700" : "500");
      y += size >= 23 ? 32 : 26;
    }

    drawText("스킬 게이지", WIDTH - 232, 300, 17, COLORS.WHITE, "left", "700");
    drawRoundedRect(WIDTH - 232, 326, 178, 18, 9, "#12141e", COLORS.GRID, 1);
    const gaugeWidth = 178 * (this.skillGauge / 100);
    drawRoundedRect(WIDTH - 232, 326, gaugeWidth, 18, 9, this.skillGauge >= 100 ? COLORS.YELLOW : COLORS.CYAN, null, 0);
    drawText(`${Math.floor(this.skillGauge)}%`, WIDTH - 142, 324, 17, COLORS.BLACK, "center", "800");

    const wrapped = this.wrapText(this.message, 180);
    let my = 366;
    for (const line of wrapped.slice(0, 3)) {
      drawText(line, WIDTH - 232, my, 16, COLORS.WHITE, "left", "500");
      my += 22;
    }
  }

  wrapText(text, maxWidth) {
    ctx.font = "500 16px system-ui";
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const testLine = line.length === 0 ? word : `${line} ${word}`;
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      lines.push(line);
    }
    return lines;
  }

  drawStateMessage() {
    if (this.state === "playing") {
      return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const message = this.state === "win" ? "MISSION COMPLETE" : "GAME OVER";
    const color = this.state === "win" ? COLORS.GREEN : COLORS.RED;
    drawText(message, WIDTH / 2, HEIGHT / 2 - 42, 48, color, "center", "900");
    drawText("R 키를 누르면 다시 시작합니다.", WIDTH / 2, HEIGHT / 2 + 20, 24, COLORS.WHITE, "center", "600");
  }

  draw() {
    ctx.fillStyle = COLORS.DARK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    this.board.draw();
    this.drawPredictedGuide();
    this.shooter.draw(this);

    if (this.currentShot !== null) {
      this.currentShot.draw();
    }

    this.drawUI();
    this.drawStateMessage();
  }
}

const game = new BubbleShooterGame();

function gameLoop() {
  game.update();
  game.draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
