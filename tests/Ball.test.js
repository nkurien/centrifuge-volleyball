import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ball, mod } from '../src/js/Ball.js';
import { Player } from '../src/js/Player.js';
import { createMockGame, installDomMocks } from './mocks.js';
import {
    CYLINDER_RADIUS,
    BALL_RADIUS,
    BALL_INITIAL_SPEED,
    BALL_FRICTION,
    WIN_SCORE,
    MIN_SCORE_DIFFERENCE,
    PALETTE,
    PLAYER_COLORS,
} from '../src/js/config.js';

beforeEach(() => {
    installDomMocks();
});

// ── Helpers ──────────────────────────────────────────────────

function createBallWithPlayers(gameOverrides = {}) {
    const game = createMockGame(gameOverrides);
    const player1 = new Player(game, 1);
    const player2 = new Player(game, 2);
    game.player1 = player1;
    game.player2 = player2;
    const ball = new Ball(game);
    game.ball = ball;
    return { ball, game, player1, player2 };
}

/** Place ball on the wall at a given absolute angle, ready to score. */
function setupGroundedBallAtAngle(angle) {
    const { ball, game, player1, player2 } = createBallWithPlayers();
    const { ctx } = installDomMocks();
    player1.draw(ctx);
    player2.draw(ctx);

    ball.grounded = true;
    ball.pauseNum = -1;
    ball.hit = false;
    ball.x = (CYLINDER_RADIUS - BALL_RADIUS) * Math.cos(angle);
    ball.y = (CYLINDER_RADIUS - BALL_RADIUS) * Math.sin(angle);
    ball.angle = angle - game.cylinderAngle;

    return { ball, game, player1, player2 };
}

/** Set up a near-win scenario where the next point goes to P1. */
function setupWinScenario(p1Score, p2Score) {
    const { ball, game, player1, player2 } = setupGroundedBallAtAngle(Math.PI);
    player1.score = p1Score;
    player2.score = p2Score;
    return { ball, game, player1, player2 };
}

// ── mod() utility ────────────────────────────────────────────

describe('mod()', () => {
    it.each([
        { a: 3, b: 5, expected: 3, label: 'positive within range' },
        { a: -1, b: 5, expected: 4, label: 'negative wraps' },
        { a: 10, b: 5, expected: 0, label: 'exact multiple → 0' },
        { a: 0, b: 7, expected: 0, label: 'zero mod anything → 0' },
        { a: -13, b: 5, expected: 2, label: 'large negative' },
    ])('mod($a, $b) → $expected ($label)', ({ a, b, expected }) => {
        // Arrange — inputs provided by parameterization

        // Act
        const result = mod(a, b);

        // Assert
        expect(result).toBe(expected);
    });

    it('wraps negative into [0, 2π)', () => {
        // Arrange
        const value = -0.5;
        const modulus = 2 * Math.PI;

        // Act
        const result = mod(value, modulus);

        // Assert
        expect(result).toBeCloseTo(2 * Math.PI - 0.5);
    });

    it('float result is always in [0, modulus)', () => {
        // Arrange
        const value = 6.3;
        const modulus = 2 * Math.PI;

        // Act
        const result = mod(value, modulus);

        // Assert
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(modulus);
    });
});

// ── Ball ─────────────────────────────────────────────────────

describe('Ball', () => {
    // ── Initialization ───────────────────────────────────────

    describe('initialization', () => {
        it('starts at the center', () => {
            // Arrange & Act
            const { ball } = createBallWithPlayers();

            // Assert
            expect(ball.x).toBe(0);
            expect(ball.y).toBe(0);
        });

        it.each([
            { prop: 'radius', expected: BALL_RADIUS, label: 'correct radius' },
            { prop: 'grounded', expected: false, label: 'starts airborne' },
            { prop: 'color', expected: PALETTE.BALL, label: 'default color' },
            { prop: 'glowColor', expected: PALETTE.BALL_GLOW, label: 'default glow' },
            { prop: 'pauseNum', expected: -1, label: 'not paused' },
            { prop: 'type', expected: 0, label: 'type is BALL (0)' },
        ])('$label', ({ prop, expected }) => {
            // Arrange & Act
            const { ball } = createBallWithPlayers();

            // Assert
            expect(ball[prop]).toBe(expected);
        });

        it('has correct initial speed magnitude', () => {
            // Arrange & Act
            const { ball } = createBallWithPlayers();

            // Assert
            const speed = Math.sqrt(ball.xVelocity ** 2 + ball.yVelocity ** 2);
            expect(speed).toBeCloseTo(BALL_INITIAL_SPEED);
        });

        it('random angle is within [0, 2π) across many instances', () => {
            // Arrange & Act & Assert
            for (let i = 0; i < 20; i++) {
                const { ball } = createBallWithPlayers();
                expect(ball.angle).toBeGreaterThanOrEqual(0);
                expect(ball.angle).toBeLessThan(2 * Math.PI);
            }
        });
    });

    // ── Free flight ──────────────────────────────────────────

    describe('free flight', () => {
        it('moves in straight line (inertial, no fictitious forces)', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = false;
            ball.x = 0;
            ball.y = 0;
            ball.xVelocity = 1;
            ball.yVelocity = 0;

            // Act
            ball.move();

            // Assert
            expect(ball.x).toBeCloseTo(1);
            expect(ball.y).toBeCloseTo(0);
        });

        it('velocity is unchanged during free flight (no forces)', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = false;
            ball.x = 10;
            ball.y = 10;
            ball.xVelocity = 2;
            ball.yVelocity = -3;

            // Act
            ball.move();

            // Assert
            expect(ball.xVelocity).toBe(2);
            expect(ball.yVelocity).toBe(-3);
        });

        it('lands on cylinder wall at CYLINDER_RADIUS - BALL_RADIUS', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = false;
            ball.x = CYLINDER_RADIUS - BALL_RADIUS - 1;
            ball.y = 0;
            ball.xVelocity = 5;
            ball.yVelocity = 0;

            // Act
            ball.move();

            // Assert
            expect(ball.grounded).toBe(true);
            const dist = Math.sqrt(ball.x ** 2 + ball.y ** 2);
            expect(dist).toBeCloseTo(CYLINDER_RADIUS - BALL_RADIUS, 0);
        });

        it('stays airborne when inside cylinder', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = false;
            ball.x = 50;
            ball.y = 50;
            ball.xVelocity = 1;
            ball.yVelocity = 0;

            // Act
            ball.move();

            // Assert
            expect(ball.grounded).toBe(false);
        });
    });

    // ── Grounded movement ────────────────────────────────────

    describe('grounded movement', () => {
        it('angular velocity decays with friction', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = true;
            ball.angularVelocity = 0.1;
            ball.angle = 0;

            // Act
            ball.move();

            // Assert
            expect(ball.angularVelocity).toBeCloseTo(0.1 * BALL_FRICTION);
        });

        it('stays on wall surface over many frames', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = true;
            ball.angularVelocity = 0.05;
            ball.angle = 0;

            // Act
            for (let i = 0; i < 10; i++) ball.move();

            // Assert
            const dist = Math.sqrt(ball.x ** 2 + ball.y ** 2);
            expect(dist).toBeCloseTo(CYLINDER_RADIUS - BALL_RADIUS, 5);
        });

        it('angle increments by angular velocity', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.grounded = true;
            ball.angle = 1.0;
            ball.angularVelocity = 0.05;

            // Act
            ball.move();

            // Assert
            expect(ball.angle).toBeCloseTo(1.05);
        });
    });

    // ── reset() ──────────────────────────────────────────────

    describe('reset()', () => {
        it.each([
            { prop: 'x', expected: 0, label: 'x returns to 0' },
            { prop: 'y', expected: 0, label: 'y returns to 0' },
            { prop: 'radius', expected: BALL_RADIUS, label: 'radius restored' },
            { prop: 'color', expected: PALETTE.BALL, label: 'color reset' },
            { prop: 'glowColor', expected: PALETTE.BALL_GLOW, label: 'glow color reset' },
            { prop: 'grounded', expected: false, label: 'not grounded' },
            { prop: 'pauseNum', expected: -1, label: 'pause cleared' },
        ])('$label', ({ prop, expected }) => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.x = 100;
            ball.y = -50;
            ball.radius = 5;
            ball.color = 'rgb(255,0,0)';
            ball.glowColor = 'rgba(255,0,0,0.5)';
            ball.grounded = true;
            ball.pauseNum = 100;

            // Act
            ball.reset();

            // Assert
            expect(ball[prop]).toBe(expected);
        });

        it('has correct speed magnitude after reset', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            ball.xVelocity = 100;
            ball.yVelocity = -50;

            // Act
            ball.reset();

            // Assert
            const speed = Math.sqrt(ball.xVelocity ** 2 + ball.yVelocity ** 2);
            expect(speed).toBeCloseTo(BALL_INITIAL_SPEED);
        });

        it('gets a new random angle (not always the same)', () => {
            // Arrange
            const { ball } = createBallWithPlayers();
            const angles = new Set();

            // Act
            for (let i = 0; i < 20; i++) {
                ball.reset();
                angles.add(ball.angle.toFixed(4));
            }

            // Assert
            expect(angles.size).toBeGreaterThan(1);
        });
    });

    // ── Scoring (handlePoints) ───────────────────────────────

    describe('handlePoints() — scoring', () => {
        it.each([
            { angle: Math.PI, scorer: 'player1', label: 'ball in P1 territory → P1 scores' },
            { angle: 0, scorer: 'player2', label: 'ball in P2 territory → P2 scores' },
        ])('$label', ({ angle, scorer }) => {
            // Arrange
            const { ball, player1, player2 } = setupGroundedBallAtAngle(angle);

            // Act
            ball.handlePoints();

            // Assert
            const scoringPlayer = scorer === 'player1' ? player1 : player2;
            const otherPlayer = scorer === 'player1' ? player2 : player1;
            expect(scoringPlayer.score).toBe(1);
            expect(otherPlayer.score).toBe(0);
        });

        it('calls setFractions after scoring', () => {
            // Arrange
            const { ball, game } = setupGroundedBallAtAngle(Math.PI);

            // Act
            ball.handlePoints();

            // Assert
            expect(game.setFractions).toHaveBeenCalled();
        });

        it('enters pause state after scoring', () => {
            // Arrange
            const { ball, game } = setupGroundedBallAtAngle(Math.PI);

            // Act
            ball.handlePoints();

            // Assert
            expect(ball.pauseNum).toBe(game.num);
        });

        it.each([
            { angle: Math.PI, playerKey: 'player1', label: 'P1 color on P1 score' },
            { angle: 0, playerKey: 'player2', label: 'P2 color on P2 score' },
        ])('ball changes to $label', ({ angle, playerKey }) => {
            // Arrange
            const { ball, player1, player2 } = setupGroundedBallAtAngle(angle);
            const scorer = playerKey === 'player1' ? player1 : player2;

            // Act
            ball.handlePoints();

            // Assert
            expect(ball.color).toBe(scorer.color);
            expect(ball.glowColor).toBe(scorer.glow);
        });

        it.each([
            {
                condition: 'hit',
                setup: (b) => {
                    b.hit = true;
                },
                label: 'ball was hit',
            },
            {
                condition: 'paused',
                setup: (b) => {
                    b.pauseNum = 100;
                },
                label: 'already paused',
            },
            {
                condition: 'airborne',
                setup: (b) => {
                    b.grounded = false;
                },
                label: 'ball is airborne',
            },
        ])('does not score when $label', ({ setup }) => {
            // Arrange
            const { ball, player1, player2 } = setupGroundedBallAtAngle(Math.PI);
            setup(ball);
            // If paused, need a non-zero radius so shrink logic doesn't error
            if (ball.pauseNum !== -1) ball.radius = 20;

            // Act
            ball.handlePoints();

            // Assert
            expect(player1.score).toBe(0);
            expect(player2.score).toBe(0);
        });

        it('hit flag is cleared after handlePoints', () => {
            // Arrange
            const { ball } = setupGroundedBallAtAngle(Math.PI);
            ball.hit = true;

            // Act
            ball.handlePoints();

            // Assert
            expect(ball.hit).toBe(false);
        });
    });

    // ── Win conditions ───────────────────────────────────────

    describe('handlePoints() — win conditions', () => {
        it.each([
            { p1: 23, p2: 0, ends: false, label: '24-0: no win (< WIN_SCORE)' },
            { p1: 24, p2: 0, ends: true, winner: 1, label: '25-0: P1 wins' },
            { p1: 24, p2: 24, ends: false, label: '25-24: no win (win-by-2 rule)' },
            { p1: 25, p2: 24, ends: true, winner: 1, label: '26-24: P1 wins (diff=2)' },
            { p1: 29, p2: 29, ends: false, label: '30-29: no win (deuce)' },
        ])('$label', ({ p1, p2, ends, winner }) => {
            // Arrange
            const { ball, game } = setupWinScenario(p1, p2);

            // Act
            ball.handlePoints();

            // Assert
            expect(game.gameEnded).toBe(ends);
            if (ends) {
                expect(game.winner).toBe(winner);
            }
        });

        it('sets winning flag on player reaching WIN_SCORE', () => {
            // Arrange
            const { ball, player1 } = setupWinScenario(24, 0);

            // Act
            ball.handlePoints();

            // Assert
            expect(player1.winning).toBe(true);
        });
    });

    // ── Shrink animation ─────────────────────────────────────

    describe('shrink animation', () => {
        it('radius decreases by 1 each frame during pause', () => {
            // Arrange
            const { ball, game } = createBallWithPlayers();
            ball.pauseNum = game.num;
            ball.grounded = true;
            const radiusBefore = ball.radius;

            // Act
            ball.handlePoints();

            // Assert
            expect(ball.radius).toBe(radiusBefore - 1);
        });

        it('resets ball after 25 frames of pause', () => {
            // Arrange
            const { ball, game, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            ball.pauseNum = 100;
            game.num = 125; // 125 - 100 = 25 frames
            player1.targetTargetFraction = 0.6;
            player2.targetTargetFraction = 0.4;

            // Act
            ball.handlePoints();

            // Assert
            expect(ball.pauseNum).toBe(-1);
            expect(ball.radius).toBe(BALL_RADIUS);
            expect(ball.x).toBe(0);
            expect(ball.y).toBe(0);
        });

        it('updates target fractions when shrink completes', () => {
            // Arrange
            const { ball, game, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            ball.pauseNum = 100;
            game.num = 125;
            player1.targetTargetFraction = 0.7;
            player2.targetTargetFraction = 0.3;

            // Act
            ball.handlePoints();

            // Assert
            expect(player1.targetFraction).toBe(0.7);
            expect(player2.targetFraction).toBe(0.3);
        });
    });

    // ── Collision detection ──────────────────────────────────

    describe('handleCollisions()', () => {
        it('no collision when ball is at center (far from players)', () => {
            // Arrange
            const { ball, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            ball.x = 0;
            ball.y = 0;
            const vxBefore = ball.xVelocity;
            const vyBefore = ball.yVelocity;

            // Act
            ball.handleCollisions();

            // Assert
            expect(ball.xVelocity).toBe(vxBefore);
            expect(ball.yVelocity).toBe(vyBefore);
            expect(ball.hit).toBe(false);
        });

        it('collision detected when ball overlaps player — sets hit flag', () => {
            // Arrange
            const { ball, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            ball.x = player1.x;
            ball.y = player1.y;
            ball.xVelocity = 0;
            ball.yVelocity = 0;

            // Act
            ball.handleCollisions();

            // Assert
            expect(ball.hit).toBe(true);
        });

        it('ball is repositioned outside player after collision', () => {
            // Arrange
            const { ball, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            player1.grounded = false;
            player1.xVelocity = 0;
            player1.yVelocity = 0;
            ball.x = player1.x + 10;
            ball.y = player1.y;
            ball.xVelocity = -10; // Moving towards player center
            ball.yVelocity = 0;
            const xBefore = ball.x;
            const yBefore = ball.y;

            // Act
            ball.handleCollisions();

            // Assert
            const moved = ball.x !== xBefore || ball.y !== yBefore;
            expect(moved).toBe(true);
        });

        it('does not collide when ball is paused', () => {
            // Arrange
            const { ball, player1, player2 } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            player1.draw(ctx);
            player2.draw(ctx);
            ball.x = player1.x;
            ball.y = player1.y;
            ball.pauseNum = 100;

            // Act
            ball.handleCollisions();

            // Assert
            expect(ball.hit).toBe(false);
        });
    });

    // ── draw() ───────────────────────────────────────────────

    describe('draw()', () => {
        it.each([
            { radius: 10, shouldDraw: true, label: 'draws when radius > 0' },
            { radius: 0, shouldDraw: false, label: 'does not draw when radius = 0' },
            { radius: -1, shouldDraw: false, label: 'does not draw when radius < 0' },
        ])('$label', ({ radius, shouldDraw }) => {
            // Arrange
            const { ball } = createBallWithPlayers();
            const { ctx } = installDomMocks();
            ball.radius = radius;

            // Act
            ball.draw(ctx);

            // Assert
            if (shouldDraw) {
                expect(ctx.arc).toHaveBeenCalled();
                expect(ctx.fill).toHaveBeenCalled();
            } else {
                expect(ctx.arc).not.toHaveBeenCalled();
            }
        });
    });
});
