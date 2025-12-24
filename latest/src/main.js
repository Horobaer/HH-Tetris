import { s as saveScore } from "./leaderboard.js";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const KEY = {
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
    DOWN: "ArrowDown",
    UP: "ArrowUp",
    SPACE: " ",
    ESC: "Escape",
    P: "p"
};

const COLORS = [
    "none",
    "cyan",
    "blue",
    "orange",
    "yellow",
    "green",
    "purple",
    "red"
];

const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

// Helper to draw a single block
function drawBlock(ctx, x, y, color) {
    const pX = x * BLOCK_SIZE;
    const pY = y * BLOCK_SIZE;

    ctx.fillStyle = color;
    ctx.fillRect(pX, pY, BLOCK_SIZE, BLOCK_SIZE);

    // Bevel effect
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(pX, pY + BLOCK_SIZE);
    ctx.lineTo(pX, pY);
    ctx.lineTo(pX + BLOCK_SIZE, pY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.moveTo(pX + BLOCK_SIZE, pY);
    ctx.lineTo(pX + BLOCK_SIZE, pY + BLOCK_SIZE);
    ctx.lineTo(pX, pY + BLOCK_SIZE);
    ctx.stroke();

    // Inner highlight
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(pX + 4, pY + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
}

class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        // Random angle
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = life;
        this.maxLife = life;
        this.alpha = 1;
        this.gravity = 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        this.alpha = this.life / this.maxLife;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4); // Small square particles
        ctx.restore();
    }
}

class Board {
    constructor(ctx) {
        this.ctx = ctx;
        this.grid = this.getEmptyGrid();
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    valid(p) {
        return p.shape.every((row, dy) => {
            return row.every((value, dx) => {
                let x = p.x + dx;
                let y = p.y + dy;
                return (
                    value === 0 ||
                    (this.isInsideWalls(x, y) && this.notOccupied(x, y))
                );
            });
        });
    }

    isInsideWalls(x, y) {
        return x >= 0 && x < COLS && y <= ROWS;
    }

    notOccupied(x, y) {
        return this.grid[y] && this.grid[y][x] === 0;
    }

    rotate(p) {
        let clone = JSON.parse(JSON.stringify(p));
        // Transpose
        for (let i = 0; i < clone.shape.length; ++i) {
            for (let j = 0; j < i; ++j) {
                [clone.shape[i][j], clone.shape[j][i]] = [clone.shape[j][i], clone.shape[i][j]];
            }
        }
        // Reverse rows
        clone.shape.forEach(row => row.reverse());
        return clone;
    }

    draw() {
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    drawBlock(this.ctx, x, y, COLORS[value]);
                }
            });
        });
    }

    freeze(p) {
        p.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    this.grid[p.y + dy][p.x + dx] = value;
                }
            });
        });
    }
}

class Piece {
    constructor(ctx) {
        this.ctx = ctx;
        this.spawn();
    }

    spawn() {
        this.typeId = this.randomizeTetrominoType(COLORS.length - 1);
        this.shape = SHAPES[this.typeId];
        this.color = COLORS[this.typeId];
        this.x = 0;
        this.y = 0;
        // Center it
        this.x = 3;
    }

    randomizeTetrominoType(noOfTypes) {
        return Math.floor(Math.random() * noOfTypes + 1);
    }

    move(p) {
        this.x = p.x;
        this.y = p.y;
        this.shape = p.shape;
    }

    draw(x = null, y = null, color = null) {
        const drawX = x !== null ? x : this.x;
        const drawY = y !== null ? y : this.y;
        const drawColor = color !== null ? color : this.color;

        this.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    drawBlock(this.ctx, drawX + dx, drawY + dy, drawColor);
                }
            });
        });
    }
}

// Audio logic remains same
class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
        this.isMuted = false;

        // Resume context on interaction
        const resume = () => {
            if (this.ctx.state === 'suspended') this.ctx.resume();
        };
        document.addEventListener('keydown', resume, { once: true });
        document.addEventListener('click', resume, { once: true });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        return this.isMuted;
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    move() { this.playTone(200, 'triangle', 0.1); }
    rotate() { this.playTone(400, 'sine', 0.1); }
    drop() { this.playTone(100, 'square', 0.15); }

    clear() {
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(500, 'sine', 0.1), 100);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 200);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 300);
    }

    gameOver() {
        this.playTone(100, 'sawtooth', 1.0);
        this.stopMusic();
    }

    async startMusic(level = 0) {
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.stopMusic();

        const songs = [
            {
                title: "Classic Pop",
                tempo: 400, // ms per beat
                notes: [
                    { f: 261.63, d: 2 }, { f: 392.00, d: 2 }, { f: 440.00, d: 2 }, { f: 349.23, d: 2 },
                    { f: 261.63, d: 1 }, { f: 293.66, d: 1 }, { f: 329.63, d: 2 }, { f: 392.00, d: 2 }, { f: 349.23, d: 2 }
                ]
            },
            {
                title: "Minor Dance",
                tempo: 300,
                notes: [
                    { f: 440.00, d: 1 }, { f: 440.00, d: 1 }, { f: 349.23, d: 2 }, { f: 261.63, d: 1 },
                    { f: 392.00, d: 3 }, { f: 523.25, d: 1 }, { f: 493.88, d: 1 }, { f: 440.00, d: 2 }
                ]
            },
            {
                title: "Power Ballad",
                tempo: 600,
                notes: [
                    { f: 261.63, d: 4 }, { f: 329.63, d: 4 }, { f: 349.23, d: 4 }, { f: 392.00, d: 4 }
                ]
            }
        ];

        const songIndex = level % songs.length;
        const song = songs[songIndex];
        this.currentSongTitle = song.title;

        // Speed up slightly with level within song
        let difficultyInLoop = Math.floor(level / songs.length);
        let speedMult = Math.max(0.5, 1.0 - (difficultyInLoop * 0.1));
        let baseTempo = song.tempo * speedMult;

        let noteIndex = 0;

        const playNextNote = () => {
            const note = song.notes[noteIndex];
            this.playTone(note.f, 'triangle', (baseTempo * note.d) / 1000 * 0.8);

            noteIndex = (noteIndex + 1) % song.notes.length;
            this.musicInterval = setTimeout(playNextNote, baseTempo * note.d);
        };

        playNextNote();
    }

    stopMusic() {
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

class Game {
    constructor(ctx, ctxNext, mobCtxNext) {
        this.ctx = ctx;
        this.ctxNext = ctxNext;
        this.mobCtxNext = mobCtxNext;
        this.board = new Board(ctx);
        this.audio = new AudioController();
        this.piece = null;
        this.nextPieces = [];
        this.particles = [];
        this.fireworkEndTime = 0;

        // Clearing animation state
        this.clearingAnimations = [];
    }

    play() {
        this.reset();
        this.loop();

        // Update play button icon if exists
        const mobIcon = document.getElementById('mob-restart-icon');
        if (mobIcon) {
            // Reset icon svg logic if needed
            mobIcon.innerHTML = '<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>';
        }
    }

    reset() {
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }

        this.board = new Board(this.ctx);
        this.score = 0;
        this.lines = 0;
        this.level = 0;
        this.time = { start: 0, elapsed: 0, level: 1000 };
        this.speedManualOffset = 0;
        this.totalTime = 0;
        this.lastTime = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.particles = [];
        this.fireworkEndTime = 0;

        this.fireworkEndTime = 0;

        this.clearingAnimations = [];

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.innerText = "Pause";
            pauseBtn.classList.remove("paused");
        }

        this.nextPieces = [];
        this.piece = this.getNextPiece();
        this.audio.startMusic(this.level);
        this.updateAccount();
    }

    getNextPiece() {
        // Fill queue
        while (this.nextPieces.length < 2) {
            this.nextPieces.push(new Piece(this.ctx));
        }

        // Get first
        const p = this.nextPieces.shift();
        // Replenish
        this.nextPieces.push(new Piece(this.ctx));

        // Refresh Next Board instantly
        this.drawNext(); // New! ensure instant update

        return p;
    }

    togglePause() {
        if (this.gameOver) return;
        this.isPaused = !this.isPaused;

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.innerText = this.isPaused ? "Resume" : "Pause";
            pauseBtn.classList.toggle("paused", this.isPaused);
        }

        if (this.isPaused) {
            this.audio.stopMusic();
        } else {
            this.audio.startMusic(this.level);
            this.lastTime = 0;
            this.loop();
        }
    }

    loop(now = 0) {
        if (this.isPaused) return;
        if (!this.lastTime) this.lastTime = now;

        const deltaTime = now - this.lastTime;
        this.lastTime = now;
        this.totalTime += deltaTime;

        // Update clearing animations (non-blocking)
        this.updateClearingAnimations(deltaTime);

        // Normal game loop
        this.time.elapsed = now - this.time.start;
        if (this.time.elapsed > this.time.level) {
            this.time.start = now;
            this.drop();
        }

        if (!this.gameOver) {
            this.draw();
            this.requestId = requestAnimationFrame(this.loop.bind(this));
        }
    }

    updateClearingAnimations(dt) {
        this.clearingAnimations = this.clearingAnimations.filter(anim => anim.life > 0);
        this.clearingAnimations.forEach(anim => {
            anim.life -= dt;
            // Spawn particles periodically
            if (Math.random() > 0.8) {
                anim.blocks.forEach((color, x) => {
                    // Check if this specific block is not empty (cleared rows usually full but robust check)
                    if (color !== 'none') {
                        const cx = x * BLOCK_SIZE + BLOCK_SIZE / 2;
                        const cy = anim.y * BLOCK_SIZE + BLOCK_SIZE / 2;

                        // Note: We might want slightly more chaos here
                        if (Math.random() > 0.8) {
                            this.particles.push(new Particle(cx, cy, color, Math.random() * 2 + 1, 20));
                        }
                    }
                });
            }
        });
    }

    drop() {
        let p = this.moves[KEY.DOWN](this.piece);
        if (this.board.valid(p)) {
            this.piece.move(p);
        } else {
            this.board.freeze(this.piece);

            // Game over condition: blocks in top row
            if (this.board.grid[0].some(val => val > 0)) {
                this.handleGameOver();
                return;
            }

            // check for clear check instead of immediate clear
            this.checkAndStartClear();
        }
    }

    checkAndStartClear() {
        let lines = [];
        this.board.grid.forEach((row, y) => {
            if (row.every(value => value > 0)) {
                lines.push(y);
            }
        });

        if (lines.length > 0) {
            // Snapshot for animation
            lines.forEach(y => {
                const rowColors = this.board.grid[y].map(val => COLORS[val]);
                this.clearingAnimations.push({
                    y: y, // This is the screen row index
                    blocks: rowColors,
                    life: 2000,
                    maxLife: 2000
                });

                // Initial burst of particles
                rowColors.forEach((color, x) => {
                    const cx = x * BLOCK_SIZE + BLOCK_SIZE / 2;
                    const cy = y * BLOCK_SIZE + BLOCK_SIZE / 2;
                    for (let i = 0; i < 3; i++) {
                        this.particles.push(new Particle(cx, cy, color, Math.random() * 5 + 2, 30));
                    }
                });
            });

            // IMMEDIATELY clear logical lines
            this.finalizeClear(lines);

        } else {
            this.piece = this.getNextPiece();
            // Valid spawn?
            if (!this.board.valid(this.piece)) {
                this.handleGameOver();
            }
        }
    }

    finalizeClear(clearingRowsIndices) {
        // clearingRowsIndices contains Y indices.
        // Logic similar to before: create new grid without those rows.

        let newGrid = this.board.grid.filter((row, index) => !clearingRowsIndices.includes(index));
        // Add new empty rows at top
        while (newGrid.length < ROWS) {
            newGrid.unshift(Array(COLS).fill(0));
        }
        this.board.grid = newGrid;

        // Score Logic
        const lines = clearingRowsIndices.length;
        const lineScores = [0, 40, 100, 300, 1200];
        this.score += Number(lineScores[lines] * (this.level + 1));
        this.lines += lines;

        this.audio.clear();
        this.checkLevel();
        this.updateAccount();

        // Firework Logic
        const duration = 1000 + (lines - 1) * 1000;
        this.fireworkEndTime = Date.now() + duration;

        // Next piece IMMEDIATE
        this.piece = this.getNextPiece();
        if (!this.board.valid(this.piece)) {
            this.handleGameOver();
        }
    }

    handleGameOver() {
        this.gameOver = true;
        this.audio.gameOver();
        this.updateAccount();

        const usernameInput = document.getElementById('username');
        const username = usernameInput && usernameInput.value ? usernameInput.value : `Player ${Date.now()}`;

        saveScore(username, this.score, this.totalTime, this.level);

        setTimeout(() => {
            alert(`Game Over! Score: ${this.score}\nSaved for ${username}.`);
            window.location.href = "ranking.html";
        }, 100);
    }

    // Original clearLines removed/replaced by checkAndStartClear + finalizeClear

    spawnFirework() {
        // Random position
        const x = Math.random() * this.ctx.canvas.width;
        const y = Math.random() * this.ctx.canvas.height / 2; // Top half
        const color = COLORS[Math.floor(Math.random() * (COLORS.length - 1)) + 1];

        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, color, Math.random() * 3 + 1, 40 + Math.random() * 20));
        }
    }

    handleWheel(event) {
        const delta = event.deltaY > 0 ? 50 : -50;
        this.speedManualOffset += delta;
        this.updateSpeed();
        this.updateAccount();
    }

    calculateBaseSpeed() {
        // Simple formula: start at 1000ms, decrease by 50ms per level, min 100ms
        return Math.max(100, 1000 - (this.level * 50));
    }

    updateSpeed() {
        const base = this.calculateBaseSpeed();
        this.time.level = Math.max(50, base + this.speedManualOffset);
    }

    checkLevel() {
        const needed = this.lines; // Simple level = total lines
        if (needed > this.level) {
            this.level = needed;
            this.updateSpeed();
            this.audio.startMusic(this.level);
        }
    }

    updateAccount() {
        const el = (id) => document.getElementById(id);
        // Desktop (if visible, but we hid it)
        if (el('score')) el('score').innerText = this.score;
        if (el('lines')) el('lines').innerText = this.lines;
        if (el('level')) el('level').innerText = this.level;

        // Calc speed %
        let currentMs = 0;
        if (this.time && this.time.level) {
            // Map 1000->0% to 100->100% roughly
            currentMs = Math.min(100, Math.round(((1000 - this.time.level) / 900) * 100));
        }
        if (isNaN(currentMs)) currentMs = 0;

        if (el('speed')) el('speed').innerText = currentMs + "%";
        if (this.audio.currentSongTitle && el('song-title')) {
            el('song-title').innerText = this.audio.currentSongTitle;
        }

        // Mobile / Main Header
        if (el('mob-score')) {
            el('mob-score').innerText = this.score;
            el('mob-lines').innerText = this.lines;
            el('mob-level').innerText = this.level;
            el('mob-speed').innerText = currentMs + "%";
            if (el('mob-song-title')) el('mob-song-title').innerText = this.audio.currentSongTitle || "None";
        }
    }

    getGhostPosition() {
        if (!this.piece) return null;
        let ghost = { ...this.piece };

        while (true) {
            let moved = this.moves[KEY.DOWN](ghost);
            if (!this.board.valid(moved)) {
                break;
            }
            ghost.x = moved.x;
            ghost.y = moved.y;
            ghost.shape = moved.shape;
        }
        return ghost;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.board.draw();

        // Draw Clearing Animations (Overlays) - Ghost blocks removed as per request
        // We only show particles now (handled by drawEffects)

        // Ghost
        const ghost = this.getGhostPosition();
        if (ghost && ghost.y > this.piece.y) {
            this.piece.draw(ghost.x, ghost.y, "rgba(255, 255, 255, 0.3)");
        }

        this.piece.draw();

        this.drawEffects();
    }

    drawEffects() {
        // Particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.update();
            p.draw(this.ctx);
        });

        // Fireworks
        if (Date.now() < this.fireworkEndTime) {
            if (Math.random() < 0.05) { // 5% chance per frame
                this.spawnFirework();
            }
        }
    }

    drawNext() {
        // Clear both desktop (unused) and mobile/header canvases
        if (this.ctxNext) {
            this.ctxNext.clearRect(0, 0, this.ctxNext.canvas.width, this.ctxNext.canvas.height);
        }

        // We mainly care about mobCtxNext now
        if (this.mobCtxNext) {
            // Clear the entire canvas (width 120, height 40)
            // Since we might have translated context previously, reset transform first to be safe? 
            // But here we restore() at end, so it should be clean.
            this.mobCtxNext.clearRect(0, 0, 240, 80); // Clear large area just in case (logical units)

            if (this.nextPieces.length > 0) {
                // Draw 1st piece in left half (0-60px visual -> 0-120 units)
                // Center it: Slot width 120 units.
                let p = this.nextPieces[0];
                let pWidth = p.shape[0].length * BLOCK_SIZE;
                let pHeight = p.shape.length * BLOCK_SIZE;
                // Calc offsets to center in 120x80 area (approx)
                // Note: Canvas height is 40px -> 80 units.
                let offX = (120 - pWidth) / 2 / BLOCK_SIZE;
                let offY = (80 - pHeight) / 2 / BLOCK_SIZE;

                // Simplification: Standard center offset
                // Just use a fixed offset that looks decent for most pieces
                this.renderPieceOnCanvas(this.mobCtxNext, p, 0.5, 0);
            }
            if (this.nextPieces.length > 1) {
                // Draw 2nd piece in right half
                this.mobCtxNext.save();
                // Translate by 120 units (60 pixels)
                this.mobCtxNext.translate(120, 0);

                let p = this.nextPieces[1];
                this.renderPieceOnCanvas(this.mobCtxNext, p, 0.5, 0);
                this.mobCtxNext.restore();
            }
        }
    }

    // Helper to draw piece on a mini canvas
    renderPieceOnCanvas(ctx, piece, offsetX = 0, offsetY = 0) {
        if (!piece) return;
        piece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    drawBlock(ctx, dx + 0.5 + offsetX, dy + 0.5 + offsetY, piece.color);
                }
            });
        });
    }

    // Inputs
    handleClick(e) {
        if (this.isPaused || this.gameOver || !this.piece) return;

        // Simple click to rotate or ghost-drop logic if needed?
        // Original code had specific click zones. Let's keep it simple or minimal.
        // Re-implementing basic click-to-hard-drop logic from legacy if user clicked specific block?
        // The previous legacy logic was complex, mapping click to grid.
        // Retaining simplified version:

        const rect = this.ctx.canvas.getBoundingClientRect();
        const scaleX = this.ctx.canvas.width / rect.width;
        const scaleY = this.ctx.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const gridX = Math.floor(x / BLOCK_SIZE);
        const gridY = Math.floor(y / BLOCK_SIZE);

        // If clicked on ghost?
        const ghost = this.getGhostPosition();
        if (ghost) {
            let clickedGhost = false;
            ghost.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val > 0) {
                        if (ghost.x + dx === gridX && ghost.y + dy === gridY) clickedGhost = true;
                    }
                });
            });
            if (clickedGhost) {
                this.handleInput({ key: KEY.SPACE, preventDefault: () => { } });
                return;
            }
        }

        // Default: Rotate on click
        let p = this.moves[KEY.UP](this.piece);
        if (this.board.valid(p)) {
            this.audio.rotate();
            this.piece.move(p);
        }
    }

    handleMouseMove(e) {
        if (this.isPaused || this.gameOver || !this.piece) return;
        const rect = this.ctx.canvas.getBoundingClientRect();
        const scale = this.ctx.canvas.width / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const gridX = Math.floor(x / BLOCK_SIZE);

        // Ensure midpoint of piece is at mouse
        const width = this.piece.shape[0].length;
        let targetX = gridX - Math.floor(width / 2);

        const p = { ...this.piece, x: targetX };
        if (this.board.valid(p) && this.piece.x !== targetX) {
            this.audio.move();
            this.piece.move(p);
        }
    }

    handleInput(event) {
        if (this.gameOver) {
            if (event.key === 'Enter') this.play();
            return;
        }

        if (event.key === KEY.P || event.key === KEY.ESC) {
            this.togglePause();
            return;
        }

        if (!this.isPaused && this.piece && this.moves[event.key]) {
            event.preventDefault();
            let p = this.moves[event.key](this.piece);

            if (event.key === KEY.SPACE) {
                while (this.board.valid(p)) {
                    this.piece.move(p);
                    p = this.moves[KEY.DOWN](this.piece);
                }
                this.audio.drop();
                this.board.freeze(this.piece);

                // Spawn check 
                if (this.board.grid[0].some(val => val > 0)) {
                    this.handleGameOver();
                    return;
                }

                // check clear instead of direct clear
                this.checkAndStartClear();

            } else {
                if (this.board.valid(p)) {
                    if (event.key === KEY.UP) this.audio.rotate();
                    else if ([KEY.LEFT, KEY.RIGHT, KEY.DOWN].includes(event.key)) this.audio.move();

                    this.piece.move(p);
                }
            }
        }
    }

    moves = {
        [KEY.LEFT]: p => ({ ...p, x: p.x - 1 }),
        [KEY.RIGHT]: p => ({ ...p, x: p.x + 1 }),
        [KEY.DOWN]: p => ({ ...p, y: p.y + 1 }),
        [KEY.UP]: p => this.board.rotate(p),
        [KEY.SPACE]: p => ({ ...p, y: p.y + 1 })
    };

    handleTouchStart(e) {
        if (this.isPaused || this.gameOver || !this.piece) return;
        e.preventDefault();
        this.touchFingerCount = e.touches.length;
        const touch = e.changedTouches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
    }

    handleTouchEnd(e) {
        if (this.isPaused || this.gameOver || !this.piece) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - this.touchStartX;
        const diffY = touch.clientY - this.touchStartY;
        const timeDiff = Date.now() - this.touchStartTime;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        const speedFactor = this.touchFingerCount >= 2 ? 4 : 1;

        // Tap (Rotate)
        if (timeDiff < 300 && absX < 10 && absY < 10) {
            let p = this.moves[KEY.UP](this.piece);
            if (this.board.valid(p)) {
                this.audio.rotate();
                this.piece.move(p);
            }
            return;
        }

        // Swipe
        if (absX > absY) {
            // Horizontal
            if (absX > 30) {
                const dir = diffX > 0 ? KEY.RIGHT : KEY.LEFT;
                this.audio.move();
                for (let i = 0; i < speedFactor; i++) {
                    let p = this.moves[dir](this.piece);
                    if (this.board.valid(p)) this.piece.move(p);
                    else break;
                }
            }
        } else {
            // Vertical
            if (absY > 30) {
                if (diffY > 0) {
                    // Down
                    this.audio.move();
                    for (let i = 0; i < speedFactor; i++) {
                        let p = this.moves[KEY.DOWN](this.piece);
                        if (this.board.valid(p)) {
                            this.piece.move(p);
                            this.score += 1; // Soft drop points
                        } else break;
                    }
                    this.updateAccount();
                } else {
                    // Up (Hard Drop)
                    this.handleInput({ key: KEY.SPACE, preventDefault: () => { } });
                }
            }
        }
    }
}

// Initial Setup
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
ctx.scale(1, 1);

// Interaction Bindings
// Wrap in closure or just use instance
// Need to defer instance creation until we have stats
// Next board
const canvasNext = document.getElementById('next'); // Desktop one (hidden but good to have context)
const ctxNext = canvasNext ? canvasNext.getContext('2d') : null;
if (ctxNext) {
    ctxNext.scale(1, 1);
}

// Mob next
const mobNext = document.getElementById('mob-next');
const mobCtxNext = mobNext ? mobNext.getContext('2d') : null;
if (mobCtxNext) {
    mobCtxNext.scale(0.5, 0.5); // Smaller scale for header
}

const game = new Game(ctx, ctxNext, mobCtxNext);

canvas.addEventListener('click', e => { game.handleClick(e); e.preventDefault(); });
canvas.addEventListener('mousemove', e => { game.handleMouseMove(e); });
canvas.addEventListener('touchstart', e => { game.handleTouchStart(e); }, { passive: false });
canvas.addEventListener('touchend', e => { game.handleTouchEnd(e); }, { passive: false });

document.addEventListener('keydown', e => { game.handleInput(e); });
document.addEventListener('wheel', e => { game.handleWheel(e); }, { passive: true });

// UI Buttons
const playBtn = document.getElementById('play-btn');
if (playBtn) playBtn.addEventListener('click', () => { game.play(); playBtn.blur(); window.focus(); });

const pauseBtn = document.getElementById('pause-btn');
if (pauseBtn) {
    pauseBtn.classList.remove('paused');
    pauseBtn.addEventListener('click', () => { game.togglePause(); pauseBtn.blur(); });
}

// Mobile specific / Menu controls
const mobMenuBtn = document.getElementById('mob-menu-btn');
if (mobMenuBtn) {
    const overlay = document.getElementById('mob-menu-overlay');
    const close = document.getElementById('mob-menu-close');

    mobMenuBtn.addEventListener('click', () => {
        overlay.style.display = 'flex';
        // Auto pause on menu open?
        if (!game.isPaused && !game.gameOver) game.togglePause();
    });

    close.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (game.isPaused) game.togglePause();
    });

    const mobPlay = document.getElementById('mob-play-btn');
    if (mobPlay) mobPlay.addEventListener('click', () => {
        const usernameInput = document.getElementById('username');
        if (!usernameInput.value || usernameInput.value.startsWith('Player ')) {
            overlay.style.display = 'none';
            showNameDialog();
        } else {
            game.play();
            overlay.style.display = 'none';
        }
    });

    const mobPause = document.getElementById('mob-pause-btn');
    if (mobPause) mobPause.addEventListener('click', () => {
        game.togglePause();
    });

    const mobRestart = document.getElementById('mob-restart-btn');
    if (mobRestart) mobRestart.addEventListener('click', () => {
        const usernameInput = document.getElementById('username');
        if (!usernameInput.value || usernameInput.value.startsWith('Player ')) {
            showNameDialog();
        } else {
            if (confirm("Restart Game?")) {
                game.play();
                mobRestart.blur();
            }
        }
    });

    const mobMute = document.getElementById('mob-mute-btn');
    if (mobMute) {
        const icon = document.getElementById('mob-mute-icon');
        mobMute.addEventListener('click', () => {
            const muted = game.audio.toggleMute();
            if (muted) {
                icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
            } else {
                icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
            }
            mobMute.blur();
        });
    }
}

// Name Flow Functions
function showNameDialog() {
    const dialog = document.getElementById('name-dialog');
    dialog.classList.remove('hidden');
    document.getElementById('username').focus();
}

function hideNameDialog() {
    const dialog = document.getElementById('name-dialog');
    dialog.classList.add('hidden');
}

// Name Sync & Initialization
const usernameInput = document.getElementById('username');
const mobUser = document.getElementById('mob-username');
const startGameBtn = document.getElementById('start-game-btn');

// Load stored name
const storedName = localStorage.getItem('tetris_username');
if (storedName) {
    if (usernameInput) usernameInput.value = storedName;
    if (mobUser) mobUser.value = storedName;
} else if (usernameInput) {
    usernameInput.value = "";
    if (mobUser) mobUser.value = "";
}

// Sync inputs
if (usernameInput && mobUser) {
    usernameInput.addEventListener('input', (e) => {
        mobUser.value = e.target.value;
        localStorage.setItem('tetris_username', e.target.value);
    });
    mobUser.addEventListener('input', (e) => {
        usernameInput.value = e.target.value;
        localStorage.setItem('tetris_username', e.target.value);
    });
}

// Start Game from Dialog
if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            localStorage.setItem('tetris_username', name);
            hideNameDialog();
            game.play();
        } else {
            alert("Please enter a name!");
        }
    });
}

