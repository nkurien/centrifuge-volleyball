// Constants
const CYLINDER_RADIUS = 280;
const PLAYER_COLORS = {
    YELLOW: { r: 255, g: 255, b: 0 },
    BLUE: { r: 0, g: 255, b: 255 }
};

// Key codes for both players
const KEYS = {
    // Player 1 controls
    P1_LEFT: 37,  // Left arrow
    P1_RIGHT: 39, // Right arrow
    P1_UP: 38,    // Up arrow

    // Player 2 controls
    P2_LEFT: 65,  // A
    P2_RIGHT: 68, // D
    P2_UP: 87    // W
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

        // Initial speed
        const initialSpeed = 1.5;
        this.xVelocity = initialSpeed * Math.cos(this.angle);
        this.yVelocity = initialSpeed * Math.sin(this.angle);

        this.color = '#FFFFFF';
        this.hitPower = 3;
        this.bounceEnergy = 0.95;
        this.dragFactor = 0.995;
    }

    update() {
        // Update position
        this.x += this.xVelocity;
        this.y += this.yVelocity;

        // Apply drag
        this.xVelocity *= this.dragFactor;
        this.yVelocity *= this.dragFactor;

        // Check cylinder collision
        const distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distanceFromCenter >= CYLINDER_RADIUS - this.radius) {
            const collisionVector = new Vector(this.x, this.y);
            const velocity = new Vector(this.xVelocity, this.yVelocity);

            const collisionMagnitude = collisionVector.magnitude();
            const normalizedCollision = new Vector(
                collisionVector.x / collisionMagnitude,
                collisionVector.y / collisionMagnitude
            );

            const dot = velocity.dot(normalizedCollision);
            const reflection = normalizedCollision.mult(2 * dot);

            this.xVelocity = (velocity.x - reflection.x) * this.bounceEnergy;
            this.yVelocity = (velocity.y - reflection.y) * this.bounceEnergy;

            const outwardForce = 0.3;
            this.xVelocity -= normalizedCollision.x * outwardForce;
            this.yVelocity -= normalizedCollision.y * outwardForce;

            this.x = (CYLINDER_RADIUS - this.radius - 1) * normalizedCollision.x;
            this.y = (CYLINDER_RADIUS - this.radius - 1) * normalizedCollision.y;
        }

        // Rotation influence
        const rotationInfluence = 0.06;
        const tangentialX = -Math.sin(this.game.cylinderAngle);
        const tangentialY = Math.cos(this.game.cylinderAngle);
        this.xVelocity += tangentialX * rotationInfluence;
        this.yVelocity += tangentialY * rotationInfluence;

        // Check collisions with both players
        this.checkPlayerCollision(this.game.player1);
        this.checkPlayerCollision(this.game.player2);
    }

    checkPlayerCollision(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius + player.radius) {
            const normalizedCollision = new Vector(
                dx / distance,
                dy / distance
            );

            // Calculate player's velocity vector
            let playerVelocity;
            if (player.grounded) {
                const tangentialSpeed = player.angularVelocity * CYLINDER_RADIUS;
                playerVelocity = new Vector(
                    -Math.sin(player.angle) * tangentialSpeed,
                    Math.cos(player.angle) * tangentialSpeed
                );
            } else {
                playerVelocity = new Vector(
                    player.xVelocity,
                    player.yVelocity
                );
            }

            // Calculate current ball speed
            const currentSpeed = Math.sqrt(this.xVelocity * this.xVelocity + this.yVelocity * this.yVelocity);

            // Combine base hit power with player velocity
            const hitSpeed = this.hitPower +
                playerVelocity.magnitude() * 0.3 +
                currentSpeed * 0.2;

            this.xVelocity = normalizedCollision.x * hitSpeed;
            this.yVelocity = normalizedCollision.y * hitSpeed;

            // Move ball outside player
            this.x = player.x + (this.radius + player.radius + 1) * normalizedCollision.x;
            this.y = player.y + (this.radius + player.radius + 1) * normalizedCollision.y;

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
    constructor(game, playerNumber) {
        this.game = game;
        this.playerNumber = playerNumber;
        this.score = 0;

        // Set initial position based on player number
        this.angle = playerNumber === 1 ? 0 : Math.PI;
        this.radius = 40;
        this.color = playerNumber === 1 ? PLAYER_COLORS.YELLOW : PLAYER_COLORS.BLUE;

        // Movement properties
        this.angularVelocity = 0;
        this.maxVelocity = 0.2;
        this.acceleration = 0.01;
        this.leftPressed = false;
        this.rightPressed = false;

        // Jump properties
        this.grounded = true;
        this.x = CYLINDER_RADIUS * Math.cos(this.angle);
        this.y = CYLINDER_RADIUS * Math.sin(this.angle);
        this.xVelocity = 0;
        this.yVelocity = 0;
        this.jumpPower = 4;

        // Visual feedback
        this.lastHitTime = 0;
        this.glowDuration = 1000;
        this.glowIntensity = 0;
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

    increaseScore() {
        this.score++;
        // Check for win condition (first to 5 points)
        if (this.score >= 5) {
            this.game.endGame(this.playerNumber);
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
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = 600;
        this.canvas.height = 600;

        // Game state
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = 0.02;
        this.gameStarted = false;
        this.gameEnded = false;
        this.winner = null;

        // Create players and ball
        this.player1 = new Player(this, 1);
        this.player2 = new Player(this, 2);
        this.ball = new Ball(this);

        // Center the coordinate system
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);

        // Bind event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Start the game
        this.gameStarted = true;
        this.gameLoop(0);
    }

    handleKeyDown(event) {
        // Player 1 controls
        switch(event.keyCode) {
            case KEYS.P1_LEFT:
                this.player1.leftPressed = true;
                break;
            case KEYS.P1_RIGHT:
                this.player1.rightPressed = true;
                break;
            case KEYS.P1_UP:
                this.player1.jump();
                break;

            // Player 2 controls
            case KEYS.P2_LEFT:
                this.player2.leftPressed = true;
                break;
            case KEYS.P2_RIGHT:
                this.player2.rightPressed = true;
                break;
            case KEYS.P2_UP:
                this.player2.jump();
                break;
        }
    }

    handleKeyUp(event) {
        // Player 1 controls
        switch(event.keyCode) {
            case KEYS.P1_LEFT:
                this.player1.leftPressed = false;
                break;
            case KEYS.P1_RIGHT:
                this.player1.rightPressed = false;
                break;

            // Player 2 controls
            case KEYS.P2_LEFT:
                this.player2.leftPressed = false;
                break;
            case KEYS.P2_RIGHT:
                this.player2.rightPressed = false;
                break;
        }
    }

    update() {
        if (this.gameStarted && !this.gameEnded) {
            this.cylinderAngle += this.angVelocity;
            this.player1.update();
            this.player2.update();
            this.ball.update();

            // Check for scoring
            const ballAngle = Math.atan2(this.ball.y, this.ball.x);
            const distanceFromCenter = Math.sqrt(this.ball.x * this.ball.x + this.ball.y * this.ball.y);

            if (distanceFromCenter >= CYLINDER_RADIUS - this.ball.radius) {
                // Check which half the ball landed in
                if (Math.abs(ballAngle) < Math.PI/2) {
                    this.player2.increaseScore();
                } else {
                    this.player1.increaseScore();
                }
                this.ball.reset();
            }
        }
    }

    draw() {
        const ctx = this.ctx;

        // Clear the canvas
        ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2,
            this.canvas.width, this.canvas.height);

        // Draw the cylinder with player territories
        ctx.beginPath();
        ctx.arc(0, 0, CYLINDER_RADIUS, 0, Math.PI);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, CYLINDER_RADIUS, Math.PI, Math.PI * 2);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw the score
        ctx.font = '24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.player1.score} - ${this.player2.score}`, 0, -CYLINDER_RADIUS - 20);

        // Draw the players and ball
        this.player1.draw(ctx);
        this.player2.draw(ctx);
        this.ball.draw(ctx);

        // Draw game over message if needed
        if (this.gameEnded) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-150, -50, 300, 100);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Player ${this.winner} Wins!`, 0, 0);
        }
    }

    endGame(winner) {
        this.gameEnded = true;
        this.winner = winner;
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