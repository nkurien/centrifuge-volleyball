// Player class — extracted from original game.js Player.
// Preserves: inertial-frame movement (no fictitious forces), crescent rendering,
// score display rotated with camera, circle-circle intersection geometry.

import {
    CYLINDER_RADIUS, PLAYER_RADIUS, PLAYER_MAX_VELOCITY,
    PLAYER_ANG_ACCEL, PLAYER_JUMP_POWER, PLAYER_FRICTION,
    CONTROLS, PLAYER_COLORS, PALETTE,
} from './config.js';

export class Player {
    constructor(game, playerNumber) {
        this.game = game;
        this.playerNumber = playerNumber;

        // Initial position on the cylinder wall
        this.x = CYLINDER_RADIUS * Math.cos(2 * Math.PI * playerNumber / 2 + Math.PI);
        this.y = CYLINDER_RADIUS * Math.sin(2 * Math.PI * playerNumber / 2 + Math.PI);
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
        this.cylinderIntersectAng = 2 * Math.acos(
            1 - 0.5 * Math.pow(this.radius / CYLINDER_RADIUS, 2)
        );
        this.playerIntersectAng = 2 * Math.asin(
            (CYLINDER_RADIUS / this.radius) * Math.sin(this.cylinderIntersectAng / 2)
        );

        // Center of the cylinder-radius arc that forms the flat side of the crescent
        this.cylinderCircleCenterX = this.x - CYLINDER_RADIUS * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        this.cylinderCircleCenterY = this.y - CYLINDER_RADIUS * Math.sin(this.drawnAngle + this.game.cylinderAngle);

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
            false
        );

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            this.drawnAngle + this.game.cylinderAngle - this.playerIntersectAng / 2 + Math.PI,
            this.drawnAngle + this.game.cylinderAngle + this.playerIntersectAng / 2 + Math.PI,
            false
        );

        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();

        // Draw score text on the player body, rotated with camera
        ctx.fillStyle = PALETTE.BG;
        const centerX = this.x - (this.radius / 2) * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        const centerY = this.y - (this.radius / 2) * Math.sin(this.drawnAngle + this.game.cylinderAngle);

        ctx.translate(centerX, centerY);
        ctx.rotate(this.game.camAngle);
        ctx.fillText(this.score, 0, 0);
        ctx.rotate(-this.game.camAngle);
        ctx.translate(-centerX, -centerY);

        // Smooth territory fraction animation
        this.fraction += (this.targetFraction - this.fraction) / 10;
    }

    update() {
        this.move();
    }
}
