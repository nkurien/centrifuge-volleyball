// Constants
const CYLINDER_RADIUS = 200;
const PLAYER_COLORS = {
    YELLOW: { r: 255, g: 255, b: 0 },
};

// Key codes
const KEYS = {
    LEFT: 37,  // Left arrow
    RIGHT: 39, // Right arrow
    UP: 38,    // Up arrow
};

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    mult(m) {
        return new Vector(this.x * m, this.y * m);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

class Ball {
    constructor(game) {
        this.game = game;
        this.radius = 25;
        this.x = 0;
        this.y = 0;
        this.angle = Math.random() * 2 * Math.PI;
        
        // Initial velocity in random direction
        const initialSpeed = 2;
        this.xVelocity = initialSpeed * Math.cos(this.angle);
        this.yVelocity = initialSpeed * Math.sin(this.angle);
        
        this.color = '#FFFFFF';
        this.hitPower = 6;
        this.bounceEnergy = 0.95;
    }

    update() {
        // Update position
        this.x += this.xVelocity;
        this.y += this.yVelocity;

        // Very slight drag
        this.xVelocity *= 0.999;
        this.yVelocity *= 0.999;

        // Check cylinder collision
        const distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distanceFromCenter >= CYLINDER_RADIUS - this.radius) {
            // Calculate collision vectors
            const collisionVector = new Vector(this.x, this.y);
            const velocity = new Vector(this.xVelocity, this.yVelocity);
            
            // Normalize collision vector
            const collisionMagnitude = collisionVector.magnitude();
            const normalizedCollision = new Vector(
                collisionVector.x / collisionMagnitude,
                collisionVector.y / collisionMagnitude
            );

            // Calculate reflection
            const dot = velocity.dot(normalizedCollision);
            const reflection = normalizedCollision.mult(2 * dot);
            
            // Apply bounce with energy conservation
            this.xVelocity = (velocity.x - reflection.x) * this.bounceEnergy;
            this.yVelocity = (velocity.y - reflection.y) * this.bounceEnergy;

            // Add slight outward force to prevent sticking
            const outwardForce = 0.5;
            this.xVelocity -= normalizedCollision.x * outwardForce;
            this.yVelocity -= normalizedCollision.y * outwardForce;

            // Move ball to exact collision point to prevent multiple collisions
            this.x = (CYLINDER_RADIUS - this.radius - 1) * normalizedCollision.x;
            this.y = (CYLINDER_RADIUS - this.radius - 1) * normalizedCollision.y;
        }

        // Add rotation influence
        const rotationInfluence = 0.08;
        const tangentialX = -Math.sin(this.game.cylinderAngle);
        const tangentialY = Math.cos(this.game.cylinderAngle);
        this.xVelocity += tangentialX * rotationInfluence;
        this.yVelocity += tangentialY * rotationInfluence;

        this.checkPlayerCollision();
    }

    checkPlayerCollision() {
        const dx = this.x - this.game.player.x;
        const dy = this.y - this.game.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius + this.game.player.radius) {
            const collisionVector = new Vector(dx, dy);
            const normalizedCollision = new Vector(
                dx / distance,
                dy / distance
            );

            // Calculate player's velocity vector
            let playerVelocity;
            if (this.game.player.grounded) {
                const tangentialSpeed = this.game.player.angularVelocity * CYLINDER_RADIUS;
                playerVelocity = new Vector(
                    -Math.sin(this.game.player.angle) * tangentialSpeed,
                    Math.cos(this.game.player.angle) * tangentialSpeed
                );
            } else {
                playerVelocity = new Vector(
                    this.game.player.xVelocity,
                    this.game.player.yVelocity
                );
            }

            // Combine velocities
            const ballVelocity = new Vector(this.xVelocity, this.yVelocity);
            const relativeVelocity = ballVelocity.subtract(playerVelocity);
            
            // Calculate new velocity
            const hitSpeed = this.hitPower + playerVelocity.magnitude() * 0.5;
            this.xVelocity = normalizedCollision.x * hitSpeed;
            this.yVelocity = normalizedCollision.y * hitSpeed;

            // Move ball outside player
            this.x = this.game.player.x + (this.radius + this.game.player.radius + 1) * normalizedCollision.x;
            this.y = this.game.player.y + (this.radius + this.game.player.radius + 1) * normalizedCollision.y;

            // Play hit sound
            const hitSound = document.getElementById('hitSound');
            if (hitSound) hitSound.play();
        }
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.angle = Math.random() * 2 * Math.PI;
        const initialSpeed = 2;
        this.xVelocity = initialSpeed * Math.cos(this.angle);
        this.yVelocity = initialSpeed * Math.sin(this.angle);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.angle = 0;
        this.radius = 40;
        this.color = PLAYER_COLORS.YELLOW;
        this.angularVelocity = 0;
        this.maxVelocity = 0.2;
        this.acceleration = 0.01;
        this.leftPressed = false;
        this.rightPressed = false;
        
        // New properties for jumping
        this.grounded = true;
        this.x = CYLINDER_RADIUS;
        this.y = 0;
        this.xVelocity = 0;
        this.yVelocity = 0;
        this.jumpPower = 4;
    }

    jump() {
        if (this.grounded) {
            this.grounded = false;

            // Calculate initial jump velocity
            const speed = CYLINDER_RADIUS * (this.game.angVelocity + this.angularVelocity);
            this.xVelocity = speed * Math.cos(this.game.cylinderAngle + this.angle + Math.PI/2);
            this.yVelocity = speed * Math.sin(this.game.cylinderAngle + this.angle + Math.PI/2);
            
            // Add upward velocity
            const extraSpeed = -this.jumpPower;
            this.xVelocity += extraSpeed * Math.cos(this.game.cylinderAngle + this.angle);
            this.yVelocity += extraSpeed * Math.sin(this.game.cylinderAngle + this.angle);
        }
    }

    update() {
        if (this.grounded) {
            // Ground movement
            if (this.leftPressed && this.angularVelocity > -this.maxVelocity) {
                this.angularVelocity += this.acceleration;
            }
            if (this.rightPressed && this.angularVelocity < this.maxVelocity) {
                this.angularVelocity -= this.acceleration;
            }

            this.angle += this.angularVelocity;
            this.angularVelocity *= 0.9; // friction

            // Update position on cylinder
            this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
            this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
        } else {
            // Air movement
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            
            // Check if landed on cylinder
            if (Math.sqrt(this.x * this.x + this.y * this.y) >= CYLINDER_RADIUS) {
                this.grounded = true;
                this.angle = Math.atan2(this.y, this.x) - this.game.cylinderAngle;
                this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
                this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = 0.02;
        this.gameStarted = false;
        
        // Create player and ball
        this.player = new Player(this);
        this.ball = new Ball(this);
        
        // Center the coordinate system
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        
        // Bind event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start immediately for testing
        this.gameStarted = true;
    }

    handleKeyDown(event) {
        switch(event.keyCode) {
            case KEYS.LEFT:
                this.player.leftPressed = true;
                break;
            case KEYS.RIGHT:
                this.player.rightPressed = true;
                break;
            case KEYS.UP:
                this.player.jump();
                break;
        }
    }

    handleKeyUp(event) {
        switch(event.keyCode) {
            case KEYS.LEFT:
                this.player.leftPressed = false;
                break;
            case KEYS.RIGHT:
                this.player.rightPressed = false;
                break;
        }
    }

    update() {
        if (this.gameStarted) {
            this.cylinderAngle += this.angVelocity;
            this.player.update();
            this.ball.update();
        }
    }

    draw() {
        const ctx = this.ctx;
        
        // Clear the canvas
        ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2, 
                     this.canvas.width, this.canvas.height);

        // Draw the cylinder
        ctx.beginPath();
        ctx.arc(0, 0, CYLINDER_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Draw the ball
        this.ball.draw(ctx);

        // Draw the player
        this.player.draw(ctx);
    }

    gameLoop(currentTime) {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Start the game when the page loads
window.onload = () => {
    const game = new Game();
    game.gameLoop(0);
};