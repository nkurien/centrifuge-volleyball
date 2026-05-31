// Game class — orchestrates the game loop, rendering, and input.
// Uses requestAnimationFrame with dynamic timestep (replacing the old setTimeout).
// Supports restart on game over via click or keypress.

import {
    CYLINDER_RADIUS,
    CYLINDER_ANG_VELOCITY,
    CYLINDER_CAM_ANG_VELOCITY,
    CYLINDER_EDGE_WIDTH,
    WIN_SCORE,
    CANVAS_SIZE,
    HALF_CANVAS,
    STAR_COUNT,
    PALETTE,
} from './config.js';
import { Player } from './Player.js';
import { Ball } from './Ball.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('canv');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        this.initState();
        this.menuButtons = [];
        if (this.isTouchDevice) {
            this.menuState = 'mode-select';
        }
        this.createObjects();
        this.setupInput();

        // Center coordinate system
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Start game loop
        this.lastFrameTime = 0;
        requestAnimationFrame((t) => this.timer(t));
    }

    initState() {
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = CYLINDER_ANG_VELOCITY;
        this.camAngVelocity = CYLINDER_CAM_ANG_VELOCITY;
        this.gameStarted = false;
        this.gameEnded = false;
        this.winner = -1;
        this.gameScore = WIN_SCORE;
        this.num = 1150; // Frame counter — starts here to sync camera behaviour
        this.startTime = null;
        this.highPerformance = true;
        this.menuState = null;
        if (this.isSinglePlayer === undefined) {
            this.isSinglePlayer = false;
        }
        if (this.aiDifficulty === undefined) {
            this.aiDifficulty = 'medium';
        }
    }

    createObjects() {
        this.player1 = new Player(this, 1);
        this.player2 = new Player(this, 2, this.isSinglePlayer, this.aiDifficulty);
        this.ball = new Ball(this);
        this.setFractions();

        this.stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            this.stars[i] = {
                x: Math.random() * CANVAS_SIZE - HALF_CANVAS,
                y: Math.random() * CANVAS_SIZE - HALF_CANVAS,
            };
        }
    }

    // ── Input ────────────────────────────────────────────────

    setupInput() {
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        this.canvas.addEventListener('click', (e) => {
            if (this.isTouchDevice) {
                this.handleCanvasClick(e);
                return;
            }
            // Desktop: click starts/restarts as 2P
            if (!this.gameStarted && !this.menuState) {
                this.isSinglePlayer = false;
                this.gameStarted = true;
                this.updateDifficultyUI();
                return;
            }
            if (this.gameEnded) {
                this.isSinglePlayer = false;
                this.restart(true);
                this.updateDifficultyUI();
            }
        });

        if (window.matchMedia('(pointer: coarse)').matches) {
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        document.querySelectorAll('.touch-btn').forEach((btn) => {
            const playerNum = btn.dataset.player;
            const action = btn.dataset.action;

            btn.addEventListener(
                'touchstart',
                (e) => {
                    e.preventDefault();
                    if (!this.gameStarted || this.gameEnded) return;

                    const player = playerNum === '1' ? this.player1 : this.player2;
                    if (action === 'jump') player.jump();
                    else if (action === 'left') player.keyLeftPressed = true;
                    else if (action === 'right') player.keyRightPressed = true;
                },
                { passive: false },
            );

            const release = (e) => {
                e.preventDefault();
                const player = playerNum === '1' ? this.player1 : this.player2;
                if (action === 'left') player.keyLeftPressed = false;
                if (action === 'right') player.keyRightPressed = false;
            };

            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('touchcancel', release, { passive: false });
        });
    }

    onKeyDown(e) {
        const code = e.code;
        const key = e.key;

        if (this.menuState === 'difficulty-select') {
            let selectedDiff = null;
            if (code === 'Digit1') selectedDiff = 'easy';
            if (code === 'Digit2') selectedDiff = 'medium';
            if (code === 'Digit3') selectedDiff = 'hard';

            if (selectedDiff) {
                this.aiDifficulty = selectedDiff;
                this.isSinglePlayer = true;
                this.player2 = new Player(this, 2, true, selectedDiff);
                this.setFractions();
                this.menuState = null;
                this.gameStarted = true;
                this.updateDifficultyUI();
            } else if (key === 'Escape' || key === 'escape') {
                this.menuState = null;
            }
            return;
        }

        if (!this.gameStarted) {
            if (key === 's' || key === 'S') {
                this.menuState = 'difficulty-select';
            } else {
                this.isSinglePlayer = false;
                this.gameStarted = true;
                this.updateDifficultyUI();
            }
            return;
        }
        if (this.gameEnded) {
            if (key === 's' || key === 'S') {
                this.isSinglePlayer = true;
                this.restart(false);
                this.menuState = 'difficulty-select';
            } else {
                this.isSinglePlayer = false;
                this.restart(true);
                this.updateDifficultyUI();
            }
            return;
        }

        if (this.isSinglePlayer) {
            if (e.key === '1') {
                this.aiDifficulty = 'easy';
                this.player2.setDifficulty('easy');
                document.getElementById('ai-difficulty').textContent = 'EASY';
                document.getElementById('ai-difficulty').style.color = '#2979ff';
            } else if (e.key === '2') {
                this.aiDifficulty = 'medium';
                this.player2.setDifficulty('medium');
                document.getElementById('ai-difficulty').textContent = 'MEDIUM';
                document.getElementById('ai-difficulty').style.color = '#ffb300';
            } else if (e.key === '3') {
                this.aiDifficulty = 'hard';
                this.player2.setDifficulty('hard');
                document.getElementById('ai-difficulty').textContent = 'HARD';
                document.getElementById('ai-difficulty').style.color = '#e6283c';
            }
        }

        // Player 1
        if (code === this.player1.keyLeft) this.player1.keyLeftPressed = true;
        if (code === this.player1.keyRight) this.player1.keyRightPressed = true;
        if (code === this.player1.keyJump && this.player1.grounded) this.player1.jump();

        // Player 2
        if (code === this.player2.keyLeft) this.player2.keyLeftPressed = true;
        if (code === this.player2.keyRight) this.player2.keyRightPressed = true;
        if (code === this.player2.keyJump && this.player2.grounded) this.player2.jump();
    }

    onKeyUp(e) {
        const code = e.code;

        if (code === this.player1.keyLeft) this.player1.keyLeftPressed = false;
        if (code === this.player1.keyRight) this.player1.keyRightPressed = false;

        if (code === this.player2.keyLeft) this.player2.keyLeftPressed = false;
        if (code === this.player2.keyRight) this.player2.keyRightPressed = false;
    }

    updateDifficultyUI() {
        const diffEls = document.querySelectorAll('.diff-ui');
        if (!this.isSinglePlayer) {
            diffEls.forEach((el) => (el.style.display = 'none'));
            if (this.isTouchDevice) {
                document.getElementById('touch-p2').style.display = 'flex';
            }
            return;
        }

        diffEls.forEach((el) => {
            if (el.classList.contains('controls-divider')) {
                el.style.display = 'block';
            } else {
                el.style.display = 'flex';
            }
        });

        if (this.isTouchDevice) {
            document.getElementById('touch-p2').style.display = 'none';
        }

        const diffText = document.getElementById('ai-difficulty');
        if (diffText && this.player2) {
            const diff = this.player2.difficulty;
            diffText.textContent = diff;
            if (diff === 'easy') {
                diffText.style.color = '#2979ff'; // blue
            } else if (diff === 'medium') {
                diffText.style.color = '#ffd54f'; // yellow
            } else if (diff === 'hard') {
                diffText.style.color = '#ff4d4f'; // red
            }
        }
    }

    // ── Scoring ──────────────────────────────────────────────

    setFractions() {
        let total = 0;
        const players = [this.player1, this.player2];

        for (const p of players) {
            p.hScore = Math.max(p.score, 1);
            p.hScore = 1 / p.hScore;
            total += p.hScore;
        }

        for (const p of players) {
            p.targetTargetFraction = p.hScore / total;
        }
    }

    // ── Game loop ────────────────────────────────────────────
    // rAF for vsync alignment, throttled to ~30ms per step.
    // Physics + render always happen together (never decoupled),
    // matching the original's one-step-per-frame model.

    timer(timestamp) {
        requestAnimationFrame((t) => this.timer(t));

        // Throttle: skip this frame if <28ms since last step.
        // At 60fps (~16.7ms) this fires every 2nd frame = ~33ms.
        // At 120fps (~8.3ms) this fires every 4th frame = ~33ms.
        if (timestamp - this.lastFrameTime < 28) return;
        this.lastFrameTime = timestamp;

        this.menuButtons = [];

        if (!this.gameStarted) {
            this.renderStartScreen();
            return;
        }
        if (!this.gameEnded) {
            this.update();
        }
        this.render();
    }

    update() {
        // Rotate cylinder and camera
        this.cylinderAngle += this.angVelocity;
        this.camAngle += this.camAngVelocity;

        // Camera acceleration/deceleration cycle (same as original)
        this.num++;
        const m = this.num % 2300;
        if (m >= 1000 && m < 1150) {
            this.camAngVelocity += this.angVelocity / 150;
        } else if (m >= 2150 && m < 2300) {
            this.camAngVelocity -= this.angVelocity / 150;
        }

        // FPS counter (every 20 frames)
        if (this.num % 20 === 0) {
            const now = new Date();
            if (this.startTime) {
                const framerate = 20 / ((now.getTime() - this.startTime.getTime()) / 1000);
                const el = document.getElementById('fps');
                if (el) el.textContent = Math.round(framerate);
                if (framerate < 29) this.highPerformance = false;
            }
            this.startTime = now;
        }

        // Update entities
        this.player1.update();
        this.player2.update();
        this.ball.update();
    }

    // ── Rendering ────────────────────────────────────────────

    render() {
        const ctx = this.ctx;

        // Rotate canvas with camera
        if (this.camAngVelocity !== 0) {
            ctx.rotate(-this.camAngVelocity);
        }

        // Clear with motion blur (or hard clear on low-perf)
        if (this.highPerformance) {
            ctx.fillStyle = 'rgba(29,30,32,0.5)';
            ctx.fillRect(-HALF_CANVAS, -HALF_CANVAS, CANVAS_SIZE, CANVAS_SIZE);
        } else {
            ctx.clearRect(-HALF_CANVAS, -HALF_CANVAS, CANVAS_SIZE, CANVAS_SIZE);
        }

        // Stars
        ctx.beginPath();
        ctx.strokeStyle = PALETTE.STAR;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < STAR_COUNT; i++) {
            ctx.moveTo(this.stars[i].x, this.stars[i].y);
            ctx.lineTo(this.stars[i].x + 1, this.stars[i].y + 1);
        }
        ctx.stroke();

        // Territories
        this.drawTerritories(ctx);

        // Entities
        this.ball.draw(ctx);
        this.player1.draw(ctx);
        this.player2.draw(ctx);

        // Game over overlay
        if (this.gameEnded) {
            this.drawGameOver(ctx);
        }
    }

    drawTerritories(ctx) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;

        let angle = this.cylinderAngle + Math.PI - this.player1.fraction * Math.PI;
        const opacity = this.highPerformance ? 0.07 : 0.12;

        // Player 1 territory
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            CYLINDER_RADIUS + 4,
            angle,
            angle + this.player1.fraction * 2 * Math.PI,
            false,
        );
        ctx.fillStyle = `rgba(${this.player1.r},${this.player1.g},${this.player1.b},${opacity})`;
        ctx.fill();
        ctx.stroke();

        // Player 2 territory
        angle += this.player1.fraction * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            CYLINDER_RADIUS + 4,
            angle,
            angle + this.player2.fraction * 2 * Math.PI,
            false,
        );
        ctx.fillStyle = `rgba(${this.player2.r},${this.player2.g},${this.player2.b},${opacity})`;
        ctx.fill();
        ctx.stroke();

        // Cylinder outline — thin, subtle glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, CYLINDER_RADIUS + 4, 0, 2 * Math.PI, false);
        ctx.strokeStyle = '#525252';
        ctx.lineWidth = CYLINDER_EDGE_WIDTH;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(82,82,82,0.6)';
        ctx.stroke();
        ctx.restore();
    }

    drawGameOver(ctx) {
        // Reset accumulated rotation so the overlay sits upright
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        const w = 300;
        const h = this.isTouchDevice ? 140 : 96;
        const x = -w / 2;
        const y = -h / 2;

        // Card
        ctx.fillStyle = PALETTE.SURFACE;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        ctx.strokeStyle = PALETTE.BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Winner text with player-color glow
        const winnerGlow = this.winner === 1 ? 'rgba(255,107,43,0.55)' : 'rgba(41,121,255,0.55)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT;
        ctx.shadowBlur = 18;
        ctx.shadowColor = winnerGlow;
        const titleY = this.isTouchDevice ? -24 : -8;
        ctx.fillText(`Player ${this.winner} wins`, 0, titleY);
        ctx.shadowBlur = 0;

        if (this.isTouchDevice) {
            // Touch: "Play Again" and "Menu" buttons
            const btnW = 120;
            const btnH = 38;
            const btnY = 10;
            const gap = 12;
            this.drawMenuButton(ctx, -btnW - gap / 2, btnY, btnW, btnH, 'Play Again', 'play-again');
            this.drawMenuButton(ctx, gap / 2, btnY, btnW, btnH, 'Menu', 'go-menu');
        } else {
            // Desktop: keyboard prompt
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillStyle = PALETTE.TEXT_MUTED;
            ctx.fillText("press 's' for 1P, any other key for 2P", 0, 28);
        }

        ctx.restore();
    }

    // ── Start screen ─────────────────────────────────────────

    renderStartScreen() {
        const ctx = this.ctx;

        // Slowly drift the camera so the starfield feels alive
        this.camAngle += this.camAngVelocity * 0.4;
        ctx.rotate(-this.camAngVelocity * 0.4);

        ctx.fillStyle = 'rgba(29,30,32,0.35)';
        ctx.fillRect(-HALF_CANVAS, -HALF_CANVAS, CANVAS_SIZE, CANVAS_SIZE);

        ctx.beginPath();
        ctx.strokeStyle = PALETTE.STAR;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < STAR_COUNT; i++) {
            ctx.moveTo(this.stars[i].x, this.stars[i].y);
            ctx.lineTo(this.stars[i].x + 1, this.stars[i].y + 1);
        }
        ctx.stroke();

        if (this.isTouchDevice && this.menuState === 'mode-select') {
            this.drawModeSelectCard(ctx);
        } else if (this.isTouchDevice && this.menuState === 'difficulty-select') {
            this.drawDifficultySelectCard(ctx);
        } else {
            this.drawStartCard(ctx);
        }
    }

    drawStartCard(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        const w = 280,
            h = 44;

        ctx.fillStyle = PALETTE.SURFACE;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();

        ctx.strokeStyle = PALETTE.BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT_MUTED;
        let prompt = this.isTouchDevice ? 'tap to start' : "press 's' for 1P, any other key for 2P";
        if (this.menuState === 'difficulty-select') {
            prompt = "Select AI: 1 (Easy), 2 (Med), 3 (Hard)";
            ctx.fillStyle = '#dadadb'; // Make it pop more when waiting
        }
        ctx.fillText(prompt, 0, 6);

        ctx.restore();
    }

    // ── Canvas Menu Rendering ────────────────────────────────

    drawMenuButton(ctx, x, y, w, h, label, action, options = {}) {
        ctx.fillStyle = options.bgColor || '#3a3a42';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();

        ctx.strokeStyle = options.borderColor || '#4a4a52';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = options.textColor || PALETTE.TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = options.font || 'bold 14px system-ui, sans-serif';
        ctx.fillText(label, x + w / 2, y + h / 2);

        this.menuButtons.push({ x, y, w, h, action });
    }

    drawModeSelectCard(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        const w = 250, h = 170;
        const x = -w / 2, y = -h / 2;

        // Card
        ctx.fillStyle = PALETTE.SURFACE;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = PALETTE.BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 17px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT;
        ctx.fillText('Centrifuge Volleyball', 0, y + 36);

        // Subtitle
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT_MUTED;
        ctx.fillText('First to 25, win by 2', 0, y + 54);

        // Buttons
        const btnW = 210, btnH = 38;
        const btnX = -btnW / 2;
        this.drawMenuButton(ctx, btnX, y + 70, btnW, btnH, '1 Player', 'select-1p');
        this.drawMenuButton(ctx, btnX, y + 70 + btnH + 10, btnW, btnH, '2 Player', 'select-2p');

        ctx.restore();
    }

    drawDifficultySelectCard(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, this.canvas.width / 2, this.canvas.height / 2);

        const w = 250, h = 240;
        const x = -w / 2, y = -h / 2;

        // Card
        ctx.fillStyle = PALETTE.SURFACE;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = PALETTE.BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 17px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT;
        ctx.fillText('Select Difficulty', 0, y + 36);

        // Difficulty buttons
        const btnW = 210, btnH = 38;
        const btnX = -btnW / 2;
        const startY = y + 54;
        const gap = 8;

        this.drawMenuButton(ctx, btnX, startY, btnW, btnH, 'Easy', 'select-easy', {
            textColor: '#2979ff',
            borderColor: 'rgba(41,121,255,0.3)',
        });
        this.drawMenuButton(ctx, btnX, startY + btnH + gap, btnW, btnH, 'Medium', 'select-medium', {
            textColor: '#ffb300',
            borderColor: 'rgba(255,179,0,0.3)',
        });
        this.drawMenuButton(ctx, btnX, startY + 2 * (btnH + gap), btnW, btnH, 'Hard', 'select-hard', {
            textColor: '#e6283c',
            borderColor: 'rgba(230,40,60,0.3)',
        });

        // Back link
        ctx.fillStyle = PALETTE.TEXT_MUTED;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const backY = startY + 3 * (btnH + gap) + 12;
        ctx.fillText('\u2190 Back', 0, backY);
        this.menuButtons.push({ x: -40, y: backY - 10, w: 80, h: 20, action: 'back' });

        ctx.restore();
    }

    // ── Canvas Menu Input ────────────────────────────────────

    handleCanvasClick(e) {
        if (this.menuButtons.length === 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX - this.canvas.width / 2;
        const cy = (e.clientY - rect.top) * scaleY - this.canvas.height / 2;

        for (const btn of this.menuButtons) {
            if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                this.onMenuAction(btn.action);
                return;
            }
        }
    }

    onMenuAction(action) {
        switch (action) {
            case 'select-2p':
                this.isSinglePlayer = false;
                this.menuState = null;
                this.gameStarted = true;
                this.updateDifficultyUI();
                break;
            case 'select-1p':
                this.menuState = 'difficulty-select';
                break;
            case 'select-easy':
            case 'select-medium':
            case 'select-hard': {
                const diff = action.replace('select-', '');
                this.aiDifficulty = diff;
                this.isSinglePlayer = true;
                this.player2 = new Player(this, 2, true, diff);
                this.setFractions();
                this.menuState = null;
                this.gameStarted = true;
                this.updateDifficultyUI();
                break;
            }
            case 'back':
                this.menuState = 'mode-select';
                break;
            case 'play-again':
                this.restart(true);
                this.updateDifficultyUI();
                break;
            case 'go-menu':
                this.isSinglePlayer = false;
                this.aiDifficulty = 'medium';
                this.restart(false);
                this.menuState = 'mode-select';
                break;
        }
    }

    // ── Restart ──────────────────────────────────────────────

    /**
     * Resets the game state and optionally starts the game loop.
     * @param {boolean} startGame - If true, transitions to 'playing' state immediately. If false, transitions to 'waiting' state.
     */
    restart(startGame = true) {
        // Reset transform to identity, then re-center
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        this.initState();
        this.gameStarted = startGame;
        this.createObjects();
        this.lastFrameTime = 0;
        // rAF loop is already running, no need to restart it
    }
}

// Start the game when the page loads
window.onload = () => new Game();
