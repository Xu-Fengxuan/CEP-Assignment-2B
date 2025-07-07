// Ocean Map Generator with Wave Function Collapse
// Tile types and their indices
const TILES = {
  WATER: 0,
  ROCK: 1,
  LAND_TOP_LEFT: 2,
  LAND_TOP_MIDDLE: 3,
  LAND_TOP_RIGHT: 4,
  LAND_LEFT_MIDDLE: 5,
  LAND_MIDDLE: 6,
  LAND_RIGHT_MIDDLE: 7,
  LAND_BOTTOM_LEFT: 8,
  LAND_BOTTOM_MIDDLE: 9,
  LAND_BOTTOM_RIGHT: 10
};

// Boat directions
const BOAT_DIRECTIONS = {
  UP: 0,
  UP_RIGHT: 1,
  RIGHT: 2,
  DOWN_RIGHT: 3,
  DOWN: 4,
  DOWN_LEFT: 5,
  LEFT: 6,
  UP_LEFT: 7
};

// Game variables
let gameMap;
let boat;
let camera;
let coins;
let spriteSheet;
let boatSprites = [];
let tileSize = 32;
let sectionSize = 100;
let mapSections = {};
let score = 0;
let spritesLoaded = false;

// Key codes for movement
const KEY_CODES = {
  W: 'W'.charCodeAt(0),
  A: 'A'.charCodeAt(0),
  S: 'S'.charCodeAt(0),
  D: 'D'.charCodeAt(0),
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39
};

function preload() {
  // Load the tile spritesheet
  spriteSheet = loadImage('sprites/sheet.png');
  
  // Load all boat sprites (ship1.png to ship16.png)
  boatSprites = [];
  for (let i = 1; i <= 16; i++) {
    boatSprites[i - 1] = loadImage(`sprites/ship/ship${i}.png`);
  }
}

function setup() {
  createCanvas(800, 600);
  
  // Initialize game objects
  boat = new Boat(400, 300);
  camera = new Camera();
  coins = [];
  
  // Sprites should be loaded by now since preload() runs first
  spritesLoaded = spriteSheet && spriteSheet.width > 0 && boatSprites && boatSprites.length === 16;
  console.log("Sprites loaded:", spritesLoaded);
  console.log("Spritesheet dimensions:", spriteSheet ? `${spriteSheet.width}x${spriteSheet.height}` : "not loaded");
  console.log("Boat sprites count:", boatSprites ? boatSprites.length : 0);
  
  // Check if all boat sprites loaded properly
  if (boatSprites) {
    for (let i = 0; i < boatSprites.length; i++) {
      if (!boatSprites[i]) {
        console.warn(`Boat sprite ${i + 1} failed to load`);
      }
    }
  }
  
  // Generate initial sections around boat
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      generateSection(x, y);
    }
  }
  
  // Ensure boat spawns on water
  ensureBoatSpawnOnWater();
  
  // Report on initial map generation quality
  validateInitialMapGeneration();
  
  // Initialize gameplay system after map generation
  initializeGameplay();
  gameInitialized = true;
}

function draw() {
  background(0x30, 0x4c, 0xc4); // HEX #304cc4
  
  // Handle different game states
  if (gameState === GAME_STATES.START) {
    // Still show the game world being generated
    if (gameInitialized) {
      // Apply camera transform
      push();
      camera.apply();
      
      // Draw map
      drawMap();
      
      // Draw coins
      for (const coin of coins) {
        coin.draw();
      }
      
      // Draw boat
      boat.draw();
      
      pop();
      
      // Draw start screen overlay
      drawStartScreen();
    }
    return;
  }
  
  if (gameState === GAME_STATES.PLAYING) {
    // Update game objects
    boat.update();
    camera.follow(boat);
    camera.update();
    
    // Update coins
    for (const coin of coins) {
      coin.update();
    }
    
    // Update gameplay mechanics
    updateGameplay();
  } else {
    // Still update camera to follow boat even in non-playing states for visual consistency
    camera.follow(boat);
    camera.update();
  }
  
  // Apply camera transform
  push();
  camera.apply();
  
  // Draw map
  drawMap();
  
  // Draw coins
  for (const coin of coins) {
    coin.draw();
  }
  
  // Draw boat
  boat.draw();
  
  pop();
  
  // Draw UI
  drawUI();
  
  // Draw gameplay UI elements
  drawHealthShieldBars();
  drawBoatStats();
  drawShop();
  
  // Draw death screen if needed
  if (gameState === GAME_STATES.DEATH) {
    drawDeathScreen();
  }
}

function drawMap() {
  const startX = Math.floor((camera.x - 100) / tileSize);
  const endX = Math.ceil((camera.x + width + 100) / tileSize);
  const startY = Math.floor((camera.y - 100) / tileSize);
  const endY = Math.ceil((camera.y + height + 100) / tileSize);
  
  // First pass: Draw all tiles
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = boat.getTileAt(x, y);
      if (tile !== undefined) {
        drawTile(x * tileSize, y * tileSize, tile);
      }
    }
  }
  
  // Second pass: Draw wave effects on top
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = boat.getTileAt(x, y);
      if (tile !== undefined && isLandTile(tile)) {
        drawWaveEffect(x * tileSize, y * tileSize, tile);
        
        // Uncomment to debug collision areas:
        drawTileCollisionDebug(x * tileSize, y * tileSize, tile);
      }
    }
  }
}

function getTileFromSheet(index) {
  if (!spriteSheet) return null;
  
  const tilesPerRow = 20; // 640px ÷ 32px = 20 tiles per row
  const totalRows = 9;    // 288px ÷ 32px = 9 rows
  const maxTileIndex = tilesPerRow * totalRows - 1; // 179
  const tilePixelSize = 32; // Each tile is 32x32 pixels
  
  // Bounds check
  if (index < 0 || index > maxTileIndex) {
    console.warn(`Tile index ${index} is out of bounds (0-${maxTileIndex}). Using water tile instead.`);
    index = 171; // Fallback to water tile index (changed from 170)
    
    // If even the fallback is out of bounds, use index 0
    if (index > maxTileIndex) {
      index = 0;
    }
  }
  
  const tileX = (index % tilesPerRow) * tilePixelSize;
  const tileY = Math.floor(index / tilesPerRow) * tilePixelSize;
  
  // Removed excessive debug logging for water tiles
  
  return spriteSheet.get(tileX, tileY, tilePixelSize, tilePixelSize);
}

function getTileName(tileType) {
  switch(tileType) {
    case TILES.WATER: return "WAT";
    case TILES.ROCK: return "ROK";
    case TILES.LAND_TOP_LEFT: return "LTL";
    case TILES.LAND_TOP_MIDDLE: return "LTM";
    case TILES.LAND_TOP_RIGHT: return "LTR";
    case TILES.LAND_LEFT_MIDDLE: return "LLM";
    case TILES.LAND_MIDDLE: return "LMD";
    case TILES.LAND_RIGHT_MIDDLE: return "LRM";
    case TILES.LAND_BOTTOM_LEFT: return "LBL";
    case TILES.LAND_BOTTOM_MIDDLE: return "LBM";
    case TILES.LAND_BOTTOM_RIGHT: return "LBR";
    default: return "UNK";
  }
}

function drawTile(x, y, tileType) {
  push();
  translate(x, y);
  
  if (spriteSheet && spriteSheet.width > 0) {
    let tileIndex;
    let overlayIndex = null;
    
    switch(tileType) {
      case TILES.WATER:
        tileIndex = 171; // Changed from 170 to 171
        break;
      case TILES.ROCK:
        tileIndex = 48;
        break;
      case TILES.LAND_TOP_LEFT:
        tileIndex = 4; // Current index (8) - 4
        overlayIndex = 8; // Original tile as overlay
        break;
      case TILES.LAND_TOP_MIDDLE:
        tileIndex = 5; // Current index (9) - 4
        overlayIndex = 9; // Original tile as overlay
        break;
      case TILES.LAND_TOP_RIGHT:
        tileIndex = 6; // Current index (10) - 4
        overlayIndex = 10; // Original tile as overlay
        break;
      case TILES.LAND_LEFT_MIDDLE:
        tileIndex = 24; // Current index (28) - 4
        overlayIndex = 28; // Original tile as overlay
        break;
      case TILES.LAND_MIDDLE:
        tileIndex = 65; // Current index (69) - 4
        overlayIndex = 69; // Original tile as overlay
        break;
      case TILES.LAND_RIGHT_MIDDLE:
        tileIndex = 67; // New tile index (71) - 4
        overlayIndex = 71; // Changed from 29 to 71
        break;
      case TILES.LAND_BOTTOM_LEFT:
        tileIndex = 47;
        overlayIndex = 51;
        break;
      case TILES.LAND_BOTTOM_MIDDLE:
        tileIndex = 27;
        overlayIndex = 31;
        break;
      case TILES.LAND_BOTTOM_RIGHT:
        tileIndex = 7;
        overlayIndex = 11;
        break;
      default:
        tileIndex = 171; // Default to water (changed from 170)
    }
    
    // Draw main tile
    const mainTile = getTileFromSheet(tileIndex);
    if (mainTile) {
      imageMode(CORNER);
      image(mainTile, 0, 0, tileSize, tileSize);
    } else {
      // Fallback color if tile extraction fails
      drawFallbackTile(tileType);
    }
    
    // Draw overlay if needed
    if (overlayIndex !== null) {
      const overlayTile = getTileFromSheet(overlayIndex);
      if (overlayTile) {
        imageMode(CORNER);
        image(overlayTile, 0, 0, tileSize, tileSize);
      }
    }
  } else {
    // Fallback to colored rectangles if sprites not loaded
    drawFallbackTile(tileType);
  }
  
  // Add debug text showing tile name
  // fill(255, 255, 255);
  // stroke(0);
  // strokeWeight(1);
  // textSize(8);
  // textAlign(LEFT, TOP);
  // text(getTileName(tileType), 2, 2);
  
  pop();
}

function drawFallbackTile(tileType) {
  switch(tileType) {
    case TILES.WATER:
      fill(30, 144, 255);
      break;
    case TILES.ROCK:
      fill(105, 105, 105);
      break;
    case TILES.LAND_TOP_LEFT:
      fill(34, 139, 34);
      break;
    case TILES.LAND_TOP_MIDDLE:
      fill(50, 205, 50);
      break;
    case TILES.LAND_TOP_RIGHT:
      fill(34, 139, 34);
      break;
    case TILES.LAND_LEFT_MIDDLE:
      fill(46, 125, 50);
      break;
    case TILES.LAND_MIDDLE:
      fill(60, 179, 113);
      break;
    case TILES.LAND_RIGHT_MIDDLE:
      fill(46, 125, 50);
      break;
    case TILES.LAND_BOTTOM_LEFT:
      fill(34, 139, 34);
      break;
    case TILES.LAND_BOTTOM_MIDDLE:
      fill(50, 205, 50);
      break;
    case TILES.LAND_BOTTOM_RIGHT:
      fill(34, 139, 34);
      break;
    default:
      fill(30, 144, 255); // Default to water blue
  }
  
  stroke(0, 50);
  strokeWeight(0.5);
  rect(0, 0, tileSize, tileSize);
}

// Wave effect parameters
const WAVE_PARAMS = {
  maxDistance: 24, // Distance waves travel outward
  baseAmplitude: 2, // Smaller wave amplitude for more realistic look
  baseThickness: 3, // Thicker starting wave thickness
  waveSpacing: 6, // Spacing between wave rings (half as many waves)
  animationSpeed: 0.08, // Slower animation for more realistic waves
  fadeStart: 0.6, // Start fading later
  fadeEnd: 0.9 // Complete fade near the end
};

function drawWaveEffect(x, y, tileType) {
  if (!isLandTile(tileType)) return;
  
  push();
  translate(x + tileSize/2, y + tileSize/2); // Center on tile
  
  const time = frameCount * WAVE_PARAMS.animationSpeed;
  
  // Draw waves based on tile type
  switch(tileType) {
    case TILES.LAND_TOP_LEFT:
      drawCornerWaves(time, ['right', 'down']);
      break;
    case TILES.LAND_TOP_MIDDLE:
      drawSingleWave(time, 'down');
      break;
    case TILES.LAND_TOP_RIGHT:
      drawCornerWaves(time, ['left', 'down']);
      break;
    case TILES.LAND_LEFT_MIDDLE:
      drawSingleWave(time, 'right');
      break;
    case TILES.LAND_MIDDLE:
      // No waves for middle pieces (surrounded by land)
      break;
    case TILES.LAND_RIGHT_MIDDLE:
      drawSingleWave(time, 'left');
      break;
    case TILES.LAND_BOTTOM_LEFT:
      drawCornerWaves(time, ['right', 'up']);
      break;
    case TILES.LAND_BOTTOM_MIDDLE:
      drawSingleWave(time, 'up');
      break;
    case TILES.LAND_BOTTOM_RIGHT:
      drawCornerWaves(time, ['left', 'up']);
      break;
  }
  
  pop();
}

function isLandTile(tileType) {
  return tileType >= TILES.LAND_TOP_LEFT && tileType <= TILES.LAND_BOTTOM_RIGHT;
}

function drawSingleWave(time, direction) {
  const directionVectors = {
    'up': {x: 0, y: -1, rotation: 0},
    'down': {x: 0, y: 1, rotation: Math.PI},
    'left': {x: -1, y: 0, rotation: -Math.PI/2},
    'right': {x: 1, y: 0, rotation: Math.PI/2}
  };
  
  const dir = directionVectors[direction];
  
  push();
  rotate(dir.rotation);
  
  // Draw multiple wave rings moving outward
  for (let distance = WAVE_PARAMS.waveSpacing; distance <= WAVE_PARAMS.maxDistance; distance += WAVE_PARAMS.waveSpacing) {
    const progress = distance / WAVE_PARAMS.maxDistance;
    
    // Calculate wave thickness - starts thick, gets thinner
    const thickness = WAVE_PARAMS.baseThickness * (1 - progress * 0.6);
    
    // Calculate alpha with fade effect
    let alpha = 200;
    if (progress > WAVE_PARAMS.fadeStart) {
      const fadeProgress = (progress - WAVE_PARAMS.fadeStart) / (WAVE_PARAMS.fadeEnd - WAVE_PARAMS.fadeStart);
      alpha *= (1 - Math.min(fadeProgress, 1));
    }
    
    if (alpha <= 10) continue;
    
    stroke(255, 255, 255, alpha);
    strokeWeight(thickness);
    noFill();
    
    // Animate the wave position outward
    const animatedDistance = distance + sin(time * 2) * 2;
    
    // Draw wave as a curved line
    beginShape();
    const halfTile = 16; // Half tile size
    for (let i = -halfTile; i <= halfTile; i += 2) {
      // Create gentle wave motion
      const waveOffset = sin(i * 0.3 + time) * WAVE_PARAMS.baseAmplitude * (1 - progress * 0.3);
      vertex(i, animatedDistance + waveOffset);
    }
    endShape();
  }
  
  pop();
}

function drawHalfTileWave(time, direction) {
  const directionVectors = {
    'up': {x: 0, y: -1, rotation: 0},
    'down': {x: 0, y: 1, rotation: Math.PI},
    'left': {x: -1, y: 0, rotation: -Math.PI/2},
    'right': {x: 1, y: 0, rotation: Math.PI/2}
  };
  
  const dir = directionVectors[direction];
  
  push();
  rotate(dir.rotation);
  
  // Draw multiple wave rings moving outward (half-tile length)
  for (let distance = WAVE_PARAMS.waveSpacing; distance <= WAVE_PARAMS.maxDistance; distance += WAVE_PARAMS.waveSpacing) {
    const progress = distance / WAVE_PARAMS.maxDistance;
    
    // Calculate wave thickness - starts thick, gets thinner
    const thickness = WAVE_PARAMS.baseThickness * (1 - progress * 0.6);
    
    // Calculate alpha with fade effect
    let alpha = 200;
    if (progress > WAVE_PARAMS.fadeStart) {
      const fadeProgress = (progress - WAVE_PARAMS.fadeStart) / (WAVE_PARAMS.fadeEnd - WAVE_PARAMS.fadeStart);
      alpha *= (1 - Math.min(fadeProgress, 1));
    }
    
    if (alpha <= 10) continue;
    
    stroke(255, 255, 255, alpha);
    strokeWeight(thickness);
    noFill();
    
    // Animate the wave position outward
    const animatedDistance = distance + sin(time * 2) * 2;
    
    // Draw wave as a curved line (half-tile length)
    beginShape();
    const halfTile = 8; // Half of the original half-tile (8 instead of 16)
    for (let i = -halfTile; i <= halfTile; i += 2) {
      // Create gentle wave motion
      const waveOffset = sin(i * 0.3 + time) * WAVE_PARAMS.baseAmplitude * (1 - progress * 0.3);
      vertex(i, animatedDistance + waveOffset);
    }
    endShape();
  }
  
  pop();
}

function drawCornerWaves(time, directions) {
  // Draw the two main direction waves for corners (half-tile length)
  for (let dir of directions) {
    drawHalfTileWave(time, dir);
  }
  
  // Add diagonal corner wave effect
  push();
  
  // Calculate the corner position and diagonal direction based on directions
  let cornerX = 0, cornerY = 0;
  let startAngle = 0, endAngle = 0;
  
  // Determine which corner this is and set the diagonal wave accordingly
  if (directions.includes('right') && directions.includes('down')) {
    // Top-left corner - diagonal wave in top-left quadrant
    cornerX = -8;
    cornerY = -8;
    startAngle = Math.PI; // Start from left
    endAngle = Math.PI * 1.5; // End at top
  } else if (directions.includes('left') && directions.includes('down')) {
    // Top-right corner - diagonal wave in top-right quadrant
    cornerX = 8;
    cornerY = -8;
    startAngle = Math.PI * 1.5; // Start from top
    endAngle = Math.PI * 2; // End at right
  } else if (directions.includes('right') && directions.includes('up')) {
    // Bottom-left corner - diagonal wave in bottom-left quadrant
    cornerX = -8;
    cornerY = 8;
    startAngle = Math.PI * 0.5; // Start from bottom
    endAngle = Math.PI; // End at left
  } else if (directions.includes('left') && directions.includes('up')) {
    // Bottom-right corner - diagonal wave in bottom-right quadrant
    cornerX = 8;
    cornerY = 8;
    startAngle = 0; // Start from right
    endAngle = Math.PI * 0.5; // End at bottom
  }
  
  // Draw the diagonal corner wave
  translate(cornerX, cornerY);
  
  for (let distance = WAVE_PARAMS.waveSpacing; distance <= WAVE_PARAMS.maxDistance * 0.7; distance += WAVE_PARAMS.waveSpacing) {
    const progress = distance / WAVE_PARAMS.maxDistance;
    const thickness = WAVE_PARAMS.baseThickness * 0.7 * (1 - progress * 0.6);
    
    let alpha = 160;
    if (progress > WAVE_PARAMS.fadeStart) {
      const fadeProgress = (progress - WAVE_PARAMS.fadeStart) / (WAVE_PARAMS.fadeEnd - WAVE_PARAMS.fadeStart);
      alpha *= (1 - Math.min(fadeProgress, 1));
    }
    
    if (alpha <= 10) continue;
    
    stroke(255, 255, 255, alpha);
    strokeWeight(thickness);
    noFill();
    
    const animatedDistance = distance + sin(time * 2) * 1.5;
    
    // Draw diagonal wave as a quarter circle arc
    beginShape();
    for (let angle = startAngle; angle <= endAngle; angle += Math.PI/16) {
      const x = cos(angle) * animatedDistance;
      const y = sin(angle) * animatedDistance;
      const waveOffset = sin(angle * 4 + time) * WAVE_PARAMS.baseAmplitude * 0.5 * (1 - progress * 0.4);
      vertex(x + waveOffset * cos(angle), y + waveOffset * sin(angle));
    }
    endShape();
  }
  
  pop();
}

function drawUI() {
  if (gameState !== GAME_STATES.PLAYING) return;
  
  // Score display (positioned to avoid shop overlap)
  const coinDisplayX = shopExpanded ? width - shopWidth - 220 : width - shopCollapsedWidth - 220;
  fill(255);
  stroke(0);
  strokeWeight(2);
  textSize(24);
  textAlign(LEFT);
  text(`Coins: ${score}`, coinDisplayX, 30);
  
  // Instructions at bottom
  textSize(16);
  textAlign(LEFT);
  text("Use WASD or Arrow Keys to move", 20, height - 60);
  text("Collect gold coins for points!", 20, height - 40);
  text("Avoid land tiles and rock centers!", 20, height - 20);
}

// Add debug function to visualize collision areas (optional - uncomment in drawMap to use)
function drawTileCollisionDebug(x, y, tileType) {
  if (!isLandTile(tileType)) return;
  
  push();
  translate(x, y);
  
  // Draw collision area in semi-transparent red
  fill(255, 0, 0, 50);
  noStroke();
  
  switch(tileType) {
    case TILES.LAND_TOP_LEFT:
      // Bottom right quadrant
      rect(16, 16, 16, 16);
      break;
      
    case TILES.LAND_TOP_MIDDLE:
      // Bottom half
      rect(0, 16, 32, 16);
      break;
      
    case TILES.LAND_TOP_RIGHT:
      // Bottom left quadrant
      rect(0, 16, 16, 16);
      break;
      
    case TILES.LAND_LEFT_MIDDLE:
      // Right half
      rect(16, 0, 16, 32);
      break;
      
    case TILES.LAND_MIDDLE:
      // Whole tile
      rect(0, 0, 32, 32);
      break;
      
    case TILES.LAND_RIGHT_MIDDLE:
      // Left half
      rect(0, 0, 16, 32);
      break;
      
    case TILES.LAND_BOTTOM_LEFT:
      // Top right quadrant
      rect(16, 0, 16, 16);
      break;
      
    case TILES.LAND_BOTTOM_MIDDLE:
      // Top half
      rect(0, 0, 32, 16);
      break;
      
    case TILES.LAND_BOTTOM_RIGHT:
      // Top left quadrant
      rect(0, 0, 16, 16);
      break;
  }
  
  pop();
}

// Handle key press events for game state management
function keyPressed() {
  handleKeyPress();
  return false; // Prevent default behavior
}

// Handle mouse clicks for shop interaction
function mousePressed() {
  handleShopClick(mouseX, mouseY);
  return false; // Prevent default behavior
}