/**
 * Snake Game — game.js
 *
 * Implements a browser-based Snake game on an HTML5 Canvas.
 * - Snake moves on a grid; one cell = CELL_SIZE px
 * - Keyboard arrow keys change direction
 * - Food spawns at a random empty cell
 * - Score increases by 10 for each food eaten
 * - Game ends on wall or self collision
 * - High score is persisted in localStorage
 */

(function () {
  'use strict';

  /* ===== Constants ===== */
  const CANVAS_SIZE = 400;   // px (must match HTML attribute)
  const CELL_SIZE   = 20;    // px per grid cell
  const COLS        = CANVAS_SIZE / CELL_SIZE;  // 20 columns
  const ROWS        = CANVAS_SIZE / CELL_SIZE;  // 20 rows
  const TICK_MS     = 120;   // ms per game tick (controls speed)

  const COLOR_BG    = '#16213e';
  const COLOR_SNAKE = '#4ecca3';
  const COLOR_HEAD  = '#38b28a';
  // Food color: red
  const COLOR_FOOD  = '#e94560';
  const COLOR_TEXT  = '#eaeaea';

  /* ===== DOM References ===== */
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreEl     = document.getElementById('score');
  const highScoreEl = document.getElementById('high-score');
  const overlay     = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayScore = document.getElementById('overlay-score');
  const restartBtn  = document.getElementById('restartBtn');

  /* ===== Game State ===== */
  let snake;       // Array of {x, y} cells, index 0 = head
  let direction;   // Current movement direction
  let nextDir;     // Queued direction change (applied each tick)
  let food;        // {x, y} of current food cell
  let score;       // Current score
  let highScore;   // All-time high score (localStorage)
  let running;     // Whether the game loop is active
  let loopTimer;   // setInterval handle

  /* ===== Initialisation ===== */

  /** Load high score from localStorage. */
  function loadHighScore() {
    highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
    highScoreEl.textContent = highScore;
  }

  /** Save high score to localStorage if current score beats it. */
  function updateHighScore() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snakeHighScore', highScore);
      highScoreEl.textContent = highScore;
    }
  }

  /** Reset all game state and start a fresh game. */
  function startGame() {
    // Place snake in the middle of the board, 3 cells long facing right
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    snake     = [
      { x: midX,     y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    direction = { x: 1, y: 0 };  // moving right
    nextDir   = { x: 1, y: 0 };
    score     = 0;
    running   = true;

    scoreEl.textContent = score;
    overlay.classList.add('hidden');

    spawnFood();

    // Clear any existing loop before starting a new one
    clearInterval(loopTimer);
    loopTimer = setInterval(tick, TICK_MS);
  }

  /* ===== Game Loop ===== */

  /** Called every TICK_MS; advances game state by one step. */
  function tick() {
    if (!running) return;

    // Apply the queued direction change
    direction = nextDir;

    // Calculate new head position
    const head    = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame();
      return;
    }

    // Check self collision (against all body segments)
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      endGame();
      return;
    }

    // Move snake: prepend new head
    snake.unshift(newHead);

    // Check if food was eaten
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      updateHighScore();
      spawnFood();
      // Don't remove tail — snake grows by 1
    } else {
      // Remove tail segment to maintain length
      snake.pop();
    }

    draw();
  }

  /* ===== Food ===== */

  /**
   * Spawn food at a random cell that is not occupied by the snake.
   * Falls back gracefully if the board is nearly full.
   */
  function spawnFood() {
    const emptyCells = [];

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!snake.some(seg => seg.x === x && seg.y === y)) {
          emptyCells.push({ x, y });
        }
      }
    }

    if (emptyCells.length === 0) {
      // Extremely unlikely; snake fills the entire board — player wins
      endGame(true);
      return;
    }

    food = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  /* ===== Rendering ===== */

  /** Redraw the entire canvas for the current game state. */
  function draw() {
    // Clear background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw optional subtle grid lines
    drawGrid();

    // Draw food
    drawCell(food.x, food.y, COLOR_FOOD, true);

    // Draw snake body (tail → neck, so head renders on top)
    for (let i = snake.length - 1; i >= 1; i--) {
      drawCell(snake[i].x, snake[i].y, COLOR_SNAKE);
    }
    // Draw head with a distinct colour
    drawCell(snake[0].x, snake[0].y, COLOR_HEAD);
  }

  /**
   * Draw a single grid cell.
   * @param {number}  x     - Column index
   * @param {number}  y     - Row index
   * @param {string}  color - Fill colour
   * @param {boolean} [circle] - Draw as circle (food) instead of square
   */
  function drawCell(x, y, color, circle = false) {
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;
    const pad = 2;  // inner padding to separate cells visually

    ctx.fillStyle = color;

    if (circle) {
      // Draw food as a circle centred in the cell
      const cx = px + CELL_SIZE / 2;
      const cy = py + CELL_SIZE / 2;
      const r  = CELL_SIZE / 2 - pad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(px + pad, py + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
    }
  }

  /** Draw faint grid lines to help visualise the play field. */
  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;

    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }
  }

  /* ===== Game Over ===== */

  /**
   * Stop the game loop and show the overlay.
   * @param {boolean} [win] - Whether the player won (board full)
   */
  function endGame(win = false) {
    running = false;
    clearInterval(loopTimer);
    updateHighScore();

    overlayTitle.textContent  = win ? '🎉 You Win!' : 'Game Over';
    overlayScore.textContent  = `Score: ${score}`;
    overlay.classList.remove('hidden');
  }

  /* ===== Input Handling ===== */

  /**
   * Handle keyboard arrow key input.
   * Prevents reversing direction (e.g. moving left while going right).
   */
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowUp':
        if (direction.y !== 1) nextDir = { x: 0, y: -1 };
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (direction.y !== -1) nextDir = { x: 0, y: 1 };
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (direction.x !== 1) nextDir = { x: -1, y: 0 };
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (direction.x !== -1) nextDir = { x: 1, y: 0 };
        e.preventDefault();
        break;
    }
  });

  /* Restart button */
  restartBtn.addEventListener('click', startGame);

  /* ===== Bootstrap ===== */
  loadHighScore();
  startGame();
})();
