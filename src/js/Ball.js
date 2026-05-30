// Ball class — extracted from original game.js Ball.
// Preserves: inertial-frame movement, original collision resolution,
// territory scoring with cylinderAngle offset, shrink animation.

import {
    CYLINDER_RADIUS,
    BALL_RADIUS,
    BALL_INITIAL_SPEED,
    BALL_FRICTION,
    WIN_SCORE,
    MIN_SCORE_DIFFERENCE,
    PALETTE,
} from './config.js';
import { Vector } from './Vector.js';

export function mod(a, b) {
    return ((a % b) + b) % b;
}

function playSound(id) {
    const el = document.getElementById(id);
    if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
    }
}

export class Ball {
    constructor(game) {
        this.game = game;
        this.radius = BALL_RADIUS;
        this.x = 0;
        this.y = 0;
        this.angle = Math.random() * 2 * Math.PI;
        this.xVelocity = BALL_INITIAL_SPEED * Math.cos(this.angle);
        this.yVelocity = BALL_INITIAL_SPEED * Math.sin(this.angle);
        this.angularVelocity = 0;
        this.grounded = false;
        this.type = 0; // CentrifugeObject_BALL
        this.color = PALETTE.BALL;
        this.glowColor = PALETTE.BALL_GLOW;
        this.pauseNum = -1;
        this.hit = false;
    }

    move() {
        // Inertial frame — straight-line motion, no fictitious forces
        if (!this.grounded) {
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            this.angle = Math.atan2(this.y, this.x) - this.game.cylinderAngle;

            // Land on cylinder wall
            if (Math.sqrt(this.x * this.x + this.y * this.y) >= CYLINDER_RADIUS - this.radius) {
                this.x =
                    (CYLINDER_RADIUS - this.radius) *
                    Math.cos(this.angle + this.game.cylinderAngle);
                this.y =
                    (CYLINDER_RADIUS - this.radius) *
                    Math.sin(this.angle + this.game.cylinderAngle);
                this.grounded = true;
            }
        }

        if (this.grounded) {
            this.angle += this.angularVelocity;
            this.angularVelocity *= BALL_FRICTION;
            this.x =
                (CYLINDER_RADIUS - this.radius) * Math.cos(this.angle + this.game.cylinderAngle);
            this.y =
                (CYLINDER_RADIUS - this.radius) * Math.sin(this.angle + this.game.cylinderAngle);
        }
    }

    handleCollisions() {
        for (const player of [this.game.player1, this.game.player2]) {
            if (this.pauseNum !== -1) continue;

            const dxA = this.x - player.x;
            const dyA = this.y - player.y;
            const dxB = this.x - player.cylinderCircleCenterX;
            const dyB = this.y - player.cylinderCircleCenterY;
            const distA = Math.sqrt(dxA * dxA + dyA * dyA);
            const distB = Math.sqrt(dxB * dxB + dyB * dyB);

            if (distA < player.radius + this.radius && distB < CYLINDER_RADIUS + this.radius) {
                let collisionVector;
                let centerX = 0;
                let centerY = 0;
                let centerRadius = 0;
                let cornerCollision = false;

                const angleFromPlayerCenter = Math.atan2(this.y - player.y, this.x - player.x);
                const angleFromCylinderCircleCenter = Math.atan2(
                    this.y - player.cylinderCircleCenterY,
                    this.x - player.cylinderCircleCenterX,
                );

                const AFPCLowerBound =
                    player.drawnAngle +
                    this.game.cylinderAngle -
                    player.playerIntersectAng / 2 +
                    Math.PI;
                const AFPCUpperBound =
                    player.drawnAngle +
                    this.game.cylinderAngle +
                    player.playerIntersectAng / 2 +
                    Math.PI;
                const AFCCCLowerBound =
                    player.drawnAngle + this.game.cylinderAngle - player.cylinderIntersectAng / 2;
                const AFCCCUpperBound =
                    player.drawnAngle + this.game.cylinderAngle + player.cylinderIntersectAng / 2;

                const AFPCDiff = mod(angleFromPlayerCenter - AFPCLowerBound, 2 * Math.PI);
                const AFPCDiffMax = mod(AFPCUpperBound - AFPCLowerBound, 2 * Math.PI);
                const AFCCCDiff = mod(angleFromCylinderCircleCenter - AFCCCLowerBound, 2 * Math.PI);
                const AFCCCDiffMax = mod(AFCCCUpperBound - AFCCCLowerBound, 2 * Math.PI);

                if (AFPCDiff <= AFPCDiffMax) {
                    centerX = player.x;
                    centerY = player.y;
                    centerRadius = player.radius;
                    collisionVector = new Vector(dxA, dyA);
                } else if (AFCCCDiff <= AFCCCDiffMax) {
                    centerX = player.cylinderCircleCenterX;
                    centerY = player.cylinderCircleCenterY;
                    centerRadius = CYLINDER_RADIUS;
                    collisionVector = new Vector(dxB, dyB);
                } else if (AFPCDiff - AFPCDiffMax >= (2 * Math.PI - AFPCDiffMax) / 2) {
                    // Left corner
                    cornerCollision = true;
                    centerX =
                        player.x +
                        player.radius *
                            Math.cos(
                                player.drawnAngle +
                                    this.game.cylinderAngle -
                                    player.playerIntersectAng / 2 +
                                    Math.PI,
                            );
                    centerY =
                        player.y +
                        player.radius *
                            Math.sin(
                                player.drawnAngle +
                                    this.game.cylinderAngle -
                                    player.playerIntersectAng / 2 +
                                    Math.PI,
                            );
                    centerRadius = 0;
                    collisionVector = new Vector(this.x - centerX, this.y - centerY);
                } else {
                    // Right corner
                    cornerCollision = true;
                    centerX =
                        player.x +
                        player.radius *
                            Math.cos(
                                player.drawnAngle +
                                    this.game.cylinderAngle +
                                    player.playerIntersectAng / 2 +
                                    Math.PI,
                            );
                    centerY =
                        player.y +
                        player.radius *
                            Math.sin(
                                player.drawnAngle +
                                    this.game.cylinderAngle +
                                    player.playerIntersectAng / 2 +
                                    Math.PI,
                            );
                    centerRadius = 0;
                    collisionVector = new Vector(this.x - centerX, this.y - centerY);
                }

                // If player is grounded, reconstruct their velocity from wall rotation
                if (player.grounded) {
                    const speed =
                        CYLINDER_RADIUS * (this.game.angVelocity + player.angularVelocity);
                    player.xVelocity =
                        speed * Math.cos(this.game.cylinderAngle + player.angle + Math.PI / 2);
                    player.yVelocity =
                        speed * Math.sin(this.game.cylinderAngle + player.angle + Math.PI / 2);

                    const ballSpeed = Math.sqrt(
                        this.xVelocity * this.xVelocity + this.yVelocity * this.yVelocity,
                    );
                    player.xVelocity +=
                        -ballSpeed * Math.cos(this.game.cylinderAngle + player.angle);
                    player.yVelocity +=
                        -ballSpeed * Math.sin(this.game.cylinderAngle + player.angle);
                }

                // Play hit sound
                playSound('hitSound');
                this.hit = true;

                // Elastic collision resolution using projection onto collision vector
                const playerVelocity = new Vector(player.xVelocity, player.yVelocity);
                const ballVelocity = new Vector(this.xVelocity, this.yVelocity);

                // Project player velocity onto collision vector
                const playerVelocityOnCollision = new Vector(collisionVector.x, collisionVector.y);
                const multiplier =
                    playerVelocity.dot(collisionVector) / collisionVector.dot(collisionVector);
                playerVelocityOnCollision.mult(multiplier);

                const playerVelocityPerpCollision = new Vector(
                    playerVelocity.x - playerVelocityOnCollision.x,
                    playerVelocity.y - playerVelocityOnCollision.y,
                );

                // Project ball velocity onto collision vector
                const ballVelocityOnCollision = new Vector(collisionVector.x, collisionVector.y);
                const ballMultiplier =
                    ballVelocity.dot(collisionVector) / collisionVector.dot(collisionVector);
                ballVelocityOnCollision.mult(ballMultiplier);

                const ballVelocityPerpCollision = new Vector(
                    ballVelocity.x - ballVelocityOnCollision.x,
                    ballVelocity.y - ballVelocityOnCollision.y,
                );

                // Swap collision components (elastic collision)
                const newPlayerVelocity = new Vector(
                    playerVelocityPerpCollision.x + ballVelocityOnCollision.x,
                    playerVelocityPerpCollision.y + ballVelocityOnCollision.y,
                );
                const newBallVelocity = new Vector(
                    ballVelocityPerpCollision.x + playerVelocityOnCollision.x,
                    ballVelocityPerpCollision.y + playerVelocityOnCollision.y,
                );

                player.xVelocity = newPlayerVelocity.x;
                player.yVelocity = newPlayerVelocity.y;
                this.xVelocity = newBallVelocity.x;
                this.yVelocity = newBallVelocity.y;

                // Reposition ball outside collision shape
                const collisionAngle = Math.atan2(collisionVector.y, collisionVector.x);
                this.x = centerX + (centerRadius + this.radius) * Math.cos(collisionAngle);
                this.y = centerY + (centerRadius + this.radius) * Math.sin(collisionAngle);

                // Iterative separation for corner collisions
                if (cornerCollision) {
                    let iterations = 0;
                    const MAX_ITERATIONS = 10;
                    while (iterations < MAX_ITERATIONS) {
                        const newDxA = this.x - player.x;
                        const newDyA = this.y - player.y;
                        const newDxB = this.x - player.cylinderCircleCenterX;
                        const newDyB = this.y - player.cylinderCircleCenterY;
                        const newDistA = Math.sqrt(newDxA * newDxA + newDyA * newDyA);
                        const newDistB = Math.sqrt(newDxB * newDxB + newDyB * newDyB);

                        if (
                            !(
                                newDistA < player.radius + this.radius &&
                                newDistB < CYLINDER_RADIUS + this.radius
                            )
                        ) {
                            break;
                        }

                        this.x += 2 * Math.cos(collisionAngle);
                        this.y += 2 * Math.sin(collisionAngle);
                        iterations++;
                    }
                }
            }
        }
    }

    handlePoints() {
        if (this.grounded && this.pauseNum === -1 && !this.hit) {
            playSound('oopsSound');

            // Calculate the ball's angle in range [0, 2π]
            const normalizedAngle = mod(Math.atan2(this.y, this.x), 2 * Math.PI);

            // Territory boundaries — includes cylinderAngle offset
            const player1Start =
                this.game.cylinderAngle + Math.PI - this.game.player1.fraction * Math.PI;
            const player1Territory = 2 * Math.PI * this.game.player1.fraction;

            // Normalize relative to player1's territory start
            const relativeAngle = mod(normalizedAngle - player1Start, 2 * Math.PI);

            // Ball in player's territory → that player scores
            if (relativeAngle <= player1Territory) {
                this.game.player1.score++;
                if (this.game.player1.score >= this.game.gameScore) {
                    this.game.player1.winning = true;
                }
                this.color = this.game.player1.color;
                this.glowColor = this.game.player1.glow;
            } else {
                this.game.player2.score++;
                if (this.game.player2.score >= this.game.gameScore) {
                    this.game.player2.winning = true;
                }
                this.color = this.game.player2.color;
                this.glowColor = this.game.player2.glow;
            }

            // Win by 2 rule
            const highestScore = Math.max(this.game.player1.score, this.game.player2.score);
            const scoreDifference =
                highestScore - Math.min(this.game.player1.score, this.game.player2.score);

            if (highestScore >= this.game.gameScore && scoreDifference >= MIN_SCORE_DIFFERENCE) {
                this.game.gameEnded = true;
                this.game.winner = this.game.player1.score > this.game.player2.score ? 1 : 2;
                playSound('winSound');
            }

            this.game.setFractions();
            this.pauseNum = this.game.num;
        } else if (this.pauseNum !== -1) {
            // Shrink animation
            this.radius -= 1;
            if (this.game.num - this.pauseNum >= 25) {
                this.game.player1.targetFraction = this.game.player1.targetTargetFraction;
                this.game.player2.targetFraction = this.game.player2.targetTargetFraction;
                this.reset();
            }
        }
        this.hit = false;
    }

    reset() {
        this.pauseNum = -1;
        this.grounded = false;
        this.x = 0;
        this.y = 0;
        this.radius = BALL_RADIUS;
        this.color = PALETTE.BALL;
        this.glowColor = PALETTE.BALL_GLOW;
        this.angle = Math.random() * 2 * Math.PI;
        this.xVelocity = BALL_INITIAL_SPEED * Math.cos(this.angle);
        this.yVelocity = BALL_INITIAL_SPEED * Math.sin(this.angle);
    }

    draw(ctx) {
        if (this.radius > 0) {
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = this.glowColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    update() {
        this.move();
        this.handleCollisions();
        this.handlePoints();
    }
}
