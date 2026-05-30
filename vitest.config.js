import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
    },
    resolve: {
        alias: {
            '@': '/Users/nathan/Desktop/volleyball/src/js',
        },
    },
});
