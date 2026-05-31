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
        this.waitingForDifficulty = false;
        if (this.isSinglePlayer === undefined) {
            this.isSinglePlayer = false;
        }
    }

    createObjects() {
        this.player1 = new Player(this, 1);
        this.player2 = new Player(this, 2, this.isSinglePlayer, 'medium');
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
        this.mobileMenu = document.getElementById('mobile-menu');
        this.mobileDifficultyMenu = document.getElementById('mobile-difficulty-menu');

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        this.canvas.addEventListener('click', () => {
            if (this.isTouchDevice) return; // Handled by mobile HTML menus

            if (!this.gameStarted) {
                this.isSinglePlayer = false;
                this.waitingForDifficulty = false;
                this.gameStarted = true;
                this.updateDifficultyUI();
                return;
            }
            if (this.gameEnded) {
                this.isSinglePlayer = false;
                this.waitingForDifficulty = false;
                this.restart(true);
                this.updateDifficultyUI();
            }
        });

        if (window.matchMedia('(pointer: coarse)').matches) {
            this.setupTouchControls();
            this.setupMobileMenus();
            this.showMobileMenu();
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

    setupMobileMenus() {
        const btn2p = document.getElementById('btn-2p');
        const btn1p = document.getElementById('btn-1p');
        const btnEasy = document.getElementById('btn-easy');
        const btnMedium = document.getElementById('btn-medium');
        const btnHard = document.getElementById('btn-hard');
        const btnBack = document.getElementById('btn-back');
        
        const startGameFlow = () => {
            this.waitingForDifficulty = false;
            if (this.gameEnded) {
                this.restart(true);
            } else {
                this.gameStarted = true;
            }
            this.updateDifficultyUI();
        };

        const handle2P = (e) => {
            e.preventDefault();
            this.mobileMenu.style.display = 'none';
            this.isSinglePlayer = false;
            startGameFlow();
        };
        
        const handle1P = (e) => {
            e.preventDefault();
            this.mobileMenu.style.display = 'none';
            this.mobileDifficultyMenu.style.display = 'flex';
        };
        
        const handleBack = (e) => {
            e.preventDefault();
            this.mobileDifficultyMenu.style.display = 'none';
            this.mobileMenu.style.display = 'flex';
        };
        
        const handleDifficulty = (diff) => {
            return (e) => {
                e.preventDefault();
                this.mobileDifficultyMenu.style.display = 'none';
                this.isSinglePlayer = true;
                this.player2 = new Player(this, 2, true, diff);
                this.setFractions();
                startGameFlow();
            };
        };
        
        // Use pointerdown to handle both mouse and touch, avoiding double-firing
        // from binding both touchstart and click.
        btn2p.addEventListener('pointerdown', handle2P);
        btn1p.addEventListener('pointerdown', handle1P);
        btnBack.addEventListener('pointerdown', handleBack);
        
        btnEasy.addEventListener('pointerdown', handleDifficulty('easy'));
        btnMedium.addEventListener('pointerdown', handleDifficulty('medium'));
        btnHard.addEventListener('pointerdown', handleDifficulty('hard'));
    }

    showMobileMenu() {
        if (this.isTouchDevice) {
            this.mobileMenu.style.display = 'flex';
            this.mobileDifficultyMenu.style.display = 'none';
        }
    }

    onKeyDown(e) {
        const code = e.code;
        const key = e.key;

        if (this.waitingForDifficulty) {
            let selectedDiff = null;
            if (code === 'Digit1') selectedDiff = 'easy';
            if (code === 'Digit2') selectedDiff = 'medium';
            if (code === 'Digit3') selectedDiff = 'hard';

            if (selectedDiff) {
                this.isSinglePlayer = true;
                this.player2 = new Player(this, 2, true, selectedDiff);
                this.setFractions();
                this.waitingForDifficulty = false;
                this.gameStarted = true;
                this.updateDifficultyUI();
            } else if (key === 'Escape' || key === 'escape') {
                this.waitingForDifficulty = false;
            }
            return;
        }

        if (!this.gameStarted) {
            if (key === 's' || key === 'S') {
                this.waitingForDifficulty = true;
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
                this.waitingForDifficulty = true;
            } else {
                this.isSinglePlayer = false;
                this.restart(true);
                this.updateDifficultyUI();
            }
            return;
        }

        if (this.isSinglePlayer) {
            if (e.key === '1') {
                this.player2.setDifficulty('easy');
                document.getElementById('ai-difficulty').textContent = 'EASY';
                document.getElementById('ai-difficulty').style.color = '#2979ff';
            } else if (e.key === '2') {
                this.player2.setDifficulty('medium');
                document.getElementById('ai-difficulty').textContent = 'MEDIUM';
                document.getElementById('ai-difficulty').style.color = '#ffb300';
            } else if (e.key === '3') {
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

        const w = 300,
            h = 96;
        const x = -w / 2,
            y = -h / 2;

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
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT;
        ctx.shadowBlur = 18;
        ctx.shadowColor = winnerGlow;
        ctx.fillText(`Player ${this.winner} wins`, 0, -8);
        ctx.shadowBlur = 0;

        // Subtitle
        if (!this.isTouchDevice) {
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillStyle = PALETTE.TEXT_MUTED;
            const prompt = "press 's' for 1P, any other key for 2P";
            ctx.fillText(prompt, 0, 28);
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

        this.drawStartCard(ctx);
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
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT_MUTED;
        let prompt = this.isTouchDevice ? 'tap to start' : "press 's' for 1P, any other key for 2P";
        if (this.waitingForDifficulty) {
            prompt = "Select AI: 1 (Easy), 2 (Med), 3 (Hard)";
            ctx.fillStyle = '#dadadb'; // Make it pop more when waiting
        }
        ctx.fillText(prompt, 0, 6);

        ctx.restore();
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
