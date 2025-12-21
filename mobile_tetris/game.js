const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const startOverlay = document.getElementById('start-overlay');
const scoreElement = document.getElementById('score');

// Config
const COLS = 10;
const ROWS = 20;
let BLOCK_SIZE = 30; // Will be dynamic
let BOARD_WIDTH = 0;
let BOARD_HEIGHT = 0;

// Game State
let grid = createGrid();
let score = 0;
let animationId;
let lastTime = 0;
let dropCounter = 0;
let dropInterval = 1000;
let isGameOver = false;
let isPaused = true;
let particles = [];
let fireworks = []; // Active firework emitters

// Tetrominos
const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // O
    '#0DFF72', // S
    '#F538FF', // Z
    '#FF8E0D', // L
    '#FFE138', // J
    '#3877FF', // I
];

const PIECES = [
    [],
    [[1, 1, 1], [0, 1, 0]], // T
    [[2, 2], [2, 2]],       // O
    [[0, 3, 3], [3, 3, 0]], // S
    [[4, 4, 0], [0, 4, 4]], // Z
    [[5, 0, 0], [5, 5, 5]], // L
    [[0, 0, 6], [6, 6, 6]], // J
    [[7, 7, 7, 7]],         // I
];

// Bag Randomizer
let pieceBag = [];
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function getNextPiece() {
    if (pieceBag.length === 0) {
        pieceBag = [1, 2, 3, 4, 5, 6, 7];
        shuffle(pieceBag);
    }
    const typeIndex = pieceBag.pop();
    return {
        matrix: PIECES[typeIndex].map(row => [...row]), // Clone
        index: typeIndex, // For color reference
        pos: { x: 0, y: 0 },
        score: 0
    };
}

let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null, // Stored next piece
};

// --- Particles & Fireworks ---
class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity || {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
        };
        this.alpha = 1;
        this.gravity = 0.2;
        this.drag = 0.96;
        this.life = 1.0;
        this.decay = Math.random() * 0.01 + 0.01;
    }

    update() {
        this.velocity.x *= this.drag;
        this.velocity.y *= this.drag;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
        this.life = this.alpha;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.random() * 3 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Firework {
    constructor(x, y, duration) {
        this.x = x;
        this.y = y;
        this.duration = duration; // in ms
        this.startTime = Date.now();
        this.burstInterval = 200;
        this.lastBurst = 0;
    }

    update(time) {
        const elapsed = Date.now() - this.startTime;
        if (elapsed > this.duration) return false; // Dead

        // Periodic bursts
        if (time - this.lastBurst > this.burstInterval) {
            this.explode();
            this.lastBurst = time;
        }
        return true;
    }

    explode() {
        const color = COLORS[Math.floor(Math.random() * 7) + 1];
        // Create a burst of particles
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 100,
                this.y + (Math.random() - 0.5) * 100,
                color,
                {
                    x: (Math.random() - 0.5) * 15,
                    y: (Math.random() - 1) * 15
                }
            ));
        }
        vibrate(10);
    }
}

// --- Resizing & Layout ---
function resize() {
    // We want to fit the game-canvas into the potential desktop constraints
    // The CSS limits max-width/height, but canvas internal resolution needs to match
    // actually rendered size for sharpness.
    const container = document.getElementById('game-container');
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    const aspect = COLS / ROWS;
    let w = maxWidth;
    let h = maxWidth / aspect;

    if (h > maxHeight) {
        h = maxHeight;
        w = h * aspect;
    }

    BLOCK_SIZE = Math.floor(h / ROWS);

    // Snap to integers
    canvas.width = BLOCK_SIZE * COLS;
    canvas.height = BLOCK_SIZE * ROWS;

    BOARD_WIDTH = canvas.width;
    BOARD_HEIGHT = canvas.height;

    // Redraw next piece
    drawNextPiece();
    draw();
}
window.addEventListener('resize', resize);


// --- Input Handling (The Magic for Mobile) ---
const inputState = {
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false,
    tapThresholdStart: 0,
    hasMovedPiece: false,
};

const INPUT_SENSITIVITY_X = 1.0;
let moveAccumulatorX = 0;

canvas.addEventListener('pointerdown', (e) => {
    if (isGameOver || isPaused) return;

    inputState.isDragging = true;
    inputState.startX = e.clientX;
    inputState.startY = e.clientY;
    inputState.lastX = e.clientX;
    inputState.lastY = e.clientY;
    inputState.tapThresholdStart = Date.now();
    inputState.hasMovedPiece = false;
    moveAccumulatorX = 0;

    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
    if (!inputState.isDragging || isGameOver || isPaused) return;

    const deltaX = e.clientX - inputState.lastX;
    const deltaY = e.clientY - inputState.lastY;

    moveAccumulatorX += deltaX / BLOCK_SIZE * INPUT_SENSITIVITY_X;

    if (moveAccumulatorX > 0.8) {
        move(1);
        moveAccumulatorX -= 1;
        inputState.hasMovedPiece = true;
    } else if (moveAccumulatorX < -0.8) {
        move(-1);
        moveAccumulatorX += 1;
        inputState.hasMovedPiece = true;
    }

    if (deltaY > BLOCK_SIZE * 0.5) {
        playerDrop();
        inputState.hasMovedPiece = true;
    }

    inputState.lastX = e.clientX;
    inputState.lastY = e.clientY;
});

canvas.addEventListener('pointerup', (e) => {
    if (!inputState.isDragging) return;
    inputState.isDragging = false;

    const duration = Date.now() - inputState.tapThresholdStart;
    const totalDeltaY = e.clientY - inputState.startY;

    if (duration < 200 && !inputState.hasMovedPiece && Math.abs(totalDeltaY) < 20) {
        playerRotate(1);
        vibrate(10);
    }
    else if (duration < 250 && totalDeltaY > 50) {
        if (Math.abs(e.clientX - inputState.startX) < Math.abs(totalDeltaY)) {
            while (!collide(grid, player)) {
                player.pos.y++;
            }
            player.pos.y--;
            merge(grid, player);
            playerReset();
            arenaSweep();
            updateScore();
            vibrate(30);
        }
    }
});


// --- Game Logic ---

function createGrid() {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function draw() {
    if (isPaused) return;

    // Clear whole canvas mostly to support transparent/particle effects cleanly
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGridLines();
    drawGhostPiece();

    // Draw Locked Grid
    drawMatrix(grid, { x: 0, y: 0 });

    // Draw Active Piece
    if (!isGameOver) {
        drawMatrix(player.matrix, player.pos);
    }

    // Draw Particles
    particles.forEach(p => p.draw(ctx));
}

function drawGridLines() {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= COLS; i++) {
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
    }
    ctx.stroke();
}

function drawMatrix(matrix, offset, colorOverride = null, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                let fill = colorOverride || COLORS[value];
                if (isGhost) {
                    ctx.globalAlpha = 0.2;
                    ctx.fillStyle = fill;
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = fill;
                    ctx.strokeRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.globalAlpha = 1.0;
                } else {
                    ctx.fillStyle = fill;
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE / 2);
                }
            }
        });
    });
}

function drawGhostPiece() {
    if (isGameOver) return;
    const ghost = {
        pos: { ...player.pos },
        matrix: player.matrix
    };
    while (!collide(grid, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    drawMatrix(ghost.matrix, ghost.pos, null, true);
}

function drawNextPiece() {
    if (!player.next) return;

    // Clear next canvas
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Calculate scale to fit
    const matrix = player.next.matrix;
    const cellSize = 12; // Small size for preview
    const cx = nextCanvas.width / 2;
    const cy = nextCanvas.height / 2;
    const w = matrix[0].length * cellSize;
    const h = matrix.length * cellSize;

    const startX = cx - w / 2;
    const startY = cy - h / 2;

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextCtx.fillStyle = COLORS[value];
                nextCtx.fillRect(startX + x * cellSize, startY + y * cellSize, cellSize - 1, cellSize - 1);
            }
        });
    });
}


function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerDrop() {
    player.pos.y++;
    if (collide(grid, player)) {
        player.pos.y--;
        merge(grid, player);
        playerReset();
        arenaSweep();
        updateScore();
        vibrate(5);
    }
    dropCounter = 0;
}

function move(dir) {
    player.pos.x += dir;
    if (collide(grid, player)) {
        player.pos.x -= dir;
    } else {
        vibrate(2);
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(grid, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerReset() {
    if (player.next) {
        const next = player.next;
        player.matrix = next.matrix;
        player.next = getNextPiece();
    } else {
        // Startup
        player.next = getNextPiece();
        player.matrix = getNextPiece().matrix;
    }

    drawNextPiece();

    player.pos.y = 0;
    player.pos.x = (grid[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    if (collide(grid, player)) {
        grid.forEach(row => row.fill(0));
        score = 0;
        updateScore();
        fireworks = [];
    }
}

function arenaSweep() {
    let rowCount = 0;

    // Safety check: sweep bottom up
    for (let y = grid.length - 1; y >= 0; --y) {
        let isFull = true;
        for (let x = 0; x < grid[y].length; ++x) {
            if (grid[y][x] === 0) {
                isFull = false;
                break;
            }
        }

        if (isFull) {
            // Explode particles before removing
            for (let x = 0; x < grid[y].length; ++x) {
                const val = grid[y][x];
                const color = COLORS[val];
                for (let k = 0; k < 8; k++) {
                    particles.push(new Particle(
                        x * BLOCK_SIZE + BLOCK_SIZE / 2,
                        y * BLOCK_SIZE + BLOCK_SIZE / 2,
                        color
                    ));
                }
            }

            const row = grid.splice(y, 1)[0].fill(0);
            grid.unshift(row);
            y++; // Check position again
            rowCount++;
        }
    }

    if (rowCount > 0) {
        score += rowCount * 10;
        // Firework Logic
        // 1 sec base + 1 sec per extra line
        const duration = 1000 + (rowCount - 1) * 1000;
        fireworks.push(new Firework(canvas.width / 2, canvas.height / 2, duration));

        vibrate([50, 50, 50]);
    }
}

function updateScore() {
    scoreElement.innerText = score;
}

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Update Fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        if (!fireworks[i].update(time)) { // Returns false if dead
            fireworks.splice(i, 1);
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// Start Handler
startOverlay.addEventListener('click', () => {
    if (isPaused) {
        startOverlay.classList.add('hidden');
        isPaused = false;

        resize();
        if (!player.matrix) playerReset();

        update();
    }
});

// Initial draw
resize();
draw();
