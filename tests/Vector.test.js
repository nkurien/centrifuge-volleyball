import { describe, it, expect } from 'vitest';
import { Vector } from '../src/js/Vector.js';

describe('Vector', () => {
    // ── Constructor ──────────────────────────────────────────

    describe('constructor', () => {
        it.each([
            [3, 4],
            [-1, -2],
            [0, 0],
            [1.5, -0.7],
        ])('stores x=%d, y=%d', (x, y) => {
            // Arrange & Act
            const v = new Vector(x, y);

            // Assert
            expect(v.x).toBe(x);
            expect(v.y).toBe(y);
        });
    });

    // ── dot() ────────────────────────────────────────────────

    describe('dot()', () => {
        it.each([
            { a: [1, 0], b: [0, 1], expected: 0, label: 'orthogonal → 0' },
            { a: [2, 3], b: [2, 3], expected: 13, label: 'parallel → sum of squares' },
            { a: [1, 0], b: [-1, 0], expected: -1, label: 'anti-parallel → negative' },
            { a: [3, -2], b: [4, 6], expected: 0, label: 'arbitrary orthogonal pair' },
            { a: [5, 7], b: [0, 0], expected: 0, label: 'with zero vector → 0' },
            { a: [2, 5], b: [3, -1], expected: 1, label: 'arbitrary non-zero' },
        ])('$label', ({ a, b, expected }) => {
            // Arrange
            const vecA = new Vector(a[0], a[1]);
            const vecB = new Vector(b[0], b[1]);

            // Act
            const result = vecA.dot(vecB);

            // Assert
            expect(result).toBe(expected);
        });
    });

    // ── mult() ───────────────────────────────────────────────

    describe('mult()', () => {
        it.each([
            { x: 2, y: 3, m: 4, ex: 8, ey: 12, label: 'positive scalar' },
            { x: 5, y: -3, m: 0, ex: 0, ey: 0, label: 'multiply by 0' },
            { x: 2, y: 3, m: -1, ex: -2, ey: -3, label: 'negate' },
            { x: 7, y: -4, m: 1, ex: 7, ey: -4, label: 'identity (×1)' },
            { x: 10, y: 20, m: 0.5, ex: 5, ey: 10, label: 'fractional' },
        ])('$label', ({ x, y, m, ex, ey }) => {
            // Arrange
            const v = new Vector(x, y);

            // Act
            v.mult(m);

            // Assert
            expect(v.x).toBeCloseTo(ex);
            expect(v.y).toBeCloseTo(ey);
        });

        it('returns this for chaining', () => {
            // Arrange
            const v = new Vector(1, 1);

            // Act
            const result = v.mult(2);

            // Assert
            expect(result).toBe(v);
        });
    });

    // ── length() ─────────────────────────────────────────────

    describe('length()', () => {
        it.each([
            { x: 1, y: 0, expected: 1, label: 'unit along x' },
            { x: 0, y: 1, expected: 1, label: 'unit along y' },
            { x: 0, y: 0, expected: 0, label: 'zero vector' },
            { x: 3, y: 4, expected: 5, label: '3-4-5 triangle' },
            { x: -3, y: -4, expected: 5, label: 'negative components' },
            { x: 1, y: 1, expected: Math.SQRT2, label: '(1,1) → √2' },
        ])('$label → $expected', ({ x, y, expected }) => {
            // Arrange
            const v = new Vector(x, y);

            // Act
            const len = v.length();

            // Assert
            expect(len).toBeCloseTo(expected);
        });
    });

    // ── normalize() ──────────────────────────────────────────

    describe('normalize()', () => {
        it.each([
            { x: 3, y: 4, label: '(3,4)' },
            { x: 1, y: 0, label: 'unit x' },
            { x: 1000, y: 0, label: 'large vector' },
            { x: -7, y: 3.5, label: 'negative+fractional' },
        ])('$label → unit length', ({ x, y }) => {
            // Arrange
            const v = new Vector(x, y);

            // Act
            v.normalize();

            // Assert
            expect(v.length()).toBeCloseTo(1);
        });

        it('preserves direction', () => {
            // Arrange
            const v = new Vector(3, 4);
            const originalAngle = v.angle();

            // Act
            v.normalize();

            // Assert
            expect(v.angle()).toBeCloseTo(originalAngle);
        });

        it('returns this for chaining', () => {
            // Arrange
            const v = new Vector(1, 1);

            // Act & Assert
            expect(v.normalize()).toBe(v);
        });

        it('zero vector stays zero (safe division)', () => {
            // Arrange
            const v = new Vector(0, 0);

            // Act
            v.normalize();

            // Assert
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
        });
    });

    // ── angle() ──────────────────────────────────────────────

    describe('angle()', () => {
        it.each([
            { x: 1, y: 0, expected: 0, label: '+x axis → 0' },
            { x: 0, y: 1, expected: Math.PI / 2, label: '+y axis → π/2' },
            { x: -1, y: 0, expected: Math.PI, label: '-x axis → π' },
            { x: 0, y: -1, expected: -Math.PI / 2, label: '-y axis → -π/2' },
            { x: 1, y: 1, expected: Math.PI / 4, label: 'diagonal (1,1) → π/4' },
            { x: -1, y: -1, expected: (-3 * Math.PI) / 4, label: 'diagonal (-1,-1) → -3π/4' },
        ])('$label', ({ x, y, expected }) => {
            // Arrange
            const v = new Vector(x, y);

            // Act
            const angle = v.angle();

            // Assert
            expect(angle).toBeCloseTo(expected);
        });
    });
});
