// Player class — extracted from original game.js Player.
// Preserves: inertial-frame movement (no fictitious forces), crescent rendering,
// score display rotated with camera, circle-circle intersection geometry.

import {
    CYLINDER_RADIUS,
    PLAYER_RADIUS,
    PLAYER_MAX_VELOCITY,
    PLAYER_ANG_ACCEL,
    PLAYER_JUMP_POWER,
    PLAYER_FRICTION,
    CONTROLS,
    PLAYER_COLORS,
    PALETTE,
} from './config.js';

const DIFFICULTY_PROFILES = {
    easy: {
        maxVelocityMulti: 0.35,
        jumpDistanceMulti: 3.0,
        color: { r: 41, g: 121, b: 255 }, // Blue
        glow: 'rgba(41,121,255,0.55)',
        deadzone: 0.15,
        jumpHesitation: 0.8
    },
    medium: {
        maxVelocityMulti: 0.8,
        jumpDistanceMulti: 4.0,
        color: { r: 41, g: 121, b: 255 }, // Blue
        glow: 'rgba(41,121,255,0.55)',
        deadzone: 0.05, // Uses default if not specified, but good to be explicit
        jumpHesitation: 0.6
    },
    hard: {
        maxVelocityMulti: 1.5, // Hilariously fast
        jumpDistanceMulti: 4.5,
        color: { r: 230, g: 40, b: 60 }, // Red
        glow: 'rgba(230,40,60,0.55)',
        deadzone: 0.01,
        jumpHesitation: 1.0 // Hard AI never jumps
    }
};

function getAngleDiff(angle1, angle2) {
    let diff = angle1 - angle2;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

export class Player {
    constructor(game, playerNumber, isAI = false, difficulty = 'medium') {
        this.game = game;
        this.playerNumber = playerNumber;
        this.isAI = isAI;
        this.difficulty = difficulty;

        // Initial position on the cylinder wall
        this.x = CYLINDER_RADIUS * Math.cos((2 * Math.PI * playerNumber) / 2 + Math.PI);
        this.y = CYLINDER_RADIUS * Math.sin((2 * Math.PI * playerNumber) / 2 + Math.PI);
        this.angle = Math.atan2(this.y, this.x);

        // Movement
        this.angularVelocity = 0;
        this.xVelocity = 0;
        this.yVelocity = 0;
        this.jumpPower = PLAYER_JUMP_POWER;
        this.angAccel = PLAYER_ANG_ACCEL;
        this.maxVelocity = PLAYER_MAX_VELOCITY;
        this.grounded = true;

        // Visual
        this.radius = PLAYER_RADIUS;
        this.targetRadius = this.radius;

        // Crescent geometry (computed each draw call, also used by collision code)
        this.cylinderCircleCenterX = 0;
        this.cylinderCircleCenterY = 0;
        this.cylinderIntersectAng = 0;
        this.playerIntersectAng = 0;
        this.drawnAngle = this.angle;

        // Controls (using event.code)
        const ctrl = CONTROLS[`PLAYER${playerNumber}`];
        this.keyLeft = ctrl.LEFT;
        this.keyRight = ctrl.RIGHT;
        this.keyJump = ctrl.JUMP;
        this.keyLeftPressed = false;
        this.keyRightPressed = false;

        // Scoring & territory
        this.score = 0;
        const color = PLAYER_COLORS[playerNumber];
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.color = `rgb(${this.r},${this.g},${this.b})`;
        this.glow = color.glow;

        this.fraction = 1 / 2;
        this.targetFraction = this.fraction;
        this.targetTargetFraction = this.fraction;
        this.winning = false;

        this.type = 1; // CentrifugeObject_PLAYER
        
        if (this.isAI) {
            this.applyDifficulty();
        }
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.applyDifficulty();
    }

    jump() {
        if (!this.grounded) return;
        this.grounded = false;

        // Tangential velocity from cylinder rotation + player's own angular velocity
        const speed = CYLINDER_RADIUS * (this.game.angVelocity + this.angularVelocity);
        this.xVelocity = speed * Math.cos(this.game.cylinderAngle + this.angle + Math.PI / 2);
        this.yVelocity = speed * Math.sin(this.game.cylinderAngle + this.angle + Math.PI / 2);

        // Radial inward jump impulse
        const extraSpeed = -this.jumpPower;
        this.xVelocity += extraSpeed * Math.cos(this.game.cylinderAngle + this.angle);
        this.yVelocity += extraSpeed * Math.sin(this.game.cylinderAngle + this.angle);
    }

    move() {
        if (!this.grounded) {
            // Inertial frame — straight-line motion, no fictitious forces
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            this.angle = Math.atan2(this.y, this.x) - this.game.cylinderAngle;

            // Land on cylinder wall
            if (Math.sqrt(this.x * this.x + this.y * this.y) >= CYLINDER_RADIUS) {
                this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
                this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
                this.grounded = true;
            }
        }

        if (this.grounded) {
            if (this.keyLeftPressed && this.angularVelocity > -this.maxVelocity) {
                this.angularVelocity += this.angAccel;
            }
            if (this.keyRightPressed && this.angularVelocity < this.maxVelocity) {
                this.angularVelocity -= this.angAccel;
            }

            this.angle += this.angularVelocity;
            this.angularVelocity *= PLAYER_FRICTION;

            this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
            this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
        }
    }

    draw(ctx) {
        this.drawnAngle = this.angle;

        // Compute circle-circle intersection geometry (law of cosines / sines)
        this.cylinderIntersectAng =
            2 * Math.acos(1 - 0.5 * Math.pow(this.radius / CYLINDER_RADIUS, 2));
        this.playerIntersectAng =
            2 *
            Math.asin((CYLINDER_RADIUS / this.radius) * Math.sin(this.cylinderIntersectAng / 2));

        // Center of the cylinder-radius arc that forms the flat side of the crescent
        this.cylinderCircleCenterX =
            this.x - CYLINDER_RADIUS * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        this.cylinderCircleCenterY =
            this.y - CYLINDER_RADIUS * Math.sin(this.drawnAngle + this.game.cylinderAngle);

        // Draw crescent shape with glow
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.glow;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);

        ctx.arc(
            this.cylinderCircleCenterX,
            this.cylinderCircleCenterY,
            CYLINDER_RADIUS,
            this.drawnAngle + this.game.cylinderAngle - this.cylinderIntersectAng / 2,
            this.drawnAngle + this.game.cylinderAngle + this.cylinderIntersectAng / 2,
            false,
        );

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            this.drawnAngle + this.game.cylinderAngle - this.playerIntersectAng / 2 + Math.PI,
            this.drawnAngle + this.game.cylinderAngle + this.playerIntersectAng / 2 + Math.PI,
            false,
        );

        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();

        // Draw score text on the player body, rotated with camera
        ctx.fillStyle = PALETTE.BG;
        const centerX =
            this.x - (this.radius / 2) * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        const centerY =
            this.y - (this.radius / 2) * Math.sin(this.drawnAngle + this.game.cylinderAngle);

        ctx.translate(centerX, centerY);
        ctx.rotate(this.game.camAngle);
        ctx.fillText(this.score, 0, 0);
        ctx.rotate(-this.game.camAngle);
        ctx.translate(-centerX, -centerY);

        // Smooth territory fraction animation
        this.fraction += (this.targetFraction - this.fraction) / 10;
    }

    applyDifficulty() {
        const profile = DIFFICULTY_PROFILES[this.difficulty] || DIFFICULTY_PROFILES['medium'];
        this.maxVelocity = PLAYER_MAX_VELOCITY * profile.maxVelocityMulti;
        this.jumpDistance = this.radius * profile.jumpDistanceMulti;
        this.r = profile.color.r;
        this.g = profile.color.g;
        this.b = profile.color.b;
        this.color = `rgb(${this.r},${this.g},${this.b})`;
        this.glow = profile.glow;
    }

    getPredictedLandingAngle(ball) {
        const r_eff = CYLINDER_RADIUS - ball.radius;
        const A = ball.xVelocity * ball.xVelocity + ball.yVelocity * ball.yVelocity;
        const B = 2 * (ball.x * ball.xVelocity + ball.y * ball.yVelocity);
        const C = ball.x * ball.x + ball.y * ball.y - r_eff * r_eff;
        
        let t = -1;
        if (A > 0.0001) {
            const discriminant = B * B - 4 * A * C;
            if (discriminant >= 0) {
                const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
                const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);
                if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
                else if (t1 > 0) t = t1;
                else if (t2 > 0) t = t2;
            }
        }
        
        if (t > 0) {
            // Predict ball path using linear velocity approximation.
            // Note: This ignores the quadratic curvature introduced by CYLINDER_GRAVITY.
            // Since time-to-impact (t) is usually small, the linear approximation works 
            // well enough to position the AI effectively without needing a numeric solver.
            const landX = ball.x + t * ball.xVelocity;
            const landY = ball.y + t * ball.yVelocity;
            const landInertialAngle = Math.atan2(landY, landX);
            const futureCylinderAngle = this.game.cylinderAngle + t * this.game.angVelocity;
            const predictedLandAngle = ((landInertialAngle - futureCylinderAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
            
            return { angle: predictedLandAngle, t: t };
        }
        return null;
    }

    updateAI() {
        const ball = this.game.ball;
        if (ball.pauseNum !== -1) {
            this.keyLeftPressed = false;
            this.keyRightPressed = false;
            return;
        }

        const ballAngle = ((ball.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const myAngle = ((this.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        let targetAngle = ballAngle; // Default: Golden Retriever (Easy)

        if (this.difficulty === 'medium') {
            const diffHome = getAngleDiff(ballAngle, Math.PI); // Home is now Player 1's territory (Math.PI)
            
            // Check if ball is in Player 2's territory (around 0)
            const diffP2 = getAngleDiff(ballAngle, 0);
            const inP2Territory = Math.abs(diffP2) <= this.fraction * Math.PI;
            
            if (inP2Territory) {
                // If it's falling in our territory, get out of the way so we can score!
                targetAngle = Math.PI; // Return to P1's territory
            } else {
                // It's in P1's territory, track it to prevent them from scoring
                // Human error wobble
                targetAngle = ballAngle + Math.sin(this.game.num / 20) * 0.15;
            }
        } else if (this.difficulty === 'hard') {
            if (ball.grounded) {
                targetAngle = ballAngle;
            } else {
                const prediction = this.getPredictedLandingAngle(ball);
                
                if (prediction) {
                    const predictedLandAngle = prediction.angle;
                    const t = prediction.t;
                    
                    // Check if predicted landing is in P2's territory (around 0)
                    const diffP2 = getAngleDiff(predictedLandAngle, 0);
                    const landsInP2 = Math.abs(diffP2) <= this.fraction * Math.PI;
                    
                    if (landsInP2) {
                        // Let it land to score! Get out of the way.
                        targetAngle = Math.PI; 
                    } else {
                        // Intercept it with a "caress" offset.
                        // We want to bounce it towards P2's territory (angle 0).
                        // So we stand slightly on the opposite side of the ball.
                        const diffToZero = getAngleDiff(predictedLandAngle, 0);
                        
                        // PLAYER_RADIUS = 14, CYLINDER_RADIUS = 320. 
                        // Base offset for an angled bounce towards 0.
                        const caressOffset = 0.025;
                        let desiredAngle;
                        if (diffToZero > 0) {
                            desiredAngle = predictedLandAngle + caressOffset;
                        } else {
                            desiredAngle = predictedLandAngle - caressOffset;
                        }
                        
                        // Dynamic Sweep: we want the AI to hit the ball while moving forward.
                        // We do this by making the target angle track towards the desiredAngle 
                        // as the ball falls. The AI chases this moving target, building momentum, 
                        // and arrives exactly at desiredAngle at the moment of impact.
                        
                        // Impact happens slightly before t=0 because the player's head sticks out (14px).
                        // The ball's terminal velocity is ~10-15px/frame, so impact is ~1.5 frames early.
                        const timeToImpact = Math.max(0, t - 1.5);
                        
                        // Sweep speed is 0.025 rad/frame (~8px/frame), capped at 0.3 rad away.
                        const sweepOffset = Math.min(timeToImpact * 0.025, 0.3);
                        
                        if (diffToZero > 0) {
                            targetAngle = desiredAngle + sweepOffset;
                        } else {
                            targetAngle = desiredAngle - sweepOffset;
                        }
                    }
                } else {
                    targetAngle = Math.PI; // Default home
                }
            }
        }
        
        targetAngle = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const diff = getAngleDiff(targetAngle, myAngle);

        // Deadzone to prevent jittering
        const profile = DIFFICULTY_PROFILES[this.difficulty] || DIFFICULTY_PROFILES['medium'];
        let deadzone = profile.deadzone || 0.05;

        this.keyLeftPressed = diff > deadzone;
        this.keyRightPressed = diff < -deadzone;

        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if ball is approaching
        const approaching = (dx * ball.xVelocity + dy * ball.yVelocity) < 0;

        if (dist < this.jumpDistance && this.grounded && approaching) {
            let shouldJump = true;

            // Are we trying to hit it or just stand in its way?
            // If it's falling in Player 1's territory (around Math.PI), we want to hit it back to Player 2's territory.
            // If it's falling in Player 2's territory, we already moved away, but if we are here, we definitely shouldn't jump.
            
            const diffP2 = getAngleDiff(ballAngle, 0);
            const inP2Territory = Math.abs(diffP2) <= this.fraction * Math.PI;

            if (inP2Territory) {
                // Never jump if it's in our territory, we shouldn't even be here!
                shouldJump = false;
            } else {
                // It's in P1's territory. Jumping helps us spike it into P2's territory.
                const profile = DIFFICULTY_PROFILES[this.difficulty] || DIFFICULTY_PROFILES['medium'];
                if (Math.random() < profile.jumpHesitation) {
                    shouldJump = false; 
                }
            }

            if (this.difficulty === 'medium' && Math.sin(this.game.num / 10) > 0.8) {
                shouldJump = false; // Reaction delay
            }
            
            if (shouldJump) {
                this.jump();
            }
        }
    }

    update() {
        if (this.isAI) {
            this.updateAI();
        }
        this.move();
    }
}
