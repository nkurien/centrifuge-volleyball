// Lightweight DOM/Canvas mocks for testing game logic in Node.
// These provide just enough surface area to let Game, Player, and Ball
// constructors run without errors.

import { vi } from 'vitest';

// ── Mock Canvas 2D Context ──────────────────────────────────────────

function createMockCtx() {
    return {
        // Transform
        translate: vi.fn(),
        rotate: vi.fn(),
        setTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),

        // Drawing
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        roundRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),

        // Properties (writable)
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: '',
        textAlign: '',
        font: '',
    };
}

// ── Mock DOM ────────────────────────────────────────────────────────

const mockCanvas = {
    width: 637,
    height: 637,
    getContext: vi.fn(() => createMockCtx()),
    addEventListener: vi.fn(),
};

const mockElements = {
    canv: mockCanvas,
    fps: { textContent: '' },
    hitSound: { currentTime: 0, play: vi.fn(() => Promise.resolve()) },
    oopsSound: { currentTime: 0, play: vi.fn(() => Promise.resolve()) },
    winSound: { currentTime: 0, play: vi.fn(() => Promise.resolve()) },
};

/**
 * Install global DOM stubs. Call in a beforeEach / beforeAll block.
 * Returns the mock canvas and context for assertions.
 */
export function installDomMocks() {
    const ctx = createMockCtx();
    mockCanvas.getContext = vi.fn(() => ctx);

    globalThis.document = {
        getElementById: vi.fn((id) => mockElements[id] || null),
        addEventListener: vi.fn(),
        querySelectorAll: vi.fn(() => []),
    };

    globalThis.window = {
        matchMedia: vi.fn(() => ({ matches: false })),
        onload: null,
    };

    globalThis.requestAnimationFrame = vi.fn();

    return { canvas: mockCanvas, ctx };
}

/**
 * Remove global stubs.
 */
export function removeDomMocks() {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.requestAnimationFrame;
}

/**
 * Create a minimal mock Game object for testing Player and Ball
 * in isolation (without instantiating the full Game class).
 */
export function createMockGame(overrides = {}) {
    return {
        cylinderAngle: 0,
        camAngle: 0,
        angVelocity: 0.02,
        camAngVelocity: 0.02,
        gameStarted: false,
        gameEnded: false,
        winner: -1,
        gameScore: 25,
        num: 1150,
        highPerformance: true,
        player1: null, // set after creating players
        player2: null,
        ball: null,
        setFractions: vi.fn(),
        ...overrides,
    };
}
