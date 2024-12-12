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
        this.x *= m;
        this.y *= m;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const len = this.length();
        if (len !== 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }
}

class Ball {
    constructor(game) {
        this.game = game;
        this.radius = 25;
        this.x = 0;
        this.y = 0;
        this.angle = Math.random() * 2 * Math.PI;
        this.xVelocity = 2 * Math.cos(this.angle);
        this.yVelocity = 2 * Math.sin(this.angle);
        this.angularVelocity = 0;
        this.grounded = false;
        this.type = 0; // CentrifugeObject_BALL
        this.color = '#FFFFFF';
        this.pauseNum = -1;
        this.hit = false;
    }

    move() {
        if (!this.grounded) {
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            this.angle = Math.atan2(this.y, this.x) - this.game.cylinderAngle;

            if (Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)) >= CYLINDER_RADIUS - this.radius) {
                this.x = (CYLINDER_RADIUS - this.radius) * Math.cos(this.angle + this.game.cylinderAngle);
                this.y = (CYLINDER_RADIUS - this.radius) * Math.sin(this.angle + this.game.cylinderAngle);
                this.grounded = true;
            }
        }

        if (this.grounded) {
            this.angle += this.angularVelocity;
            this.angularVelocity *= 0.9; // friction
            this.x = (CYLINDER_RADIUS - this.radius) * Math.cos(this.angle + this.game.cylinderAngle);
            this.y = (CYLINDER_RADIUS - this.radius) * Math.sin(this.angle + this.game.cylinderAngle);
        }
    }

    handleCollisions() {
        for (let player of [this.game.player1, this.game.player2]) {
            if (this.pauseNum === -1) {
                const dxA = this.x - player.x;
                const dyA = this.y - player.y;
                const dxB = this.x - player.cylinderCircleCenterX;
                const dyB = this.y - player.cylinderCircleCenterY;
                const distA = Math.sqrt(Math.pow(dxA, 2) + Math.pow(dyA, 2));
                const distB = Math.sqrt(Math.pow(dxB, 2) + Math.pow(dyB, 2));

                if (distA < player.radius + this.radius && distB < CYLINDER_RADIUS + this.radius) {
                    let collisionVector;
                    let centerX = 0;
                    let centerY = 0;
                    let centerRadius = 0;
                    let cornerCollision = false;

                    const angleFromPlayerCenter = Math.atan2(this.y - player.y, this.x - player.x);
                    const angleFromCylinderCircleCenter = Math.atan2(
                        this.y - player.cylinderCircleCenterY,
                        this.x - player.cylinderCircleCenterX
                    );

                    const AFPCLowerBound = player.drawnAngle + this.game.cylinderAngle - player.playerIntersectAng/2 + Math.PI;
                    const AFPCUpperBound = player.drawnAngle + this.game.cylinderAngle + player.playerIntersectAng/2 + Math.PI;
                    const AFCCCLowerBound = player.drawnAngle + this.game.cylinderAngle - player.cylinderIntersectAng/2;
                    const AFCCCUpperBound = player.drawnAngle + this.game.cylinderAngle + player.cylinderIntersectAng/2;

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
                        centerX = player.x + player.radius * Math.cos(player.drawnAngle + this.game.cylinderAngle - player.playerIntersectAng/2 + Math.PI);
                        centerY = player.y + player.radius * Math.sin(player.drawnAngle + this.game.cylinderAngle - player.playerIntersectAng/2 + Math.PI);
                        centerRadius = 0;
                        const dxC = this.x - centerX;
                        const dyC = this.y - centerY;
                        collisionVector = new Vector(dxC, dyC);
                    } else {
                        // Right corner
                        cornerCollision = true;
                        centerX = player.x + player.radius * Math.cos(player.drawnAngle + this.game.cylinderAngle + player.playerIntersectAng/2 + Math.PI);
                        centerY = player.y + player.radius * Math.sin(player.drawnAngle + this.game.cylinderAngle + player.playerIntersectAng/2 + Math.PI);
                        centerRadius = 0;
                        const dxD = this.x - centerX;
                        const dyD = this.y - centerY;
                        collisionVector = new Vector(dxD, dyD);
                    }

                    if (player.grounded) {
                        const speed = CYLINDER_RADIUS * (this.game.angVelocity + player.angularVelocity);
                        player.xVelocity = speed * Math.cos(this.game.cylinderAngle + player.angle + Math.PI/2);
                        player.yVelocity = speed * Math.sin(this.game.cylinderAngle + player.angle + Math.PI/2);

                        const ballSpeed = Math.sqrt(Math.pow(this.xVelocity, 2) + Math.pow(this.yVelocity, 2));
                        const extraSpeed = -ballSpeed;
                        player.xVelocity += extraSpeed * Math.cos(this.game.cylinderAngle + player.angle);
                        player.yVelocity += extraSpeed * Math.sin(this.game.cylinderAngle + player.angle);
                    }

                    // Play hit sound and mark as hit
                    const hitSound = document.getElementById('hitSound');
                    if (hitSound) hitSound.play();
                    this.hit = true;

                    // Calculate new velocities using proper Vector operations
                    const playerVelocity = new Vector(player.xVelocity, player.yVelocity);
                    const ballVelocity = new Vector(this.xVelocity, this.yVelocity);
                    // Calculate velocities along collision vector
                    const playerVelocityOnCollision = new Vector(
                        collisionVector.x,
                        collisionVector.y
                    );
                    const multiplier = playerVelocity.dot(collisionVector) / collisionVector.dot(collisionVector);
                    playerVelocityOnCollision.mult(multiplier);

                    // Calculate perpendicular velocities
                    const playerVelocityPerpCollision = new Vector(
                        playerVelocity.x - playerVelocityOnCollision.x,
                        playerVelocity.y - playerVelocityOnCollision.y
                    );

                    const ballVelocityOnCollision = new Vector(
                        collisionVector.x,
                        collisionVector.y
                    );
                    const ballMultiplier = ballVelocity.dot(collisionVector) / collisionVector.dot(collisionVector);
                    ballVelocityOnCollision.mult(ballMultiplier);

                    const ballVelocityPerpCollision = new Vector(
                        ballVelocity.x - ballVelocityOnCollision.x,
                        ballVelocity.y - ballVelocityOnCollision.y
                    );

                    // Calculate final velocities
                    const newPlayerVelocity = new Vector(
                        playerVelocityPerpCollision.x + ballVelocityOnCollision.x,
                        playerVelocityPerpCollision.y + ballVelocityOnCollision.y
                    );
                    const newBallVelocity = new Vector(
                        ballVelocityPerpCollision.x + playerVelocityOnCollision.x,
                        ballVelocityPerpCollision.y + playerVelocityOnCollision.y
                    );

                    // Update velocities
                    player.xVelocity = newPlayerVelocity.x;
                    player.yVelocity = newPlayerVelocity.y;
                    this.xVelocity = newBallVelocity.x;
                    this.yVelocity = newBallVelocity.y;

                    // Update ball position
                    const collisionAngle = Math.atan2(collisionVector.y, collisionVector.x);
                    this.x = centerX + (centerRadius + this.radius) * Math.cos(collisionAngle);
                    this.y = centerY + (centerRadius + this.radius) * Math.sin(collisionAngle);

                    // Handle corner collision
                    if (cornerCollision) {
                        let iterations = 0;
                        const MAX_ITERATIONS = 10;
                        while (iterations < MAX_ITERATIONS) {
                            const newDxA = this.x - player.x;
                            const newDyA = this.y - player.y;
                            const newDxB = this.x - player.cylinderCircleCenterX;
                            const newDyB = this.y - player.cylinderCircleCenterY;
                            const newDistA = Math.sqrt(Math.pow(newDxA, 2) + Math.pow(newDyA, 2));
                            const newDistB = Math.sqrt(Math.pow(newDxB, 2) + Math.pow(newDyB, 2));

                            if (!(newDistA < player.radius + this.radius && newDistB < CYLINDER_RADIUS + this.radius)) {
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
    }

    handlePoints() {
        if (this.grounded && this.pauseNum === -1 && !this.hit) {
            // Play the "oops" sound effect
            const oopsSound = document.getElementById('oopsSound');
            if (oopsSound) oopsSound.play();

            // Calculate the ball's angle in range [0, 2π]
            const normalizedAngle = mod(Math.atan2(this.y, this.x), 2 * Math.PI);

            // Calculate territory boundaries based on player fractions
            const player1Start = this.game.cylinderAngle + Math.PI - this.game.player1.fraction * Math.PI;
            const player1Territory = 2 * Math.PI * this.game.player1.fraction;
            const player2Territory = 2 * Math.PI * this.game.player2.fraction;

            // Normalize the angle relative to player1's territory start
            const relativeAngle = mod(normalizedAngle - player1Start, 2 * Math.PI);

            // Determine which player's territory the ball landed in
            if (relativeAngle <= player1Territory) {
                // Ball landed in player 1's territory (Yellow)
                this.game.player1.score++; // Player 1 gets the point
                if (this.game.player1.score >= this.game.gameScore) {
                    this.game.player1.winning = true;
                }
                this.color = this.game.player1.color; // Ball takes territory color
            } else {
                // Ball landed in player 2's territory (Blue)
                this.game.player2.score++;
                if (this.game.player2.score >= this.game.gameScore) {
                    this.game.player2.winning = true;
                }
                this.color = this.game.player2.color;
            }

            // Update territory sizes - territories will shrink for players with higher scores
            this.game.setFractions();
            this.pauseNum = this.game.num;
        } else if (this.pauseNum !== -1) {
            // Handle ball reset animation
            this.radius -= 1;
            if (this.game.num - this.pauseNum >= 25) {
                for (let player of [this.game.player1, this.game.player2]) {
                    player.targetFraction = player.targetTargetFraction;
                }
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
        this.radius = 25;
        this.color = "#FFFFFF";
        this.angle = Math.random() * 2 * Math.PI;
        this.xVelocity = 2 * Math.cos(this.angle);
        this.yVelocity = 2 * Math.sin(this.angle);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        this.move();
        this.handleCollisions();
        this.handlePoints();
    }
}

class Player {
    constructor(game, playerNumber) {
        this.game = game;
        this.playerNumber = playerNumber;

        // Initial position
        this.x = CYLINDER_RADIUS * Math.cos(2 * Math.PI * playerNumber / 2);
        this.y = CYLINDER_RADIUS * Math.sin(2 * Math.PI * playerNumber / 2);
        this.angle = Math.atan2(this.y, this.x);

        // Movement properties
        this.angularVelocity = 0;
        this.xVelocity = 0;
        this.yVelocity = 0;
        this.jumpPower = 4;
        this.angAccel = 0.01;
        this.maxVelocity = 0.2;
        this.grounded = true;

        // Visual properties
        this.radius = 40;
        this.targetRadius = this.radius;
        this.cylinderCircleCenterX = 0;
        this.cylinderCircleCenterY = 0;
        this.keyLeft = 0;
        this.keyRight = 0;
        this.keyJump = 0;
        this.keyLeftPressed = false;
        this.keyRightPressed = false;
        this.score = 0;
        this.type = 1; // CentrifugeObject_PLAYER

        // Color based on player number
        if (playerNumber === 1) {
            this.r = 255;
            this.g = 255;
            this.b = 0;
        } else {
            this.r = 0;
            this.g = 255;
            this.b = 255;
        }
        this.color = `rgb(${this.r},${this.g},${this.b})`;
        this.drawnAngle = this.angle;

        // Set up controls based on player number
        if (playerNumber === 1) {
            this.keyLeft = KEYS.P1_LEFT;   // 37 (Left arrow)
            this.keyRight = KEYS.P1_RIGHT; // 39 (Right arrow)
            this.keyJump = KEYS.P1_UP;     // 38 (Up arrow)
        } else {
            this.keyLeft = KEYS.P2_LEFT;   // 65 (A)
            this.keyRight = KEYS.P2_RIGHT; // 68 (D)
            this.keyJump = KEYS.P2_UP;     // 87 (W)
        }

        // Territory control
        this.fraction = 1/2;  // Start with equal territory
        this.targetFraction = this.fraction;
        this.targetTargetFraction = this.fraction;
        this.winning = false;

        // Intersection geometry
        this.cylinderIntersectAng = 0;
        this.playerIntersectAng = 0;
    }

    jump() {
        if (this.grounded) {
            this.grounded = false;

            // Calculate initial velocity based on cylinder rotation
            const speed = CYLINDER_RADIUS * (this.game.angVelocity + this.angularVelocity);
            this.xVelocity = speed * Math.cos(this.game.cylinderAngle + this.angle + Math.PI/2);
            this.yVelocity = speed * Math.sin(this.game.cylinderAngle + this.angle + Math.PI/2);

            // Add jump velocity
            const extraSpeed = -this.jumpPower;
            this.xVelocity += extraSpeed * Math.cos(this.game.cylinderAngle + this.angle);
            this.yVelocity += extraSpeed * Math.sin(this.game.cylinderAngle + this.angle);
        }
    }

    move() {
        if (!this.grounded) {
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            this.angle = Math.atan2(this.y, this.x) - this.game.cylinderAngle;

            if (Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)) >= CYLINDER_RADIUS) {
                this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
                this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
                this.grounded = true;
            }
        }

        if (this.grounded) {
            console.log('Player state:', {
                leftPressed: this.keyLeftPressed,
                rightPressed: this.keyRightPressed,
                angularVelocity: this.angularVelocity
            });

            if (this.keyLeftPressed && this.angularVelocity > -this.maxVelocity) {
                this.angularVelocity += this.angAccel;
            }
            if (this.keyRightPressed && this.angularVelocity < this.maxVelocity) {
                this.angularVelocity -= this.angAccel;
            }

            this.angle += this.angularVelocity;
            this.angularVelocity *= 0.9; // friction

            this.x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
            this.y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);
        }
    }

    draw(ctx) {
        this.drawnAngle = this.angle;

        // Calculate intersection angles
        this.cylinderIntersectAng = 2 * Math.acos(1 - 0.5 * Math.pow(this.radius/CYLINDER_RADIUS, 2)); // law of cosines
        this.playerIntersectAng = 2 * Math.asin(CYLINDER_RADIUS/this.radius * Math.sin(this.cylinderIntersectAng/2)); // law of sines

        // Calculate cylinder circle center
        this.cylinderCircleCenterX = this.x - CYLINDER_RADIUS * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        this.cylinderCircleCenterY = this.y - CYLINDER_RADIUS * Math.sin(this.drawnAngle + this.game.cylinderAngle);

        // Draw the player shape
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);

        // Draw cylinder intersection arc
        ctx.arc(
            this.cylinderCircleCenterX,
            this.cylinderCircleCenterY,
            CYLINDER_RADIUS,
            this.drawnAngle + this.game.cylinderAngle - this.cylinderIntersectAng/2,
            this.drawnAngle + this.game.cylinderAngle + this.cylinderIntersectAng/2,
            false
        );

        // Draw player arc
        ctx.arc(
            this.x,
            this.y,
            this.radius,
            this.drawnAngle + this.game.cylinderAngle - this.playerIntersectAng/2 + Math.PI,
            this.drawnAngle + this.game.cylinderAngle + this.playerIntersectAng/2 + Math.PI,
            false
        );

        // Fill and draw score
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.fillStyle = "#000000";
        const centerX = this.x - this.radius/2 * Math.cos(this.drawnAngle + this.game.cylinderAngle);
        const centerY = this.y - this.radius/2 * Math.sin(this.drawnAngle + this.game.cylinderAngle);

        ctx.translate(centerX, centerY);
        ctx.rotate(this.game.camAngle);
        ctx.fillText(this.score, 0, 0);
        ctx.rotate(-this.game.camAngle);
        ctx.translate(-centerX, -centerY);

        // Update fraction for territory size
        this.fraction += (this.targetFraction - this.fraction) / 10;
    }

    update() {
        this.move();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('canv');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = 0.02;
        this.camAngVelocity = 0.02;
        this.gameStarted = true;
        this.gameEnded = false;
        this.winner = -1;
        this.gameScore = 25;
        this.num = 1150;  // Frame counter
        this.startTime = null;
        this.highPerformance = true;

        // Create players and ball
        this.player1 = new Player(this, 1);
        this.player2 = new Player(this, 2);
        this.ball = new Ball(this);

        // Generate stars for background
        this.stars = [];
        this.generateStars();

        // Center the coordinate system
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);

        // Bind event handlers with the correct context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);

        // Start game loop
        this.timer();
    }

    generateStars() {
        for(let i = 0; i < 1000; i++) {
            this.stars[i] = {
                x: Math.random() * 637 - 318,
                y: Math.random() * 637 - 318
            };
        }
    }

    renderStars() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 2;
        for(let i = 0; i < 1000; i++) {
            this.ctx.moveTo(this.stars[i].x, this.stars[i].y);
            this.ctx.lineTo(this.stars[i].x + 1, this.stars[i].y + 1);
        }
        this.ctx.stroke();
    }

    setFractions() {
        let total = 0;
        const players = [this.player1, this.player2];

        for(let i = 0; i < players.length; i++) {
            players[i].hScore = Math.max(players[i].score, 1);
            players[i].hScore = 1/players[i].hScore;
            total += players[i].hScore;
        }

        for(let i = 0; i < players.length; i++) {
            players[i].targetTargetFraction = players[i].hScore/total;
        }
    }

    timer() {
        const beg = new Date();

        // Update camera and cylinder rotation
        this.cylinderAngle += this.angVelocity;
        this.camAngle += this.camAngVelocity;

        this.num++;
        const m = this.num % 2300;
        if(m >= 1000 && m < 1150) {
            this.camAngVelocity += this.angVelocity/150;
        } else if(m >= 2150 && m < 2300) {
            this.camAngVelocity -= this.angVelocity/150;
        }

        // FPS calculation
        if(this.num % 20 == 0) {
            const now = new Date();
            if(this.startTime) {
                const framerate = 20/((now.getTime()-this.startTime.getTime())/1000);
                document.getElementById('fps').innerHTML = Math.round(framerate);
                if(framerate < 29) this.highPerformance = false;
            }
            this.startTime = now;
        }

        if(this.camAngVelocity != 0) {
            this.ctx.rotate(-this.camAngVelocity);
        }

        // Clear canvas with proper alpha for motion blur
        if(this.highPerformance) {
            this.ctx.fillStyle = "rgba(0,0,0,0.5)";
            this.ctx.fillRect(-318, -318, 637, 637);
        } else {
            this.ctx.clearRect(-318, -318, 637, 637);
        }

        // Render background stars
        this.renderStars();

        // Draw player territories
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 1;

        let angle = this.cylinderAngle + Math.PI - this.player1.fraction * Math.PI;
        const opacity = this.highPerformance ? 0.2 : 0.35;

        // Player 1 territory
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.arc(0, 0, CYLINDER_RADIUS + 4, angle,
            angle + this.player1.fraction * 2 * Math.PI, false);
        this.ctx.fillStyle = `rgba(${this.player1.r},${this.player1.g},${this.player1.b},${opacity})`;
        this.ctx.fill();
        this.ctx.stroke();

        // Player 2 territory
        angle += this.player1.fraction * 2 * Math.PI;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.arc(0, 0, CYLINDER_RADIUS + 4, angle,
            angle + this.player2.fraction * 2 * Math.PI, false);
        this.ctx.fillStyle = `rgba(${this.player2.r},${this.player2.g},${this.player2.b},${opacity})`;
        this.ctx.fill();
        this.ctx.stroke();

        // Draw cylinder outline
        this.ctx.beginPath();
        this.ctx.arc(0, 0, CYLINDER_RADIUS + 4, 0, 2 * Math.PI, false);
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 10;
        this.ctx.stroke();

        // Update and draw game objects
        this.player1.update();
        this.player2.update();
        this.ball.update();

        this.ball.draw(this.ctx);
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // Game over screen
        if(this.gameEnded) {
            this.ctx.fillStyle = "rgba(0,0,0,0.5)";
            this.ctx.fillRect(-150, -50, 300, 100);
            this.ctx.fillStyle = "#FFFFFF";
            this.ctx.font = "32px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`Player ${this.winner} Wins!`, 0, 0);
        } else {
            // Continue game loop
            const end = new Date();
            const computationTime = end.getTime() - beg.getTime();
            setTimeout(() => this.timer(), Math.max(30 - computationTime, 17));
        }
    }

    handleKeyDown(event) {
        // Player 1 controls
        if (event.keyCode === this.player1.keyLeft) {
            this.player1.keyLeftPressed = true;
        }
        if (event.keyCode === this.player1.keyRight) {
            this.player1.keyRightPressed = true;
        }
        if (event.keyCode === this.player1.keyJump && this.player1.grounded) {
            this.player1.jump();
        }

        // Player 2 controls
        if (event.keyCode === this.player2.keyLeft) {
            this.player2.keyLeftPressed = true;
        }
        if (event.keyCode === this.player2.keyRight) {
            this.player2.keyRightPressed = true;
        }
        if (event.keyCode === this.player2.keyJump && this.player2.grounded) {
            this.player2.jump();
        }
    }

    handleKeyUp(event) {
        // Player 1 controls
        if (event.keyCode === this.player1.keyLeft) {
            this.player1.keyLeftPressed = false;
        }
        if (event.keyCode === this.player1.keyRight) {
            this.player1.keyRightPressed = false;
        }

        // Player 2 controls
        if (event.keyCode === this.player2.keyLeft) {
            this.player2.keyLeftPressed = false;
        }
        if (event.keyCode === this.player2.keyRight) {
            this.player2.keyRightPressed = false;
        }
    }
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

// Start the game when the page loads
window.onload = () => {
    const game = new Game();
};