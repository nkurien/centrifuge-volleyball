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
    }

    update() {
        // Handle movement
        if (this.leftPressed && this.angularVelocity > -this.maxVelocity) {
            this.angularVelocity += this.acceleration;
        }
        if (this.rightPressed && this.angularVelocity < this.maxVelocity) {
            this.angularVelocity -= this.acceleration;
        }

        // Update position
        this.angle += this.angularVelocity;
        this.angularVelocity *= 0.9; // friction
    }

    draw(ctx) {
        const x = CYLINDER_RADIUS * Math.cos(this.angle + this.game.cylinderAngle);
        const y = CYLINDER_RADIUS * Math.sin(this.angle + this.game.cylinderAngle);

        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
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
        
        // Create player
        this.player = new Player(this);
        
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