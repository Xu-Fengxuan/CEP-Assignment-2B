# Ocean Map Generator with Boat Navigation

An interactive ocean map generator using Wave Function Collapse algorithm with boat navigation. This project demonstrates procedural generation of ocean maps with islands, rocks, and water, featuring a controllable boat with sprite animations.

## Features

- **Procedural Ocean Generation**: Uses Wave Function Collapse algorithm to generate infinite ocean maps
- **Island Generation**: Creates realistic coastlines with proper tile connections
- **Rock Placement**: Scattered rocks throughout the ocean for visual interest
- **Boat Navigation**: Control a boat with WASD or arrow keys
- **Sprite Animation**: 16-directional boat sprites with smooth rotation
- **Collision Detection**: Realistic collision with land and obstacles
- **Infinite World**: Map sections generate dynamically as you explore
- **Wave Effects**: Animated wave effects around coastlines

## Controls

- **WASD** or **Arrow Keys**: Move the boat
- The boat will smoothly rotate to face the direction of movement
- Collisions with land will cause the boat to slide along edges

## Technical Implementation

- **Wave Function Collapse**: Generates coherent tile patterns for realistic coastlines
- **Sectioned Loading**: Maps are generated in sections for infinite exploration
- **Sprite Management**: Handles 16-directional boat sprites for smooth movement
- **Camera System**: Follows the boat with smooth interpolation
- **Collision System**: Circle-rectangle collision detection for realistic interaction

## Project Structure

- `index.html` - Main HTML file
- `sketch.js` - Main p5.js sketch and rendering
- `boat.js` - Boat class with movement and collision
- `wavefunctioncollapse.js` - Wave Function Collapse implementation and utilities
- `sprites/` - Sprite assets for boat and tiles
- `style.css` - Styling

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser (preferably with a local server)
3. Use WASD or arrow keys to navigate the boat
4. Explore the infinite procedurally generated ocean

## Credits

Created as part of Computing Elective Programme (CEP) Assignment 2B.

Sprites and game assets based on public domain resources.
