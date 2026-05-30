// Vector utility class — extracted directly from the original game.
// Mutating API (mult, normalize) preserved to match original collision math.

export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    // Mutates in place — matches original behaviour used in collision code
    mult(m) {
        this.x *= m;
        this.y *= m;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // Mutates in place
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
