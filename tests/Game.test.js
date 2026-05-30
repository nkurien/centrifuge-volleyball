import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { installDomMocks } from './mocks.js';
import { CYLINDER_ANG_VELOCITY, CYLINDER_CAM_ANG_VELOCITY, WIN_SCORE } from '../src/js/config.js';

// Game.js has `window.onload = ...` at module scope, so we must install
// DOM mocks BEFORE the dynamic import.
let Game;

beforeAll(async () => {
    installDomMocks();
    const mod = await import('../src/js/Game.js');
    Game = mod.Game;
});

let game;

beforeEach(() => {
    installDomMocks();
    game = new Game();
});

// ── Tests ────────────────────────────────────────────────────

describe('Game', () => {
    // ── Initialization ───────────────────────────────────────

    describe('initialization', () => {
        it.each([
            { prop: 'cylinderAngle', expected: 0, label: 'cylinder angle starts at 0' },
            { prop: 'camAngle', expected: 0, label: 'camera angle starts at 0' },
            { prop: 'gameStarted', expected: false, label: 'game not started' },
            { prop: 'gameEnded', expected: false, label: 'game not ended' },
            { prop: 'winner', expected: -1, label: 'no winner' },
            { prop: 'gameScore', expected: WIN_SCORE, label: `win score is ${WIN_SCORE}` },
            { prop: 'highPerformance', expected: true, label: 'high perf mode on' },
        ])('$label', ({ prop, expected }) => {
            // Arrange — game created in beforeEach

            // Act — (initialization already happened)

            // Assert
            expect(game[prop]).toBe(expected);
        });

        it('angular velocities match config', () => {
            // Arrange — game created in beforeEach

            // Act — (initialization already happened)

            // Assert
            expect(game.angVelocity).toBe(CYLINDER_ANG_VELOCITY);
            expect(game.camAngVelocity).toBe(CYLINDER_CAM_ANG_VELOCITY);
        });

        it('creates both players and a ball', () => {
            // Arrange — game created in beforeEach

            // Act — (initialization already happened)

            // Assert
            expect(game.player1).toBeDefined();
            expect(game.player2).toBeDefined();
            expect(game.ball).toBeDefined();
        });

        it('both players start with score 0', () => {
            // Arrange — game created in beforeEach

            // Act — (initialization already happened)

            // Assert
            expect(game.player1.score).toBe(0);
            expect(game.player2.score).toBe(0);
        });

        it('frame counter starts at 1150', () => {
            // Arrange — game created in beforeEach

            // Act — (initialization already happened)

            // Assert
            expect(game.num).toBe(1150);
        });
    });

    // ── setFractions() ───────────────────────────────────────

    describe('setFractions()', () => {
        it('equal scores → 50/50 territory fractions', () => {
            // Arrange
            game.player1.score = 5;
            game.player2.score = 5;

            // Act
            game.setFractions();

            // Assert
            expect(game.player1.targetTargetFraction).toBeCloseTo(0.5);
            expect(game.player2.targetTargetFraction).toBeCloseTo(0.5);
        });

        it('fractions always sum to 1', () => {
            // Arrange
            game.player1.score = 10;
            game.player2.score = 3;

            // Act
            game.setFractions();

            // Assert
            const sum = game.player1.targetTargetFraction + game.player2.targetTargetFraction;
            expect(sum).toBeCloseTo(1);
        });

        it.each([
            { p1: 10, p2: 1, label: 'P1 leading → P1 gets smaller territory' },
            { p1: 20, p2: 5, label: 'P1 far ahead → P1 gets much smaller territory' },
        ])('$label', ({ p1, p2 }) => {
            // Arrange
            game.player1.score = p1;
            game.player2.score = p2;

            // Act
            game.setFractions();

            // Assert — leading player's territory shrinks (reciprocal formula)
            expect(game.player1.targetTargetFraction).toBeLessThan(0.5);
            expect(game.player2.targetTargetFraction).toBeGreaterThan(0.5);
        });

        it('P2 leading → P2 gets smaller territory', () => {
            // Arrange
            game.player1.score = 2;
            game.player2.score = 15;

            // Act
            game.setFractions();

            // Assert
            expect(game.player2.targetTargetFraction).toBeLessThan(0.5);
            expect(game.player1.targetTargetFraction).toBeGreaterThan(0.5);
        });

        it('score of 0 is treated as 1 (clamp prevents division issues)', () => {
            // Arrange
            game.player1.score = 0;
            game.player2.score = 0;

            // Act
            game.setFractions();

            // Assert — both treated as 1 → equal
            expect(game.player1.targetTargetFraction).toBeCloseTo(0.5);
            expect(game.player2.targetTargetFraction).toBeCloseTo(0.5);
        });
    });

    // ── update() ─────────────────────────────────────────────

    describe('update()', () => {
        it('cylinder angle increments by angVelocity', () => {
            // Arrange
            const angleBefore = game.cylinderAngle;

            // Act
            game.update();

            // Assert
            expect(game.cylinderAngle).toBeCloseTo(angleBefore + game.angVelocity);
        });

        it('camera angle increments by camAngVelocity', () => {
            // Arrange
            const angleBefore = game.camAngle;

            // Act
            game.update();

            // Assert
            expect(game.camAngle).toBeCloseTo(angleBefore + game.camAngVelocity);
        });

        it('frame counter increments', () => {
            // Arrange
            const numBefore = game.num;

            // Act
            game.update();

            // Assert
            expect(game.num).toBe(numBefore + 1);
        });

        it('camera accelerates during ramp-up phase (num%2300 in [1000,1150))', () => {
            // Arrange
            game.num = 999; // after increment → 1000, entering ramp-up
            const camBefore = game.camAngVelocity;

            // Act
            game.update();

            // Assert
            expect(game.camAngVelocity).toBeGreaterThan(camBefore);
        });

        it('camera decelerates during ramp-down phase (num%2300 in [2150,2300))', () => {
            // Arrange
            game.num = 2149; // after increment → 2150, entering ramp-down
            const camBefore = game.camAngVelocity;

            // Act
            game.update();

            // Assert
            expect(game.camAngVelocity).toBeLessThan(camBefore);
        });

        it('camera velocity unchanged outside ramp phases', () => {
            // Arrange
            game.num = 500; // after increment → 501, not in any ramp phase
            const camBefore = game.camAngVelocity;

            // Act
            game.update();

            // Assert
            expect(game.camAngVelocity).toBe(camBefore);
        });
    });

    // ── restart() ────────────────────────────────────────────

    describe('restart()', () => {
        it('resets scores to 0', () => {
            // Arrange
            game.player1.score = 15;
            game.player2.score = 20;

            // Act
            game.restart();

            // Assert
            expect(game.player1.score).toBe(0);
            expect(game.player2.score).toBe(0);
        });

        it.each([
            { prop: 'gameEnded', expected: false, label: 'clears gameEnded' },
            { prop: 'winner', expected: -1, label: 'resets winner' },
            { prop: 'cylinderAngle', expected: 0, label: 'resets cylinder angle' },
            { prop: 'camAngle', expected: 0, label: 'resets camera angle' },
        ])('$label', ({ prop, expected }) => {
            // Arrange
            game.gameEnded = true;
            game.winner = 1;
            game.cylinderAngle = 5;
            game.camAngle = 3;

            // Act
            game.restart();

            // Assert
            expect(game[prop]).toBe(expected);
        });

        it('gameStarted remains true after restart', () => {
            // Arrange
            game.gameStarted = true;

            // Act
            game.restart();

            // Assert
            expect(game.gameStarted).toBe(true);
        });

        it('creates fresh player and ball objects', () => {
            // Arrange
            const oldP1 = game.player1;
            const oldP2 = game.player2;
            const oldBall = game.ball;

            // Act
            game.restart();

            // Assert
            expect(game.player1).not.toBe(oldP1);
            expect(game.player2).not.toBe(oldP2);
            expect(game.ball).not.toBe(oldBall);
        });

        it('resets angular velocities to config defaults', () => {
            // Arrange
            game.angVelocity = 999;
            game.camAngVelocity = 999;

            // Act
            game.restart();

            // Assert
            expect(game.angVelocity).toBe(CYLINDER_ANG_VELOCITY);
            expect(game.camAngVelocity).toBe(CYLINDER_CAM_ANG_VELOCITY);
        });
    });
});
