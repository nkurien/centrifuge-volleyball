// Game class — orchestrates the game loop, rendering, and input.
// Uses requestAnimationFrame with dynamic timestep (replacing the old setTimeout).
// Supports restart on game over via click or keypress.

import {
    CYLINDER_RADIUS, CYLINDER_ANG_VELOCITY, CYLINDER_CAM_ANG_VELOCITY,
    CYLINDER_EDGE_WIDTH, WIN_SCORE,
    CANVAS_SIZE, HALF_CANVAS, STAR_COUNT,
    CONTROLS,
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
        this.initState();
        this.createObjects();
        this.setupInput();

        // Center coordinate system
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Start loop
        this.lastTimestamp = null;
        this.scheduleFrame();
    }

    initState() {
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = CYLINDER_ANG_VELOCITY;
        this.camAngVelocity = CYLINDER_CAM_ANG_VELOCITY;
        this.gameStarted = true;
        this.gameEnded = false;
        this.winner = -1;
        this.gameScore = WIN_SCORE;
        this.num = 1150; // Frame counter — starts here to sync camera behaviour
        this.startTime = null;
        this.highPerformance = true;

        // Fixed-timestep: original used setTimeout(30 - computeTime, min 17)
        this.PHYSICS_STEP = 30; // ms per physics tick
        this.accumulator = 0;
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
            if (this.gameEnded) this.restart();
        });
    }

    onKeyDown(e) {
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

    scheduleFrame() {
        requestAnimationFrame((ts) => this.tick(ts));
    }

    tick(timestamp) {
        this.scheduleFrame();

        if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
        const elapsed = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // Fixed-timestep accumulator: the original game's physics constants
        // (angVelocity=0.02, ball speed=2, etc.) were all tuned for ~30ms
        // per step (setTimeout(30 - computeTime)). We accumulate real time
        // and step physics in 30ms chunks to match that feel exactly,
        // regardless of the display's refresh rate.
        this.accumulator += elapsed;

        while (this.accumulator >= this.PHYSICS_STEP) {
            if (!this.gameEnded) {
                this.update();
            }
            this.accumulator -= this.PHYSICS_STEP;
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
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-HALF_CANVAS, -HALF_CANVAS, CANVAS_SIZE, CANVAS_SIZE);
        } else {
            ctx.clearRect(-HALF_CANVAS, -HALF_CANVAS, CANVAS_SIZE, CANVAS_SIZE);
        }

        // Stars
        ctx.beginPath();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
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
        const opacity = this.highPerformance ? 0.2 : 0.35;

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

        // Cylinder outline
        ctx.beginPath();
        ctx.arc(0, 0, CYLINDER_RADIUS + 4, 0, 2 * Math.PI, false);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = CYLINDER_EDGE_WIDTH;
        ctx.stroke();
    }

    drawGameOver(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-175, -60, 350, 110);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Player ${this.winner} Wins!`, 0, -10);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Press any key or click to restart', 0, 30);
    }

    // ── Restart ──────────────────────────────────────────────

    restart() {
        // Reset transform to identity, then re-center
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        this.initState();
        this.createObjects();
        this.lastTimestamp = null;
        // The rAF loop is already running, so no need to scheduleFrame again
    }
}

// Start the game when the page loads
window.onload = () => new Game();
