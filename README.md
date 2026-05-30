# Centrifuge Volleyball

During my A-Levels, my friends and I used to kill a lot of time during free periods playing random games on the school computers. Our favourite was [William Hoza's Centrifuge Volleyball](https://williamhoza.com/volleyball/). I always wanted to recreate it, and this is my attempt: a modern take with faithful physics and my own visual style.

**Play it:** [volleyball.nathankurien.com](https://volleyball.nathankurien.com)

---

## How to play

Two players are inside a rotating cylinder in space. Hit the ball into your opponent's territory to score. The more points you score, the smaller your territory gets. First to 25, win by 2.

| | Player 1 | Player 2 |
|---|---|---|
| Move | Arrow keys | A / D |
| Jump | Up arrow | W |

## Physics

Players and ball move in a true inertial frame. The rotating cylinder effect comes from the camera, not from simulated forces on the entities. Jumping inherits the wall's tangential velocity. Ball collisions use the actual crescent intersection geometry rather than approximating the player shape as a circle.

## Code

```
src/
├── index.html
├── styles/styles.css
├── assets/
└── js/
    ├── config.js    constants and colour palette
    ├── Game.js      game loop, rendering, input
    ├── Player.js    movement, crescent rendering, collision geometry
    ├── Ball.js      physics, collision resolution, scoring
    └── Vector.js    2D vector math
```

No build step. Serve the `src/` directory as a static site.
