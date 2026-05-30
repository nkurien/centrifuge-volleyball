// Game constants — extracted from the original monolith.
// All values match the working pre-refactor game exactly.

export const CYLINDER_RADIUS = 280;

export const PLAYER_RADIUS = 40;
export const PLAYER_MAX_VELOCITY = 0.2;
export const PLAYER_ANG_ACCEL = 0.01;
export const PLAYER_JUMP_POWER = 4;
export const PLAYER_FRICTION = 0.9;

export const BALL_RADIUS = 25;
export const BALL_INITIAL_SPEED = 2;
export const BALL_FRICTION = 0.9;

export const CYLINDER_ANG_VELOCITY = 0.02;
export const CYLINDER_CAM_ANG_VELOCITY = 0.02;
export const CYLINDER_EDGE_WIDTH = 10;

export const WIN_SCORE = 25;
export const MIN_SCORE_DIFFERENCE = 2;

export const CANVAS_SIZE = 637;
export const HALF_CANVAS = 318;
export const STAR_COUNT = 1000;

// Key codes (event.code strings — replacing deprecated keyCode)
export const CONTROLS = {
    PLAYER1: {
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        JUMP: 'ArrowUp',
    },
    PLAYER2: {
        LEFT: 'KeyA',
        RIGHT: 'KeyD',
        JUMP: 'KeyW',
    },
};

export const PLAYER_COLORS = {
    1: { r: 255, g: 255, b: 0 },   // Yellow
    2: { r: 0, g: 255, b: 255 },   // Cyan
};
