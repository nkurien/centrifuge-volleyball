// Constants
const CYLINDER_RADIUS = 200;
const PLAYER_COLORS = {
    YELLOW: { r: 255, g: 255, b: 0 },
    BLUE: { r: 0, g: 255, b: 255 }
};

// Key codes
const KEYS = {
    LEFT: 37,  // Left arrow
    RIGHT: 39, // Right arrow
    UP: 38,    // Up arrow
    A: 65,
    D: 68,
    W: 87,
    SPACE: 32
};

class Game {
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.cylinderAngle = 0;
        this.camAngle = 0;
        this.angVelocity = 0.02;
        this.camAngVelocity = 0.02;
        this.gameStarted = false;
        this.gameScore = 25;
        
        // Arrays to hold game objects
        this.players = [];
        this.balls = [];
        
        // Center the coordinate system
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        
        // Bind event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start the game loop
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
    }

    // Main game loop
    gameLoop(currentTime) {
        // Calculate delta time and FPS
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate > 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            document.getElementById('fps').textContent = this.fps;
            this.lastFpsUpdate = currentTime;
            this.frameCount = 0;
        }

        // Clear canvas
        this.ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2, 
                          this.canvas.width, this.canvas.height);

        if (this.gameStarted) {
            this.update(deltaTime);
            this.draw();
        } else {
            this.showIntro();
        }

        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    showIntro() {
        const ctx = this.ctx;
        ctx.fillStyle = '#00C0FF';
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CENTRIFUGE VOLLEYBALL', 0, -180);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px sans-serif';
        ctx.fillText('Press SPACE to start', 0, 0);
        ctx.fillText('Use LEFT/RIGHT arrows and UP to play', 0, 20);
    }

    handleKeyDown(event) {
        if (!this.gameStarted && event.keyCode === KEYS.SPACE) {
            this.startGame();
        }
    }

    handleKeyUp(event) {
        // Will handle key up events
    }

    startGame() {
        this.gameStarted = true;
        // Initialize players and ball (we'll implement this later)
    }

    update(deltaTime) {
        // Will handle game state updates
    }

    draw() {
        // Will handle drawing the game state
    }
}

// Start the game when the page loads
window.onload = () => {
    const game = new Game();
    game.gameLoop(0);
};