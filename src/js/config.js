// Game constants — physics values match the working pre-refactor game exactly.

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
export const CYLINDER_EDGE_WIDTH = 2;

export const WIN_SCORE = 25;
export const MIN_SCORE_DIFFERENCE = 2;

export const CANVAS_SIZE = 637;
export const HALF_CANVAS = 318;
export const STAR_COUNT = 1000;

export const CONTROLS = {
    PLAYER1: { LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', JUMP: 'ArrowUp' },
    PLAYER2: { LEFT: 'KeyA',      RIGHT: 'KeyD',       JUMP: 'KeyW'    },
};

// Palette — nathankurien.com dark theme + orange/blue player accents
export const PALETTE = {
    BG:         '#1d1e20',
    SURFACE:    '#2e2e33',
    BORDER:     '#333333',
    TEXT:       '#dadadb',
    TEXT_MUTED: '#9b9c9d',
    TERTIARY:   '#414244',
    STAR:       'rgba(196,196,197,0.3)',
    BALL:       '#dadadb',
    BALL_GLOW:  'rgba(218,218,219,0.45)',
};

export const PLAYER_COLORS = {
    1: { r: 255, g: 107, b: 43,  glow: 'rgba(255,107,43,0.55)'  }, // #FF6B2B — orange
    2: { r: 41,  g: 121, b: 255, glow: 'rgba(41,121,255,0.55)'  }, // #2979ff — blue
};
