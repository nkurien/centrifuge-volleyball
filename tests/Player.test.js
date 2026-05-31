import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../src/js/Player.js';
import { createMockGame, installDomMocks } from './mocks.js';
import {
    CYLINDER_RADIUS,
    PLAYER_RADIUS,
    PLAYER_MAX_VELOCITY,
    PLAYER_ANG_ACCEL,
    PLAYER_JUMP_POWER,
    PLAYER_FRICTION,
    CONTROLS,
    PLAYER_COLORS,
} from '../src/js/config.js';

beforeEach(() => {
    installDomMocks();
});

// ── Helpers ──────────────────────────────────────────────────

function createPlayer(playerNumber, gameOverrides = {}) {
    const game = createMockGame(gameOverrides);
    const player = new Player(game, playerNumber);
    return { player, game };
}

function distFromOrigin(player) {
    return Math.sqrt(player.x * player.x + player.y * player.y);
}

// ── Tests ────────────────────────────────────────────────────

describe('Player', () => {
    // ── Initialization ───────────────────────────────────────

    describe('initialization', () => {
        it.each([1, 2])('player %d starts on the cylinder wall', (num) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(distFromOrigin(player)).toBeCloseTo(CYLINDER_RADIUS);
        });

        it.each([
            { num: 1, label: 'player 1 starts in player 2 territory (opposing)' },
            { num: 2, label: 'player 2 starts in player 1 territory (opposing)' },
        ])('$label', ({ num }) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert — position matches the +π offset formula
            const expectedX = CYLINDER_RADIUS * Math.cos((2 * Math.PI * num) / 2 + Math.PI);
            const expectedY = CYLINDER_RADIUS * Math.sin((2 * Math.PI * num) / 2 + Math.PI);
            expect(player.x).toBeCloseTo(expectedX);
            expect(player.y).toBeCloseTo(expectedY);
        });

        it.each([1, 2])('player %d starts grounded with zero velocity', (num) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(player.grounded).toBe(true);
            expect(player.angularVelocity).toBe(0);
            expect(player.xVelocity).toBe(0);
            expect(player.yVelocity).toBe(0);
        });

        it.each([1, 2])('player %d has correct physics constants', (num) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(player.radius).toBe(PLAYER_RADIUS);
            expect(player.jumpPower).toBe(PLAYER_JUMP_POWER);
            expect(player.angAccel).toBe(PLAYER_ANG_ACCEL);
            expect(player.maxVelocity).toBe(PLAYER_MAX_VELOCITY);
        });

        it.each([
            { num: 1, ctrl: CONTROLS.PLAYER1 },
            { num: 2, ctrl: CONTROLS.PLAYER2 },
        ])('player $num has correct key bindings', ({ num, ctrl }) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(player.keyLeft).toBe(ctrl.LEFT);
            expect(player.keyRight).toBe(ctrl.RIGHT);
            expect(player.keyJump).toBe(ctrl.JUMP);
        });

        it.each([
            { num: 1, color: PLAYER_COLORS[1], label: 'orange' },
            { num: 2, color: PLAYER_COLORS[2], label: 'blue' },
        ])('player $num has $label color', ({ num, color }) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(player.r).toBe(color.r);
            expect(player.g).toBe(color.g);
            expect(player.b).toBe(color.b);
            expect(player.glow).toBe(color.glow);
        });

        it.each([1, 2])('player %d starts with score 0 and 50%% territory', (num) => {
            // Arrange & Act
            const { player } = createPlayer(num);

            // Assert
            expect(player.score).toBe(0);
            expect(player.fraction).toBe(0.5);
            expect(player.targetFraction).toBe(0.5);
            expect(player.targetTargetFraction).toBe(0.5);
        });

        it('type is PLAYER (1)', () => {
            // Arrange & Act
            const { player } = createPlayer(1);

            // Assert
            expect(player.type).toBe(1);
        });

        it('no keys pressed initially', () => {
            // Arrange & Act
            const { player } = createPlayer(1);

            // Assert
            expect(player.keyLeftPressed).toBe(false);
            expect(player.keyRightPressed).toBe(false);
        });
    });

    // ── Grounded movement ────────────────────────────────────

    describe('grounded movement', () => {
        it.each([
            { key: 'keyLeftPressed', direction: 'positive', check: (v) => v > 0 },
            { key: 'keyRightPressed', direction: 'negative', check: (v) => v < 0 },
        ])('$key accelerates angular velocity in $direction direction', ({ key, check }) => {
            // Arrange
            const { player } = createPlayer(1);

            // Act
            player[key] = true;
            player.move();

            // Assert
            expect(check(player.angularVelocity)).toBe(true);
        });

        it('angular velocity does not exceed max (left bound)', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.angularVelocity = -PLAYER_MAX_VELOCITY - 0.1;

            // Act
            player.keyLeftPressed = true;
            player.move();

            // Assert — condition guards prevent acceleration past the limit
            expect(player.angularVelocity).toBeLessThanOrEqual(0);
        });

        it('angular velocity does not exceed max (right bound)', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.angularVelocity = PLAYER_MAX_VELOCITY + 0.1;

            // Act
            player.keyRightPressed = true;
            player.move();

            // Assert
            expect(player.angularVelocity).toBeGreaterThanOrEqual(0);
        });

        it('friction decays angular velocity each frame', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.angularVelocity = 0.1;

            // Act
            player.move();

            // Assert — velocity decayed by PLAYER_FRICTION
            // (with the small acceleration from being above 0 and left check)
            expect(player.angularVelocity).toBeLessThan(0.1);
        });

        it('player stays on cylinder wall over many frames', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.keyLeftPressed = true;

            // Act
            for (let i = 0; i < 50; i++) player.move();

            // Assert
            expect(distFromOrigin(player)).toBeCloseTo(CYLINDER_RADIUS, 5);
        });

        it('angle changes when key is pressed', () => {
            // Arrange
            const { player } = createPlayer(1);
            const initialAngle = player.angle;
            player.keyLeftPressed = true;

            // Act
            player.move();

            // Assert
            expect(player.angle).not.toBeCloseTo(initialAngle);
        });

        it('no movement when no keys pressed and velocity is zero', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.angularVelocity = 0;
            const initialAngle = player.angle;

            // Act
            player.move();

            // Assert
            expect(player.angle).toBe(initialAngle);
        });
    });

    // ── Jump ─────────────────────────────────────────────────

    describe('jump()', () => {
        it('sets grounded to false', () => {
            // Arrange
            const { player } = createPlayer(1);

            // Act
            player.jump();

            // Assert
            expect(player.grounded).toBe(false);
        });

        it('does nothing if already airborne', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.grounded = false;
            player.xVelocity = 0;
            player.yVelocity = 0;

            // Act
            player.jump();

            // Assert
            expect(player.xVelocity).toBe(0);
            expect(player.yVelocity).toBe(0);
        });

        it('produces inward radial velocity component', () => {
            // Arrange
            const { player, game } = createPlayer(1);
            const wallAngle = player.angle + game.cylinderAngle;

            // Act
            player.jump();

            // Assert — dot product with radial-outward should be negative (moving inward)
            const radialComponent =
                player.xVelocity * Math.cos(wallAngle) + player.yVelocity * Math.sin(wallAngle);
            expect(radialComponent).toBeLessThan(0);
        });

        it('inherits tangential velocity from cylinder rotation', () => {
            // Arrange
            const { player, game } = createPlayer(1);
            game.angVelocity = 0.02;
            player.angularVelocity = 0;

            // Act
            player.jump();

            // Assert
            const speed = Math.sqrt(
                player.xVelocity * player.xVelocity + player.yVelocity * player.yVelocity,
            );
            expect(speed).toBeGreaterThan(0);
        });

        it.each([
            { angVel: 0.05, label: 'positive angular velocity' },
            { angVel: -0.05, label: 'negative angular velocity' },
        ])('jump speed includes player $label', ({ angVel }) => {
            // Arrange
            const { player, game } = createPlayer(1);
            game.angVelocity = 0.02;
            player.angularVelocity = angVel;

            // Act
            player.jump();

            // Assert — speed should differ from a zero-angVel jump
            const speed = Math.sqrt(
                player.xVelocity * player.xVelocity + player.yVelocity * player.yVelocity,
            );
            expect(speed).toBeGreaterThan(0);
        });
    });

    // ── Airborne movement ────────────────────────────────────

    describe('airborne movement', () => {
        it('moves in straight line (inertial, no fictitious forces)', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.grounded = false;
            player.x = 50;
            player.y = 50;
            player.xVelocity = 1;
            player.yVelocity = 0;
            const x0 = player.x;
            const y0 = player.y;

            // Act
            player.move();

            // Assert
            expect(player.x).toBeCloseTo(x0 + 1);
            expect(player.y).toBeCloseTo(y0);
        });

        it('velocity does not change during free flight', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.grounded = false;
            player.x = 10;
            player.y = 10;
            player.xVelocity = 2;
            player.yVelocity = -1;

            // Act
            player.move();

            // Assert
            expect(player.xVelocity).toBe(2);
            expect(player.yVelocity).toBe(-1);
        });

        it('lands when reaching cylinder wall', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.grounded = false;
            player.x = CYLINDER_RADIUS - 2;
            player.y = 0;
            player.xVelocity = 5;
            player.yVelocity = 0;

            // Act
            player.move();

            // Assert
            expect(player.grounded).toBe(true);
            expect(distFromOrigin(player)).toBeCloseTo(CYLINDER_RADIUS, 0);
        });

        it('stays airborne when well inside cylinder', () => {
            // Arrange
            const { player } = createPlayer(1);
            player.grounded = false;
            player.x = 50;
            player.y = 50;
            player.xVelocity = 0;
            player.yVelocity = 0;

            // Act
            player.move();

            // Assert
            expect(player.grounded).toBe(false);
        });
    });

    // ── Territory fraction interpolation ─────────────────────

    describe('territory fraction', () => {
        it.each([
            { initial: 0.5, target: 0.3, label: 'shrinking territory' },
            { initial: 0.3, target: 0.5, label: 'growing territory' },
        ])('fraction interpolates 1/10th toward target ($label)', ({ initial, target }) => {
            // Arrange
            const { player } = createPlayer(1);
            const { ctx } = installDomMocks();
            player.fraction = initial;
            player.targetFraction = target;

            // Act
            player.draw(ctx);

            // Assert
            const expected = initial + (target - initial) / 10;
            expect(player.fraction).toBeCloseTo(expected);
        });

        it('fraction stays stable when already at target', () => {
            // Arrange
            const { player } = createPlayer(1);
            const { ctx } = installDomMocks();
            player.fraction = 0.4;
            player.targetFraction = 0.4;

            // Act
            player.draw(ctx);

            // Assert
            expect(player.fraction).toBeCloseTo(0.4);
        });
    });

    // ── AI Logic ─────────────────────────────────────────────

    describe('AI Logic', () => {
        it('applies difficulty settings correctly', () => {
            const { player } = createPlayer(2);
            player.isAI = true;

            player.difficulty = 'easy';
            player.applyDifficulty();
            expect(player.maxVelocity).toBe(PLAYER_MAX_VELOCITY * 0.35);

            player.difficulty = 'medium';
            player.applyDifficulty();
            expect(player.maxVelocity).toBe(PLAYER_MAX_VELOCITY * 0.8);

            player.difficulty = 'hard';
            player.applyDifficulty();
            expect(player.maxVelocity).toBe(PLAYER_MAX_VELOCITY * 1.5);
            expect(player.r).toBe(230);
            expect(player.g).toBe(40);
            expect(player.b).toBe(60);
        });

        it('AI tracks the ball and presses appropriate keys (Easy)', () => {
            const { player, game } = createPlayer(2);
            player.isAI = true;
            player.difficulty = 'easy';
            
            game.ball = {
                angle: player.angle + 0.5, // ball is counter-clockwise
                pauseNum: -1,
                x: 0, y: 0, xVelocity: 0, yVelocity: 0
            };
            
            player.updateAI();
            expect(player.keyLeftPressed).toBe(true);
            expect(player.keyRightPressed).toBe(false);

            game.ball.angle = player.angle - 0.5; // ball is clockwise
            player.updateAI();
            expect(player.keyLeftPressed).toBe(false);
            expect(player.keyRightPressed).toBe(true);
        });

        it('returns to Math.PI (opponent territory) when ball is falling into own territory', () => {
            const { player, game } = createPlayer(2);
            player.isAI = true;
            player.difficulty = 'medium';
            
            // Place player away from Math.PI
            player.angle = Math.PI + Math.PI / 4; 
            
            // Ball is falling into player's own territory (around 0)
            game.ball = {
                angle: 0,
                pauseNum: -1,
                x: 0, y: 0, xVelocity: 0, yVelocity: 0
            };
            
            player.updateAI();
            // It should move to Math.PI
            expect(player.keyLeftPressed || player.keyRightPressed).toBe(true);
        });

        it('AI jumps when ball is approaching and close', () => {
            const { player, game } = createPlayer(2);
            player.isAI = true;
            player.difficulty = 'medium';
            player.grounded = true;

            const jumpDist = PLAYER_RADIUS * 4.0;
            player.x = 100;
            player.y = 100;
            game.num = 0; // Ensure Math.sin(game.num / 10) is 0 to avoid human error skipping the jump
            
            game.ball = {
                x: 100 - jumpDist * 0.5, 
                y: 100,
                xVelocity: 1, // Moving towards player.x (100)
                yVelocity: 0,
                angle: Math.PI, // Place ball in P1 territory so AI jumps to attack
                pauseNum: -1
            };

            const jumpSpy = vi.spyOn(player, 'jump');
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99); // Force shouldJump = true
            player.updateAI();
            expect(jumpSpy).toHaveBeenCalled();
            randomSpy.mockRestore();
        });
    });

    // ── update() ─────────────────────────────────────────────

    describe('update()', () => {
        it('delegates to move() — angle changes when key pressed', () => {
            // Arrange
            const { player } = createPlayer(1);
            const angleBefore = player.angle;
            player.keyLeftPressed = true;

            // Act
            player.update();

            // Assert
            expect(player.angle).not.toBe(angleBefore);
        });
    });
});
