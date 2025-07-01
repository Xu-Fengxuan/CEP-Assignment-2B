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
let boatSheet;
let tileSize = 16;
let sectionSize = 100;
let mapSections = {};
let keys = {};
let score = 0;

// Wave Function Collapse rules
const TILE_RULES = {
  [TILES.WATER]: {
    up: [TILES.WATER, TILES.ROCK, TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT],
    right: [TILES.WATER, TILES.ROCK, TILES.LAND_TOP_LEFT, TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT],
    down: [TILES.WATER, TILES.ROCK, TILES.LAND_TOP_LEFT, TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_RIGHT],
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
    right: [TILES.LAND_TOP_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    down: [TILES.LAND_LEFT_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_BOTTOM_LEFT],
    left: [TILES.WATER]
  },
  [TILES.LAND_TOP_MIDDLE]: {
    up: [TILES.WATER],
    right: [TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    down: [TILES.LAND_MIDDLE, TILES.LAND_BOTTOM_MIDDLE],
    left: [TILES.LAND_TOP_LEFT, TILES.LAND_TOP_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE]
  },
  [TILES.LAND_TOP_RIGHT]: {
    up: [TILES.WATER],
    right: [TILES.WATER],
    down: [TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT],
    left: [TILES.LAND_TOP_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE]
  },
  [TILES.LAND_LEFT_MIDDLE]: {
    up: [TILES.LAND_TOP_LEFT, TILES.LAND_LEFT_MIDDLE, TILES.LAND_MIDDLE],
    right: [TILES.LAND_MIDDLE],
    down: [TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT, TILES.LAND_MIDDLE],
    left: [TILES.WATER]
  },
  [TILES.LAND_MIDDLE]: {
    up: [TILES.LAND_TOP_LEFT, TILES.LAND_TOP_MIDDLE, TILES.LAND_TOP_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    right: [TILES.LAND_TOP_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT],
    down: [TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    left: [TILES.LAND_TOP_LEFT, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE, TILES.LAND_BOTTOM_LEFT]
  },
  [TILES.LAND_RIGHT_MIDDLE]: {
    up: [TILES.LAND_TOP_RIGHT, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_MIDDLE],
    right: [TILES.WATER],
    down: [TILES.LAND_RIGHT_MIDDLE, TILES.LAND_BOTTOM_RIGHT, TILES.LAND_MIDDLE],
    left: [TILES.LAND_MIDDLE]
  },
  [TILES.LAND_BOTTOM_LEFT]: {
    up: [TILES.LAND_LEFT_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_TOP_LEFT],
    right: [TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    down: [TILES.WATER],
    left: [TILES.WATER]
  },
  [TILES.LAND_BOTTOM_MIDDLE]: {
    up: [TILES.LAND_MIDDLE, TILES.LAND_TOP_MIDDLE],
    right: [TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_BOTTOM_RIGHT, TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE],
    down: [TILES.WATER],
    left: [TILES.LAND_BOTTOM_LEFT, TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE]
  },
  [TILES.LAND_BOTTOM_RIGHT]: {
    up: [TILES.LAND_MIDDLE, TILES.LAND_RIGHT_MIDDLE, TILES.LAND_TOP_RIGHT],
    right: [TILES.WATER],
    down: [TILES.WATER],
    left: [TILES.LAND_BOTTOM_MIDDLE, TILES.LAND_MIDDLE, TILES.LAND_LEFT_MIDDLE]
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

      // Weighted selection favoring water and rocks
      let selectedTile;
      if (Math.random() < 0.7) {
        selectedTile = Math.random() < 0.9 ? TILES.WATER : TILES.ROCK;
        if (!possibleTiles.includes(selectedTile)) {
          selectedTile = possibleTiles[Math.floor(Math.random() * possibleTiles.length)];
        }
      } else {
        selectedTile = possibleTiles[Math.floor(Math.random() * possibleTiles.length)];
      }

      this.grid[chosen.y][chosen.x] = selectedTile;
      this.propagate(chosen.x, chosen.y);
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

  propagate(startX, startY) {
    const stack = [{x: startX, y: startY}];

    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const currentTile = this.grid[y][x];

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
          
          const validTiles = TILE_RULES[currentTile][neighbor.dir];
          const oldPossibilities = [...this.possibilities[neighbor.y][neighbor.x]];
          
          this.possibilities[neighbor.y][neighbor.x] = 
            this.possibilities[neighbor.y][neighbor.x].filter(tile => validTiles.includes(tile));

          if (this.possibilities[neighbor.y][neighbor.x].length !== oldPossibilities.length) {
            stack.push({x: neighbor.x, y: neighbor.y});
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
    this.direction = BOAT_DIRECTIONS.UP;
    this.speed = 2;
    this.size = 12;
  }

  update() {
    let moveX = 0;
    let moveY = 0;

    // Handle movement input
    if (keys['w'] || keys['ArrowUp']) moveY -= 1;
    if (keys['s'] || keys['ArrowDown']) moveY += 1;
    if (keys['a'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['d'] || keys['ArrowRight']) moveX += 1;

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
    const directions = 8;
    const angleStep = (Math.PI * 2) / directions;
    let directionIndex = Math.round((angle + Math.PI / 8) / angleStep);
    
    if (directionIndex < 0) directionIndex += directions;
    if (directionIndex >= directions) directionIndex -= directions;
    
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
    rotate(this.direction * PI / 4);
    
    // Draw boat placeholder (will be replaced with sprite when available)
    fill(139, 69, 19);
    stroke(101, 67, 33);
    strokeWeight(1);
    
    // Boat hull
    ellipse(0, 0, this.size, this.size * 0.6);
    
    // Mast
    fill(160, 82, 45);
    rect(-1, -this.size/2, 2, this.size/2);
    
    // Sail
    fill(255, 248, 220);
    triangle(1, -this.size/2, 1, -this.size/4, this.size/3, -3*this.size/8);
    
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

function setup() {
  createCanvas(800, 600);
  
  // Initialize game objects
  boat = new Boat(400, 300);
  camera = new Camera();
  coins = [];
  
  // Generate initial sections around boat
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      generateSection(x, y);
    }
  }
}

function draw() {
  background(30, 144, 255);
  
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
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = boat.getTileAt(x, y);
      if (tile !== undefined) {
        drawTile(x * tileSize, y * tileSize, tile);
      }
    }
  }
}

function drawTile(x, y, tileType) {
  push();
  translate(x, y);
  
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
  }
  
  stroke(0, 50);
  strokeWeight(0.5);
  rect(0, 0, tileSize, tileSize);
  
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
  
  // Instructions
  textSize(16);
  text("Use WASD or Arrow Keys to move", 20, height - 60);
  text("Collect gold coins for points!", 20, height - 40);
  text("Avoid land tiles", 20, height - 20);
}

function keyPressed() {
  keys[key] = true;
  keys[keyCode] = true;
}

function keyReleased() {
  keys[key] = false;
  keys[keyCode] = false;
}