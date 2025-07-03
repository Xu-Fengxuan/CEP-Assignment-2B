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
let tileSize = 32; // Updated to match 32x32 sprite size
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

// Wave Function Collapse rules - Refined for proper land formation
const TILE_RULES = {
  [TILES.WATER]: {
    up: [TILES.WATER, TILES.ROCK, TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT],
    right: [TILES.WATER, TILES.ROCK, TILES.LAND_TOP_LEFT, TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT],
    down: [TILES.WATER, TILES.ROCK], // Removed all top land tiles - they cannot be below water
    left: [TILES.WATER, TILES.ROCK, TILES.LAND_TOP_RIGHT, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT]
  },
  [TILES.ROCK]: {
    up: [TILES.WATER],
    right: [TILES.WATER],
    down: [TILES.WATER],
    left: [TILES.WATER]
  },
  [TILES.LAND_TOP_LEFT]: {
    up: [TILES.WATER],
    right: [TILES.LAND_TOP_MIDDLE], // Only top middle can be to the right
    down: [TILES.LAND_LEFT_MIDDLE], // Only left middle can be below
    left: [TILES.WATER]
  },
  [TILES.LAND_TOP_MIDDLE]: {
    up: [TILES.WATER],
    right: [TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_RIGHT], // Can connect to other top pieces
    down: [TILES.LAND_MIDDLE], // Only land middle can be below top middle
    left: [TILES.LAND_TOP_LEFT, TILES.LAND_TOP_MIDDLE] // Can connect to other top pieces
  },
  [TILES.LAND_TOP_RIGHT]: {
    up: [TILES.WATER],
    right: [TILES.WATER],
    down: [TILES.LAND_RIGHT_MIDDLE], // Only right middle can be below
    left: [TILES.LAND_TOP_MIDDLE] // Only top middle can be to the left
  },
  [TILES.LAND_LEFT_MIDDLE]: {
    up: [TILES.LAND_TOP_LEFT], // Only top left can be above
    right: [TILES.LAND_MIDDLE], // Only land middle can be to the right
    down: [TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT], // Can connect to other left pieces
    left: [TILES.WATER]
  },
  [TILES.LAND_MIDDLE]: {
    up: [TILES.LAND_TOP_LEFT, TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    right: [TILES.LAND_TOP_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT],
    down: [TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    left: [TILES.LAND_TOP_LEFT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT]
  },
  [TILES.LAND_RIGHT_MIDDLE]: {
    up: [TILES.LAND_TOP_RIGHT], // Only top right can be above
    right: [TILES.WATER],
    down: [TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT], // Can connect to other right pieces
    left: [TILES.LAND_MIDDLE] // Only land middle can be to the left
  },
  [TILES.LAND_BOTTOM_LEFT]: {
    up: [TILES.LAND_LEFT_MIDDLE], // Only left middle can be above
    right: [TILES.LAND_BOTTOM_MIDDLE], // Only bottom middle can be to the right
    down: [TILES.WATER],
    left: [TILES.WATER]
  },
  [TILES.LAND_BOTTOM_MIDDLE]: {
    up: [TILES.LAND_MIDDLE], // Only land middle can be above bottom middle
    right: [TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT], // Can connect to other bottom pieces
    down: [TILES.WATER],
    left: [TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE] // Can connect to other bottom pieces
  },
  [TILES.LAND_BOTTOM_RIGHT]: {
    up: [TILES.LAND_RIGHT_MIDDLE], // Only right middle can be above
    right: [TILES.WATER],
    down: [TILES.WATER],
    left: [TILES.LAND_BOTTOM_MIDDLE] // Only bottom middle can be to the left
  }
};

class WaveFunctionCollapse {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = [];
    this.possibilities = [];
    this.initializeGrid();
  }

  initializeGrid() {
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      this.possibilities[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = -1; // Uncollapsed
        this.possibilities[y][x] = Object.keys(TILES).map(key => TILES[key]);
      }
    }
  }

  collapse() {
    let iterations = 0;
    const maxIterations = this.width * this.height * 10;

    while (iterations < maxIterations) {
      iterations++;
      
      // Find cell with minimum entropy
      let minEntropy = Infinity;
      let candidates = [];

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === -1) {
            const entropy = this.possibilities[y][x].length;
            if (entropy < minEntropy && entropy > 0) {
              minEntropy = entropy;
              candidates = [{x, y}];
            } else if (entropy === minEntropy) {
              candidates.push({x, y});
            }
          }
        }
      }

      if (candidates.length === 0) break;

      // Choose random candidate
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const possibleTiles = this.possibilities[chosen.y][chosen.x];
      
      if (possibleTiles.length === 0) {
        // Backtrack or restart - for simplicity, we'll restart
        this.initializeGrid();
        continue;
      }

      // Enhanced weighted selection with stricter land formation rules
      let selectedTile;
      const waterProbability = 0.75; // Increased water probability
      const rockProbability = 0.05;
      
      if (Math.random() < waterProbability) {
        selectedTile = TILES.WATER;
        if (!possibleTiles.includes(selectedTile)) {
          selectedTile = possibleTiles[Math.floor(Math.random() * possibleTiles.length)];
        }
      } else if (Math.random() < rockProbability) {
        selectedTile = TILES.ROCK;
        if (!possibleTiles.includes(selectedTile)) {
          selectedTile = possibleTiles[Math.floor(Math.random() * possibleTiles.length)];
        }
      } else {
        // For land tiles, apply additional validation
        const validLandTiles = possibleTiles.filter(tile => this.isValidLandPlacement(chosen.x, chosen.y, tile));
        if (validLandTiles.length > 0) {
          selectedTile = validLandTiles[Math.floor(Math.random() * validLandTiles.length)];
        } else {
          // Fallback to water if no valid land tiles
          selectedTile = TILES.WATER;
        }
      }

      // Validate selected tile before setting it
      if (selectedTile !== undefined && TILE_RULES[selectedTile]) {
        this.grid[chosen.y][chosen.x] = selectedTile;
        this.propagate(chosen.x, chosen.y);
      } else {
        // Fallback to water if selected tile is invalid
        this.grid[chosen.y][chosen.x] = TILES.WATER;
        this.propagate(chosen.x, chosen.y);
      }
    }

    // Fill any remaining uncollapsed cells with water
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === -1) {
          this.grid[y][x] = TILES.WATER;
        }
      }
    }

    return this.grid;
  }

  // Enhanced validation for land tile placement
  isValidLandPlacement(x, y, tileType) {
    // Allow water and rocks to be placed anywhere
    if (tileType === TILES.WATER || tileType === TILES.ROCK) {
      return true;
    }

    // Check immediate neighbors for incompatible combinations
    const neighbors = [
      {x: x, y: y - 1, dir: 'up'},
      {x: x + 1, y: y, dir: 'right'},
      {x: x, y: y + 1, dir: 'down'},
      {x: x - 1, y: y, dir: 'left'}
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < this.width && 
          neighbor.y >= 0 && neighbor.y < this.height) {
        
        const neighborTile = this.grid[neighbor.y][neighbor.x];
        if (neighborTile !== -1) {
          // Check if this placement would violate strict adjacency rules
          if (!this.areCompatibleTiles(tileType, neighborTile, neighbor.dir)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Check if two tiles are compatible based on strict rules
  areCompatibleTiles(centerTile, neighborTile, direction) {
    if (!TILE_RULES[centerTile] || !TILE_RULES[centerTile][direction]) {
      return false;
    }
    
    // Additional strict rules for land formation
    switch (centerTile) {
      case TILES.LAND_BOTTOM_RIGHT:
        // Land bottom right cannot be adjacent to certain land types
        if (direction === 'right' && 
            [TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_TOP_LEFT, TILES.LAND_BOTTOM_LEFT].includes(neighborTile)) {
          return false;
        }
        if (direction === 'down' && 
            [TILES.LAND_MIDDLE, TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_LEFT, TILES.LAND_TOP_RIGHT].includes(neighborTile)) {
          return false;
        }
        break;
        
      case TILES.LAND_TOP_LEFT:
        // Land top left cannot be adjacent to certain land types
        if (direction === 'left' && 
            [TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_TOP_RIGHT, TILES.LAND_BOTTOM_RIGHT].includes(neighborTile)) {
          return false;
        }
        if (direction === 'up' && 
            [TILES.LAND_MIDDLE, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_RIGHT].includes(neighborTile)) {
          return false;
        }
        break;
        
      case TILES.LAND_TOP_RIGHT:
        // Similar restrictions for top right
        if (direction === 'right' && 
            [TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_TOP_LEFT, TILES.LAND_BOTTOM_LEFT].includes(neighborTile)) {
          return false;
        }
        break;
        
      case TILES.LAND_BOTTOM_LEFT:
        // Similar restrictions for bottom left
        if (direction === 'left' && 
            [TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_TOP_RIGHT, TILES.LAND_BOTTOM_RIGHT].includes(neighborTile)) {
          return false;
        }
        break;
    }
    
    return TILE_RULES[centerTile][direction].includes(neighborTile);
  }

  propagate(startX, startY) {
    const stack = [{x: startX, y: startY}];

    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const currentTile = this.grid[y][x];
      
      // Skip if currentTile is invalid
      if (currentTile === undefined || currentTile === -1 || !TILE_RULES[currentTile]) {
        // Reduce console spam - only log unique invalid tiles
        if (currentTile !== -1) {
          console.warn(`Invalid currentTile at (${x}, ${y}):`, currentTile);
        }
        continue;
      }

      // Check all neighbors
      const neighbors = [
        {x: x, y: y - 1, dir: 'up'},
        {x: x + 1, y: y, dir: 'right'},
        {x: x, y: y + 1, dir: 'down'},
        {x: x - 1, y: y, dir: 'left'}
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < this.width && 
            neighbor.y >= 0 && neighbor.y < this.height &&
            this.grid[neighbor.y][neighbor.x] === -1) {
          
          // Check if currentTile and its rules exist
          if (currentTile !== undefined && TILE_RULES[currentTile] && TILE_RULES[currentTile][neighbor.dir]) {
            const validTiles = TILE_RULES[currentTile][neighbor.dir];
            const oldPossibilities = [...this.possibilities[neighbor.y][neighbor.x]];
            
            // Apply base adjacency rules
            this.possibilities[neighbor.y][neighbor.x] = 
              this.possibilities[neighbor.y][neighbor.x].filter(tile => validTiles.includes(tile));

            // Apply additional strict validation for land tiles
            this.possibilities[neighbor.y][neighbor.x] = 
              this.possibilities[neighbor.y][neighbor.x].filter(tile => 
                this.isValidLandPlacement(neighbor.x, neighbor.y, tile));

            if (this.possibilities[neighbor.y][neighbor.x].length !== oldPossibilities.length) {
              stack.push({x: neighbor.x, y: neighbor.y});
            }

            // If no possibilities remain, add water as emergency fallback
            if (this.possibilities[neighbor.y][neighbor.x].length === 0) {
              this.possibilities[neighbor.y][neighbor.x] = [TILES.WATER];
            }
          }
        }
      }
    }
  }
}

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  follow(target) {
    this.targetX = target.x - width / 2;
    this.targetY = target.y - height / 2;
  }

  update() {
    this.x = lerp(this.x, this.targetX, 0.1);
    this.y = lerp(this.y, this.targetY, 0.1);
  }

  apply() {
    translate(-this.x, -this.y);
  }
}

class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.direction = 0; // Initialize to 0 (first sprite)
    this.speed = 2;
    this.size = 12;
  }

  update() {
    // Handle movement input using keyIsDown for better multi-key support
    // Use !! to coerce to boolean in case keyIsDown returns undefined when canvas is out of focus
    const moveUp = !!keyIsDown(KEY_CODES.W) || !!keyIsDown(KEY_CODES.UP);
    const moveDown = !!keyIsDown(KEY_CODES.S) || !!keyIsDown(KEY_CODES.DOWN);
    const moveLeft = !!keyIsDown(KEY_CODES.A) || !!keyIsDown(KEY_CODES.LEFT);
    const moveRight = !!keyIsDown(KEY_CODES.D) || !!keyIsDown(KEY_CODES.RIGHT);

    // Calculate movement direction
    let moveX = 0;
    let moveY = 0;
    
    if (moveUp) moveY -= 1;
    if (moveDown) moveY += 1;
    if (moveLeft) moveX -= 1;
    if (moveRight) moveX += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }

    // Update direction based on movement
    if (moveX !== 0 || moveY !== 0) {
      this.direction = this.getDirection(moveX, moveY);
    }

    // Move boat
    const newX = this.x + moveX * this.speed;
    const newY = this.y + moveY * this.speed;

    // Check collision with land tiles
    if (this.canMoveTo(newX, newY)) {
      this.x = newX;
      this.y = newY;
    }

    // Check for coin collection
    this.collectCoins();

    // Generate new sections if needed
    this.checkSectionGeneration();
  }

  canMoveTo(x, y) {
    const gridX = Math.floor(x / tileSize);
    const gridY = Math.floor(y / tileSize);
    const tile = this.getTileAt(gridX, gridY);
    
    return tile === TILES.WATER || tile === TILES.ROCK || tile === undefined;
  }

  getTileAt(gridX, gridY) {
    const sectionX = Math.floor(gridX / sectionSize);
    const sectionY = Math.floor(gridY / sectionSize);
    const sectionKey = `${sectionX},${sectionY}`;
    
    if (mapSections[sectionKey]) {
      const localX = gridX - sectionX * sectionSize;
      const localY = gridY - sectionY * sectionSize;
      
      if (localX >= 0 && localX < sectionSize && localY >= 0 && localY < sectionSize) {
        return mapSections[sectionKey][localY][localX];
      }
    }
    
    return undefined;
  }

  getDirection(moveX, moveY) {
    const angle = Math.atan2(moveY, moveX);
    const directions = 16; // 16 boat sprites
    const angleStep = (Math.PI * 2) / directions;
    
    // ship1 is forward (up/north), sprites rotate anticlockwise as number increases
    // Adjust angle so that -90 degrees (up) corresponds to ship1
    // Convert from standard math angle to our sprite system
    let adjustedAngle = angle + Math.PI/2; // Rotate by 90 degrees to make up = 0
    
    // Since sprites rotate anticlockwise but we want clockwise movement mapping,
    // we need to reverse the direction
    adjustedAngle = -adjustedAngle;
    
    let directionIndex = Math.round(adjustedAngle / angleStep);
    
    if (directionIndex < 0) directionIndex += directions;
    if (directionIndex >= directions) directionIndex -= directions;
    
    // Ensure the direction is within valid bounds
    directionIndex = Math.max(0, Math.min(15, directionIndex));
    
    return directionIndex;
  }

  collectCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      const distance = Math.sqrt((this.x - coin.x) ** 2 + (this.y - coin.y) ** 2);
      
      if (distance < this.size) {
        coins.splice(i, 1);
        score += 10;
      }
    }
  }

  checkSectionGeneration() {
    const currentSectionX = Math.floor(this.x / (tileSize * sectionSize));
    const currentSectionY = Math.floor(this.y / (tileSize * sectionSize));
    
    const buffer = 20 * tileSize;
    const edgeDistance = 20;

    // Check if boat is near edge of current section
    const localX = (this.x / tileSize) % sectionSize;
    const localY = (this.y / tileSize) % sectionSize;

    const sectionsToGenerate = [];

    if (localX < edgeDistance) sectionsToGenerate.push({x: currentSectionX - 1, y: currentSectionY});
    if (localX > sectionSize - edgeDistance) sectionsToGenerate.push({x: currentSectionX + 1, y: currentSectionY});
    if (localY < edgeDistance) sectionsToGenerate.push({x: currentSectionX, y: currentSectionY - 1});
    if (localY > sectionSize - edgeDistance) sectionsToGenerate.push({x: currentSectionX, y: currentSectionY + 1});

    // Generate corner sections
    if (localX < edgeDistance && localY < edgeDistance) {
      sectionsToGenerate.push({x: currentSectionX - 1, y: currentSectionY - 1});
    }
    if (localX > sectionSize - edgeDistance && localY < edgeDistance) {
      sectionsToGenerate.push({x: currentSectionX + 1, y: currentSectionY - 1});
    }
    if (localX < edgeDistance && localY > sectionSize - edgeDistance) {
      sectionsToGenerate.push({x: currentSectionX - 1, y: currentSectionY + 1});
    }
    if (localX > sectionSize - edgeDistance && localY > sectionSize - edgeDistance) {
      sectionsToGenerate.push({x: currentSectionX + 1, y: currentSectionY + 1});
    }

    for (const section of sectionsToGenerate) {
      generateSection(section.x, section.y);
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    
    // Ensure direction is valid
    const validDirection = Math.max(0, Math.min(15, this.direction || 0));
    
    if (spritesLoaded && boatSprites && boatSprites[validDirection]) {
      // Draw the boat sprite
      imageMode(CENTER);
      const spriteSize = 32; // Scale up the 16x16 sprite
      image(boatSprites[validDirection], 0, 0, spriteSize, spriteSize);
    } else {
      // Fallback to simple drawing if sprites not loaded
      fill(139, 69, 19);
      stroke(101, 67, 33);
      strokeWeight(1);
      ellipse(0, 0, this.size, this.size * 0.6);
      
      // Add a direction indicator
      fill(255, 0, 0);
      const angle = validDirection * (Math.PI * 2) / 16;
      const dx = Math.cos(angle) * this.size / 2;
      const dy = Math.sin(angle) * this.size / 2;
      ellipse(dx, dy, 4, 4);
    }
    
    pop();
  }
}

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 8;
    this.rotation = 0;
  }

  update() {
    this.rotation += 0.1;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    fill(255, 215, 0);
    stroke(218, 165, 32);
    strokeWeight(2);
    ellipse(0, 0, this.size, this.size);
    
    fill(255, 255, 0);
    ellipse(0, 0, this.size * 0.6, this.size * 0.6);
    
    pop();
  }
}

function generateSection(sectionX, sectionY) {
  const sectionKey = `${sectionX},${sectionY}`;
  
  if (mapSections[sectionKey]) return;

  const wfc = new WaveFunctionCollapse(sectionSize, sectionSize);
  mapSections[sectionKey] = wfc.collapse();

  // Validate and fix the generated section
  validateAndFixSection(sectionX, sectionY);

  // Generate coins on water tiles
  generateCoinsForSection(sectionX, sectionY);
}

function generateCoinsForSection(sectionX, sectionY) {
  const sectionKey = `${sectionX},${sectionY}`;
  const sectionData = mapSections[sectionKey];
  
  for (let y = 0; y < sectionSize; y++) {
    for (let x = 0; x < sectionSize; x++) {
      if (sectionData[y][x] === TILES.WATER && Math.random() < 0.01) {
        const worldX = (sectionX * sectionSize + x) * tileSize + tileSize / 2;
        const worldY = (sectionY * sectionSize + y) * tileSize + tileSize / 2;
        coins.push(new Coin(worldX, worldY));
      }
    }
  }
}

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
}

function draw() {
  background(0x30, 0x4c, 0xc4); // HEX #304cc4
  
  // Update game objects
  boat.update();
  camera.follow(boat);
  camera.update();
  
  // Update coins
  for (const coin of coins) {
    coin.update();
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
  fill(255, 255, 255);
  stroke(0);
  strokeWeight(1);
  textSize(8);
  textAlign(LEFT, TOP);
  text(getTileName(tileType), 2, 2);
  
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
  // Score display
  fill(255);
  stroke(0);
  strokeWeight(2);
  textSize(24);
  textAlign(LEFT);
  text(`Coins: ${score}`, 20, 30);
  
  // Debug info
  textSize(12);
  text(`Sprites loaded: ${spritesLoaded}`, 20, 60);
  text(`Spritesheet: ${spriteSheet ? 'loaded' : 'not loaded'}`, 20, 75);
  text(`Boat sprites: ${boatSprites.length}`, 20, 90);
  text(`Boat direction: ${boat.direction}`, 20, 105);
  
  // Instructions
  textSize(16);
  text("Use WASD or Arrow Keys to move", 20, height - 60);
  text("Collect gold coins for points!", 20, height - 40);
  text("Avoid land tiles", 20, height - 20);
}

function validateAndFixSection(sectionX, sectionY) {
  const sectionKey = `${sectionX},${sectionY}`;
  const sectionData = mapSections[sectionKey];
  let fixedTiles = 0;
  const maxFixes = 50; // Prevent infinite loops

  // Check each tile for rule violations
  for (let y = 0; y < sectionSize && fixedTiles < maxFixes; y++) {
    for (let x = 0; x < sectionSize && fixedTiles < maxFixes; x++) {
      const currentTile = sectionData[y][x];
      
      if (!isValidTilePlacement(sectionX, sectionY, x, y, currentTile)) {
        // Fix invalid tile by choosing a valid alternative
        const validTiles = getValidTilesForPosition(sectionX, sectionY, x, y);
        if (validTiles.length > 0) {
          // Prefer water for simplicity, then choose randomly from valid options
          if (validTiles.includes(TILES.WATER)) {
            sectionData[y][x] = TILES.WATER;
          } else {
            sectionData[y][x] = validTiles[Math.floor(Math.random() * validTiles.length)];
          }
          fixedTiles++;
        }
      }
    }
  }

  if (fixedTiles > 0) {
    console.log(`Fixed ${fixedTiles} invalid tiles in section ${sectionKey}`);
  }
}

function isValidTilePlacement(sectionX, sectionY, localX, localY, tileType) {
  // Check all four directions for rule compliance
  const directions = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 1, dy: 0, dir: 'right' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' }
  ];

  for (const direction of directions) {
    const neighborLocalX = localX + direction.dx;
    const neighborLocalY = localY + direction.dy;
    
    // Get neighbor tile (might be in adjacent section)
    const neighborTile = getTileAtGlobalPosition(
      sectionX * sectionSize + neighborLocalX,
      sectionY * sectionSize + neighborLocalY
    );

    if (neighborTile !== undefined) {
      // Check if current tile can be adjacent to neighbor
      if (!TILE_RULES[tileType] || !TILE_RULES[tileType][direction.dir]) {
        return false;
      }
      
      if (!TILE_RULES[tileType][direction.dir].includes(neighborTile)) {
        return false;
      }
    }
  }

  return true;
}

function getValidTilesForPosition(sectionX, sectionY, localX, localY) {
  const validTiles = [];
  
  // Test each tile type to see if it's valid at this position
  for (const tileType of Object.values(TILES)) {
    if (isValidTilePlacement(sectionX, sectionY, localX, localY, tileType)) {
      validTiles.push(tileType);
    }
  }

  return validTiles;
}

function getTileAtGlobalPosition(globalX, globalY) {
  const sectionX = Math.floor(globalX / sectionSize);
  const sectionY = Math.floor(globalY / sectionSize);
  const sectionKey = `${sectionX},${sectionY}`;
  
  if (mapSections[sectionKey]) {
    const localX = globalX - sectionX * sectionSize;
    const localY = globalY - sectionY * sectionSize;
    
    if (localX >= 0 && localX < sectionSize && localY >= 0 && localY < sectionSize) {
      return mapSections[sectionKey][localY][localX];
    }
  }
  
  return undefined;
}

function ensureBoatSpawnOnWater() {
  // Get boat's initial position in grid coordinates
  const boatGridX = Math.floor(boat.x / tileSize);
  const boatGridY = Math.floor(boat.y / tileSize);
  
  // Get the section containing the boat
  const sectionX = Math.floor(boatGridX / sectionSize);
  const sectionY = Math.floor(boatGridY / sectionSize);
  const sectionKey = `${sectionX},${sectionY}`;
  
  if (mapSections[sectionKey]) {
    const localX = boatGridX - sectionX * sectionSize;
    const localY = boatGridY - sectionY * sectionSize;
    
    // Ensure the boat's tile and surrounding area are water
    const radius = 2; // 5x5 area around boat
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const checkX = localX + dx;
        const checkY = localY + dy;
        
        if (checkX >= 0 && checkX < sectionSize && checkY >= 0 && checkY < sectionSize) {
          mapSections[sectionKey][checkY][checkX] = TILES.WATER;
        }
      }
    }
    
    console.log(`Ensured boat spawn area is water at grid (${boatGridX}, ${boatGridY})`);
  }
}

function validateInitialMapGeneration() {
  let totalTiles = 0;
  let invalidTiles = 0;
  
  // Check all generated sections
  for (const sectionKey in mapSections) {
    const [sectionX, sectionY] = sectionKey.split(',').map(Number);
    const sectionData = mapSections[sectionKey];
    
    for (let y = 0; y < sectionSize; y++) {
      for (let x = 0; x < sectionSize; x++) {
        totalTiles++;
        const currentTile = sectionData[y][x];
        
        if (!isValidTilePlacement(sectionX, sectionY, x, y, currentTile)) {
          invalidTiles++;
        }
      }
    }
  }
  
  console.log(`Initial map validation: ${totalTiles - invalidTiles}/${totalTiles} tiles valid (${((totalTiles - invalidTiles) / totalTiles * 100).toFixed(1)}%)`);
  
  if (invalidTiles > 0) {
    console.warn(`Found ${invalidTiles} invalid tiles in initial generation`);
  }
}