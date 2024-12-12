# Centrifuge Volleyball

During my A-Levels, my friends and I used to kill a lot of time during our free periods playing random games on the school computers, hoping to bypass the school's filters to do so.

Our favourite game, by far, was [William Hoza's Centrifuge Volleyball](https://williamhoza.com/volleyball/). It's always been a big goal for me to recreate this game someday and I've finally attempted to do so here, as a kind of homage. 
## Game Overview

In Centrifuge Volleyball, players navigate around a rotating cylinder in space, competing to score points by making the ball land in their opponent's territory. As players score points, their territory shrinks, making it progressively harder to defend while giving them more opportunities to score.

## Features

- Real-time physics-based gameplay
- Dynamic territory sizing based on score
- Space-themed environment with star field background
- Smooth animations and visual effects
- Support for 2-4 players
- Performance optimization with adaptive frame rates

## Controls

### Player 1 (Yellow)
- ← Left Arrow: Move Left
- → Right Arrow: Move Right
- ↑ Up Arrow: Jump

### Player 2 (Blue)
- A: Move Left
- D: Move Right
- W: Jump

### Additional Players (to-do)
- Player 3 (Green): I, J, L keys
- Player 4 (Pink): Numpad 8, 4, 6

## Game Mechanics

### Basic Movement
- Players can move left and right along the cylinder's surface
- Jumping launches players off the surface with momentum from the cylinder's rotation
- Players automatically stick to the cylinder's surface when landing

### Scoring
- Score points by making the ball land in opponent's territory
- First player to reach 25 points wins (must win by 2)
- As players score more points, their territory shrinks, creating a dynamic difficulty balance

### Physics Features
- Realistic ball collision physics
- Momentum conservation during jumps
- Centrifugal force simulation
- Territory size adapts dynamically based on score difference

## Technical Features

- Built with vanilla JavaScript and HTML5 Canvas
- Efficient collision detection system
- Dynamic camera rotation
- Adaptive performance optimization
- Frame rate monitoring
- Responsive design

## Setup

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Recommended: Use Google Chrome for best performance

## Performance Notes

The game includes automatic performance optimization:
- Monitors frame rate and adjusts visual effects
- Adapts background rendering based on device capabilities
- Maintains smooth gameplay across different devices


## Code Structure

The game is built with four main classes:
- `Game`: Main game loop and state management
- `Player`: Player movement and collision handling
- `Ball`: Ball physics and scoring logic
- `Vector`: Utility class for physics calculations

## Browser Compatibility

- Optimized for Google Chrome
- Supports other modern browsers with HTML5 Canvas
- Requires JavaScript enabled

## Future Enhancements

Potential areas for future development:
- Online multiplayer support
- Additional power-ups
- Custom game modes
- Mobile device support
- Tournament mode