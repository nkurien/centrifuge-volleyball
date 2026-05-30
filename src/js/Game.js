// Game class — orchestrates the game loop, rendering, and input.
// Uses requestAnimationFrame with dynamic timestep (replacing the old setTimeout).
// Supports restart on game over via click or keypress.

import {
    CYLINDER_RADIUS, CYLINDER_ANG_VELOCITY, CYLINDER_CAM_ANG_VELOCITY,
    CYLINDER_EDGE_WIDTH, WIN_SCORE,
    CANVAS_SIZE, HALF_CANVAS, STAR_COUNT,
    CONTROLS, PALETTE,
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
    }

    createObjects() {
        this.player1 = new Player(this, 1);
        this.player2 = new Player(this, 2);
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
        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) { this.gameStarted = true; return; }
            if (this.gameEnded) this.restart();
        });

        if (window.matchMedia('(pointer: coarse)').matches) {
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        document.querySelectorAll('.touch-btn').forEach(btn => {
            const playerNum = btn.dataset.player;
            const action = btn.dataset.action;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.gameStarted) { this.gameStarted = true; return; }
                if (this.gameEnded) { this.restart(); return; }
                const player = playerNum === '1' ? this.player1 : this.player2;
                if (action === 'jump') player.jump();
                else if (action === 'left') player.keyLeftPressed = true;
                else if (action === 'right') player.keyRightPressed = true;
            }, { passive: false });

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
        if (!this.gameStarted) {
            this.gameStarted = true;
            return;
        }
        if (this.gameEnded) {
            this.restart();
            return;
        }

        const code = e.code;

        // Player 1
        if (code === this.player1.keyLeft)  this.player1.keyLeftPressed = true;
        if (code === this.player1.keyRight) this.player1.keyRightPressed = true;
        if (code === this.player1.keyJump && this.player1.grounded) this.player1.jump();

        // Player 2
        if (code === this.player2.keyLeft)  this.player2.keyLeftPressed = true;
        if (code === this.player2.keyRight) this.player2.keyRightPressed = true;
        if (code === this.player2.keyJump && this.player2.grounded) this.player2.jump();
    }

    onKeyUp(e) {
        const code = e.code;

        if (code === this.player1.keyLeft)  this.player1.keyLeftPressed = false;
        if (code === this.player1.keyRight) this.player1.keyRightPressed = false;

        if (code === this.player2.keyLeft)  this.player2.keyLeftPressed = false;
        if (code === this.player2.keyRight) this.player2.keyRightPressed = false;
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
        ctx.arc(0, 0, CYLINDER_RADIUS + 4, angle,
            angle + this.player1.fraction * 2 * Math.PI, false);
        ctx.fillStyle = `rgba(${this.player1.r},${this.player1.g},${this.player1.b},${opacity})`;
        ctx.fill();
        ctx.stroke();

        // Player 2 territory
        angle += this.player1.fraction * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, CYLINDER_RADIUS + 4, angle,
            angle + this.player2.fraction * 2 * Math.PI, false);
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

        const w = 300, h = 96;
        const x = -w / 2, y = -h / 2;

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
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = PALETTE.TEXT_MUTED;
        ctx.fillText('press any key or click to restart', 0, 28);

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

        const w = 280, h = 44;

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
        const prompt = this.isTouchDevice ? 'tap to start' : 'press any key or click to start';
        ctx.fillText(prompt, 0, 6);

        ctx.restore();
    }

    // ── Restart ──────────────────────────────────────────────

    restart() {
        // Reset transform to identity, then re-center
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        this.initState();
        this.gameStarted = true;
        this.createObjects();
        this.lastFrameTime = 0;
        // rAF loop is already running, no need to restart it
    }
}

// Start the game when the page loads
window.onload = () => new Game();
