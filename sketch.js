// Ocean Simulation with Wave Function Collapse
// Core variables
let time = 0;
let cameraX = 0, cameraY = 0;

// Game objects
let boat;
let coins = [];
let islands = [];
let rocks = [];

// WFC system
let wfcTiles;
let generatedRegions = new Set(); // Track generated regions
let regionSize = 400; // Size of each generation region (20 grids * 20 pixels)
let gridSize = 20; // Each WFC grid is 20 pixels
let wfcGrid = {}; // Store WFC grid state

// Animation parameters
let waveSpeed = 0.002;

function setup() {
  createCanvas(800, 640);
  
  // Initialize WFC system
  initializeWFC();
  
  // Create boat
  boat = new Boat(width/2, height/2);
  
  // Generate initial world
  generateInitialWorld();
}

function draw() {
  background(30, 90, 150);
  
  // Update time for animation
  time += waveSpeed;
  
  // Handle camera following boat
  updateCamera();
  
  // Check for world expansion
  checkWorldExpansion();
  
  // Render simple ocean background
  drawOcean();
  
  // Draw world objects (islands, rocks)
  drawWorldObjects();
  
  // Draw ocean froth around objects
  drawOceanFroth();
  
  // Update and draw boat
  boat.update();
  boat.draw();
  
  // Draw coins
  drawCoins();
  
  // Check coin collection
  checkCoinCollection();
  
  // Draw UI
  drawUI();
}

function updateCamera() {
  // Camera follows boat with smooth interpolation
  let targetX = boat.x - width/2;
  let targetY = boat.y - height/2;
  
  cameraX = lerp(cameraX, targetX, 0.05);
  cameraY = lerp(cameraY, targetY, 0.05);
}

function checkWorldExpansion() {
  // Check if boat is near the edge of generated content more frequently
  // since we're now generating smaller areas
  let bufferZone = 300;
  let checkDistance = 150; // Check when boat is 150px from buffer edge
  
  // Calculate bounds of what should be generated
  let leftBound = cameraX - bufferZone;
  let rightBound = cameraX + width + bufferZone;
  let topBound = cameraY - bufferZone;
  let bottomBound = cameraY + height + bufferZone;
  
  // Check if boat is approaching the edges of the generated area
  let needsExpansion = false;
  
  if (boat.x < leftBound + checkDistance || 
      boat.x > rightBound - checkDistance ||
      boat.y < topBound + checkDistance || 
      boat.y > bottomBound - checkDistance) {
    needsExpansion = true;
  }
  
  // Also check for any ungenerated regions in the visible area
  if (!needsExpansion) {
    let visibleStartX = floor(cameraX / gridSize);
    let visibleEndX = floor((cameraX + width) / gridSize);
    let visibleStartY = floor(cameraY / gridSize);
    let visibleEndY = floor((cameraY + height) / gridSize);
    
    for (let gx = visibleStartX; gx <= visibleEndX && !needsExpansion; gx++) {
      for (let gy = visibleStartY; gy <= visibleEndY && !needsExpansion; gy++) {
        let worldX = gx * gridSize;
        let worldY = gy * gridSize;
        if (!isRegionGenerated(worldX, worldY)) {
          needsExpansion = true;
        }
      }
    }
  }
  
  if (needsExpansion) {
    expandWorld();
  }
}

function drawOcean() {
  // Simple solid ocean background - no need for complex noise
  fill(25, 85, 135);
  noStroke();
  
  // Draw ocean covering the visible area
  push();
  translate(-cameraX, -cameraY);
  
  let oceanLeft = cameraX - 100;
  let oceanTop = cameraY - 100;
  let oceanWidth = width + 200;
  let oceanHeight = height + 200;
  
  rect(oceanLeft, oceanTop, oceanWidth, oceanHeight);
  
  pop();
}

function drawWorldObjects() {
  push();
  translate(-cameraX, -cameraY);
  
  // Draw islands
  fill(101, 67, 33);
  for (let island of islands) {
    ellipse(island.x, island.y, island.size, island.size);
    
    // Add some vegetation
    fill(34, 139, 34);
    for (let i = 0; i < island.trees; i++) {
      let angle = (i / island.trees) * TWO_PI;
      let treeX = island.x + cos(angle) * (island.size * 0.2);
      let treeY = island.y + sin(angle) * (island.size * 0.2);
      ellipse(treeX, treeY, 8, 8);
    }
  }
  
  // Draw rocks
  fill(80, 80, 80);
  for (let rock of rocks) {
    push();
    translate(rock.x, rock.y);
    rotate(rock.rotation);
    ellipse(0, 0, rock.size, rock.size * 0.8);
    pop();
  }
  
  pop();
}

function drawOceanFroth() {
  push();
  translate(-cameraX, -cameraY);
  
  // Draw rippling waves around islands
  for (let island of islands) {
    drawRipplingWaves(island.x, island.y, island.size / 2);
  }
  
  // Draw rippling waves around rocks
  for (let rock of rocks) {
    drawRipplingWaves(rock.x, rock.y, rock.size / 2);
  }
  
  pop();
}

function drawRipplingWaves(objX, objY, radius) {
  // Create multiple wave rings propagating outward
  let numWaves = 5;
  let maxWaveDistance = 80;
  
  for (let wave = 0; wave < numWaves; wave++) {
    let waveOffset = (time * 3 + wave * 0.5) % (maxWaveDistance / 10);
    let currentRadius = radius + (waveOffset * 10);
    
    if (currentRadius <= radius + maxWaveDistance) {
      // Calculate transparency based on distance from object
      let distanceFromEdge = currentRadius - radius;
      let alpha = map(distanceFromEdge, 0, maxWaveDistance, 150, 0);
      alpha *= sin(waveOffset * 2) * 0.5 + 0.5; // Add sine wave modulation
      
      if (alpha > 0) {
        stroke(255, 255, 255, alpha);
        strokeWeight(1 + sin(waveOffset * 3) * 0.5);
        noFill();
        
        // Create wavy circle using sine waves
        beginShape();
        for (let angle = 0; angle < TWO_PI; angle += 0.1) {
          let waveAmplitude = 2 + sin(time * 8 + angle * 6) * 1;
          let x = objX + cos(angle) * (currentRadius + waveAmplitude);
          let y = objY + sin(angle) * (currentRadius + waveAmplitude);
          vertex(x, y);
        }
        endShape(CLOSE);
      }
    }
  }
  
  // Add foam at the edge of objects
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  noFill();
  
  beginShape();
  for (let angle = 0; angle < TWO_PI; angle += 0.1) {
    let foamOffset = sin(angle * 10 + time * 12) * 2;
    let x = objX + cos(angle) * (radius + 5 + foamOffset);
    let y = objY + sin(angle) * (radius + 5 + foamOffset);
    vertex(x, y);
  }
  endShape(CLOSE);
}

function drawCoins() {
  push();
  translate(-cameraX, -cameraY);
  
  for (let coin of coins) {
    if (!coin.collected) {
      push();
      translate(coin.x, coin.y);
      rotate(time * 5);
      
      // Coin glow effect
      for (let r = 20; r > 0; r -= 4) {
        fill(255, 215, 0, 20);
        ellipse(0, 0, r, r);
      }
      
      fill(255, 215, 0);
      stroke(218, 165, 32);
      strokeWeight(2);
      ellipse(0, 0, 12, 12);
      
      // Coin center
      fill(255, 255, 100);
      ellipse(0, 0, 6, 6);
      
      pop();
    }
  }
  
  pop();
}

function checkCoinCollection() {
  for (let coin of coins) {
    if (!coin.collected) {
      let distance = dist(boat.x, boat.y, coin.x, coin.y);
      if (distance < 20) {
        coin.collected = true;
        boat.coinsCollected++;
      }
    }
  }
}

function drawUI() {
  // UI background
  fill(0, 0, 0, 100);
  rect(10, 10, 250, 100);
  
  // Coin counter
  fill(255);
  textSize(16);
  text(`Coins: ${boat.coinsCollected}`, 20, 30);
  text(`Speed: ${boat.speed.toFixed(1)}`, 20, 50);
  
  // Controls
  textSize(12);
  text("WASD or Arrow Keys:", 20, 70);
  text("W/↑: Forward, S/↓: Backward", 20, 85);
  text("A/←: Left, D/→: Right", 20, 100);
}

// Input handling with proper key state tracking
let keysPressed = {};

function keyPressed() {
  keysPressed[key.toLowerCase()] = true;
  updateBoatKeys();
}

function keyReleased() {
  keysPressed[key.toLowerCase()] = false;
  updateBoatKeys();
}

function updateBoatKeys() {
  if (boat) {
    // WASD controls
    boat.keys.forward = keysPressed['w'] || false;
    boat.keys.backward = keysPressed['s'] || false;
    boat.keys.left = keysPressed['a'] || false;
    boat.keys.right = keysPressed['d'] || false;
    
    // Arrow key controls (alternative)
    boat.keys.forward = boat.keys.forward || keysPressed['arrowup'] || false;
    boat.keys.backward = boat.keys.backward || keysPressed['arrowdown'] || false;
    boat.keys.left = boat.keys.left || keysPressed['arrowleft'] || false;
    boat.keys.right = boat.keys.right || keysPressed['arrowright'] || false;
  }
}

// Handle window focus events to reset keys
function windowResized() {
  // Reset all keys when window is resized (often happens when losing focus)
  keysPressed = {};
  updateBoatKeys();
}

// Additional safety for key handling
document.addEventListener('blur', function() {
  keysPressed = {};
  updateBoatKeys();
});

document.addEventListener('keyup', function(event) {
  keysPressed[event.key.toLowerCase()] = false;
  updateBoatKeys();
});

document.addEventListener('keydown', function(event) {
  keysPressed[event.key.toLowerCase()] = true;
  updateBoatKeys();
});

// Initialize WFC system
function initializeWFC() {
  wfcTiles = {
    water: { weight: 50 }, // Reduced from 70 to increase object density
    island: { weight: 12 }, // Increased from 8
    rock: { weight: 20 }, // Increased from 15
    coin: { weight: 18 } // Increased from 7
  };
}

function generateInitialWorld() {
  // Generate objects using grid-based WFC
  let startGridX = -10;
  let startGridY = -10;
  let endGridX = 20;
  let endGridY = 15;
  
  for (let gx = startGridX; gx < endGridX; gx++) {
    for (let gy = startGridY; gy < endGridY; gy++) {
      if (!isGridOccupied(gx, gy)) {
        let tileType = wfcGenerateGrid(gx, gy);
        
        if (tileType === 'island') {
          if (canPlaceObjectAt(gx, gy, 'island')) {
            generateIslandAt(gx, gy);
          }
        } else if (tileType === 'rock') {
          if (canPlaceObjectAt(gx, gy, 'rock')) {
            generateRockAt(gx, gy);
          }
        } else if (tileType === 'coin') {
          if (canPlaceObjectAt(gx, gy, 'coin')) {
            generateCoinAt(gx, gy);
          }
        }
      }
    }
  }
  
  // Mark initial area as generated
  markRegionAsGenerated(startGridX * gridSize, startGridY * gridSize, 
                       (endGridX - startGridX) * gridSize, (endGridY - startGridY) * gridSize);
}

function expandWorld() {
  // Generate new content only in visible screen area + 300px buffer
  let bufferZone = 300;
  
  // Calculate visible area bounds with buffer
  let leftBound = cameraX - bufferZone;
  let rightBound = cameraX + width + bufferZone;
  let topBound = cameraY - bufferZone;
  let bottomBound = cameraY + height + bufferZone;
  
  // Convert to grid coordinates
  let startGridX = floor(leftBound / gridSize);
  let endGridX = floor(rightBound / gridSize);
  let startGridY = floor(topBound / gridSize);
  let endGridY = floor(bottomBound / gridSize);
  
  let generatedCount = 0;
  
  for (let gx = startGridX; gx <= endGridX; gx++) {
    for (let gy = startGridY; gy <= endGridY; gy++) {
      let worldX = gx * gridSize;
      let worldY = gy * gridSize;
      
      // Check if this region has already been generated
      if (!isRegionGenerated(worldX, worldY) && !isGridOccupied(gx, gy)) {
        let tileType = wfcGenerateGrid(gx, gy);
        
        if (tileType === 'island') {
          if (canPlaceObjectAt(gx, gy, 'island')) {
            generateIslandAt(gx, gy);
            generatedCount++;
          }
        } else if (tileType === 'rock') {
          if (canPlaceObjectAt(gx, gy, 'rock')) {
            generateRockAt(gx, gy);
            generatedCount++;
          }
        } else if (tileType === 'coin') {
          if (canPlaceObjectAt(gx, gy, 'coin')) {
            generateCoinAt(gx, gy);
            generatedCount++;
          }
        }
        
        // Mark this small region as generated even if nothing was placed
        markRegionAsGenerated(worldX, worldY, gridSize, gridSize);
      }
    }
  }
}

function wfcGenerateGrid(gridX, gridY) {
  // Grid-based WFC implementation
  let totalWeight = 0;
  let availableTiles = [];
  
  // Calculate constraints based on nearby objects
  let nearIsland = false;
  let nearRock = false;
  
  // Check in a smaller radius for more dense generation
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let checkKey = `${gridX + dx},${gridY + dy}`;
      if (wfcGrid[checkKey]) {
        if (wfcGrid[checkKey] === 'island') nearIsland = true;
        if (wfcGrid[checkKey] === 'rock') nearRock = true;
      }
    }
  }
  
  // Adjust weights based on constraints (less restrictive for denser generation)
  for (let [type, data] of Object.entries(wfcTiles)) {
    let weight = data.weight;
    
    // Reduce island weight if near another island (less restrictive)
    if (type === 'island' && nearIsland) weight *= 0.3;
    
    // Reduce rock weight if near another rock (less restrictive)
    if (type === 'rock' && nearRock) weight *= 0.5;
    
    // Increase coin weight near islands
    if (type === 'coin' && nearIsland) weight *= 2;
    
    if (weight > 0) {
      availableTiles.push({ type, weight });
      totalWeight += weight;
    }
  }
  
  // Weighted random selection
  let randomValue = random(totalWeight);
  let currentWeight = 0;
  
  for (let tile of availableTiles) {
    currentWeight += tile.weight;
    if (randomValue <= currentWeight) {
      return tile.type;
    }
  }
  
  return 'water';
}

function canPlaceObjectAt(gridX, gridY, objectType) {
  // Determine the size of the object we're trying to place
  let objectSize = 1;
  let checkRadius = 0;
  
  if (objectType === 'island') {
    objectSize = 10; // Average island size
    checkRadius = objectSize + 2; // Extra padding
  } else if (objectType === 'rock') {
    objectSize = 4; // Average rock size  
    checkRadius = objectSize + 1; // Smaller padding
  } else if (objectType === 'coin') {
    objectSize = 1;
    checkRadius = 2; // Minimal padding
  }
  
  // Check for overlaps with existing objects
  let centerX = (gridX + objectSize/2) * gridSize;
  let centerY = (gridY + objectSize/2) * gridSize;
  
  // Check against existing islands
  for (let island of islands) {
    let distance = dist(centerX, centerY, island.x, island.y);
    let minDistance = (island.size / 2) + (objectSize * gridSize / 2) + 20; // 20 pixel buffer
    if (distance < minDistance) {
      return false;
    }
  }
  
  // Check against existing rocks
  for (let rock of rocks) {
    let distance = dist(centerX, centerY, rock.x, rock.y);
    let minDistance = (rock.size / 2) + (objectSize * gridSize / 2) + 15; // 15 pixel buffer
    if (distance < minDistance) {
      return false;
    }
  }
  
  // Check against existing coins (only for non-coin objects)
  if (objectType !== 'coin') {
    for (let coin of coins) {
      let distance = dist(centerX, centerY, coin.x, coin.y);
      let minDistance = (objectSize * gridSize / 2) + 10; // 10 pixel buffer
      if (distance < minDistance) {
        return false;
      }
    }
  }
  
  return true;
}

function isGridOccupied(gridX, gridY) {
  return wfcGrid[`${gridX},${gridY}`] !== undefined;
}

function generateIslandAt(gridX, gridY) {
  // Islands are smaller: 5-15 grids large (was 10-30)
  let islandGridSize = floor(random(5, 16));
  let centerX = (gridX + islandGridSize/2) * gridSize;
  let centerY = (gridY + islandGridSize/2) * gridSize;
  let size = islandGridSize * gridSize * 0.8; // Slightly smaller than grid area
  
  islands.push({
    x: centerX,
    y: centerY,
    size: size,
    trees: floor(random(3, 8)),
    gridSize: islandGridSize
  });
  
  // Mark all grids this island occupies
  for (let dx = 0; dx < islandGridSize; dx++) {
    for (let dy = 0; dy < islandGridSize; dy++) {
      wfcGrid[`${gridX + dx},${gridY + dy}`] = 'island';
    }
  }
}

function generateRockAt(gridX, gridY) {
  // Rocks are slightly bigger: 2-6 grids large (was 1-4)
  let rockGridSize = floor(random(2, 7));
  let centerX = (gridX + rockGridSize/2) * gridSize;
  let centerY = (gridY + rockGridSize/2) * gridSize;
  let size = rockGridSize * gridSize * 0.7; // Slightly bigger relative size
  
  rocks.push({
    x: centerX,
    y: centerY,
    size: size,
    rotation: random(TWO_PI),
    gridSize: rockGridSize
  });
  
  // Mark all grids this rock occupies
  for (let dx = 0; dx < rockGridSize; dx++) {
    for (let dy = 0; dy < rockGridSize; dy++) {
      wfcGrid[`${gridX + dx},${gridY + dy}`] = 'rock';
    }
  }
}

function generateCoinAt(gridX, gridY) {
  let centerX = (gridX + 0.5) * gridSize;
  let centerY = (gridY + 0.5) * gridSize;
  
  coins.push({
    x: centerX,
    y: centerY,
    collected: false
  });
  
  wfcGrid[`${gridX},${gridY}`] = 'coin';
}

function getRegionKey(x, y) {
  // Convert world coordinates to region grid coordinates
  let regionX = floor(x / regionSize);
  let regionY = floor(y / regionSize);
  return `${regionX},${regionY}`;
}

function isRegionGenerated(x, y) {
  let key = getRegionKey(x, y);
  return generatedRegions.has(key);
}

function markRegionAsGenerated(x, y, width, height) {
  // Mark all regions that intersect with the given area
  let startX = floor(x / regionSize);
  let startY = floor(y / regionSize);
  let endX = floor((x + width) / regionSize);
  let endY = floor((y + height) / regionSize);
  
  for (let rx = startX; rx <= endX; rx++) {
    for (let ry = startY; ry <= endY; ry++) {
      let key = `${rx},${ry}`;
      generatedRegions.add(key);
    }
  }
}