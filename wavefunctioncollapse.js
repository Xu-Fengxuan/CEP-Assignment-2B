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
      const rockProbability = 0.01; // Reduced by 40% from 0.01
      
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
          // Check if there are neighboring land middle tiles to encourage clustering
          const hasLandMiddleNeighbor = this.hasLandMiddleNeighbor(chosen.x, chosen.y);
          
          if (hasLandMiddleNeighbor && validLandTiles.includes(TILES.LAND_MIDDLE) && Math.random() < 0.7) {
            // 70% chance to place land middle if there's already a land middle neighbor
            selectedTile = TILES.LAND_MIDDLE;
          } else {
            selectedTile = validLandTiles[Math.floor(Math.random() * validLandTiles.length)];
          }
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

  // Check if there are any land middle tiles adjacent to this position
  hasLandMiddleNeighbor(x, y) {
    const neighbors = [
      {x: x, y: y - 1}, // up
      {x: x + 1, y: y}, // right
      {x: x, y: y + 1}, // down
      {x: x - 1, y: y}  // left
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < this.width && 
          neighbor.y >= 0 && neighbor.y < this.height) {
        
        const neighborTile = this.grid[neighbor.y][neighbor.x];
        if (neighborTile === TILES.LAND_MIDDLE) {
          return true;
        }
      }
    }
    
    return false;
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