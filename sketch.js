// Ocean Simulation with Layered Gaussian Noise and Wave Function Collapse
// Core variables
let oceanNoiseBase, oceanNoiseDetail;
let time = 0;
let tileSize = 32;
let gridWidth = 25;
let gridHeight = 20;
let worldGrid = [];
let cameraX = 0, cameraY = 0;

// Game objects
let boat;
let coins = [];
let islands = [];
let rocks = [];

// WFC system
let wfcTiles;
let generationRadius = 3;
let generatedRegions = new Set(); // Track generated regions
let regionSize = 100; // Size of each generation region

// Noise parameters
let noiseScale1 = 0.01; // Base ocean layer (larger waves)
let noiseScale2 = 0.05; // Detail layer (smaller waves)
let waveSpeed = 0.002;

// Colors
let oceanColors = {
  deep: [20, 80, 120],
  shallow: [40, 120, 180],
  foam: [255, 255, 255, 180]
};

function setup() {
  createCanvas(800, 640);
  
  // Initialize noise layers
  oceanNoiseBase = new Array(gridWidth);
  oceanNoiseDetail = new Array(gridWidth);
  for (let x = 0; x < gridWidth; x++) {
    oceanNoiseBase[x] = new Array(gridHeight);
    oceanNoiseDetail[x] = new Array(gridHeight);
  }
  
  // Initialize world grid
  for (let x = 0; x < gridWidth; x++) {
    worldGrid[x] = new Array(gridHeight);
    for (let y = 0; y < gridHeight; y++) {
      worldGrid[x][y] = { type: 'water', height: 0 };
    }
  }
  
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
  
  // Update noise layers
  updateOceanNoise();
  
  // Handle camera following boat
  updateCamera();
  
  // Check for world expansion
  checkWorldExpansion();
  
  // Render ocean with multiple noise layers
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

function updateOceanNoise() {
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      let worldX = (x * tileSize + cameraX) * noiseScale1;
      let worldY = (y * tileSize + cameraY) * noiseScale1;
      
      // Base ocean layer (large waves)
      oceanNoiseBase[x][y] = noise(worldX, worldY, time * 0.5);
      
      // Detail layer (small waves)
      let detailX = (x * tileSize + cameraX) * noiseScale2;
      let detailY = (y * tileSize + cameraY) * noiseScale2;
      oceanNoiseDetail[x][y] = noise(detailX, detailY, time * 2);
    }
  }
}

function updateCamera() {
  // Camera follows boat with smooth interpolation
  let targetX = boat.x - width/2;
  let targetY = boat.y - height/2;
  
  cameraX = lerp(cameraX, targetX, 0.05);
  cameraY = lerp(cameraY, targetY, 0.05);
}

function checkWorldExpansion() {
  let boatGridX = floor((boat.x + cameraX) / tileSize);
  let boatGridY = floor((boat.y + cameraY) / tileSize);
  
  // Expand world if boat is near edges
  if (boatGridX < generationRadius || boatGridX > gridWidth - generationRadius ||
      boatGridY < generationRadius || boatGridY > gridHeight - generationRadius) {
    expandWorld();
  }
}

function drawOcean() {
  push();
  translate(-cameraX, -cameraY);
  
  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (worldGrid[x][y].type === 'water') {
        let screenX = x * tileSize;
        let screenY = y * tileSize;
        
        // Combine noise layers
        let baseWave = oceanNoiseBase[x][y];
        let detailWave = oceanNoiseDetail[x][y];
        let combinedNoise = baseWave * 0.7 + detailWave * 0.3;
        
        // Calculate ocean color based on combined noise
        let r = lerp(oceanColors.deep[0], oceanColors.shallow[0], combinedNoise);
        let g = lerp(oceanColors.deep[1], oceanColors.shallow[1], combinedNoise);
        let b = lerp(oceanColors.deep[2], oceanColors.shallow[2], combinedNoise);
        
        fill(r, g, b);
        noStroke();
        rect(screenX, screenY, tileSize, tileSize);
      }
    }
  }
  
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
  
  // Draw froth around islands
  for (let island of islands) {
    drawFrothAroundObject(island.x, island.y, island.size + 20);
  }
  
  // Draw froth around rocks
  for (let rock of rocks) {
    drawFrothAroundObject(rock.x, rock.y, rock.size + 10);
  }
  
  pop();
}

function drawFrothAroundObject(objX, objY, radius) {
  stroke(255, 255, 255, 120);
  strokeWeight(2);
  noFill();
  
  beginShape();
  for (let angle = 0; angle < TWO_PI; angle += 0.1) {
    // Create sine wave froth pattern
    let waveOffset = sin(angle * 8 + time * 10) * 3;
    let x = objX + cos(angle) * (radius + waveOffset);
    let y = objY + sin(angle) * (radius + waveOffset);
    vertex(x, y);
  }
  endShape(CLOSE);
  
  // Additional inner froth layer
  stroke(255, 255, 255, 80);
  strokeWeight(1);
  beginShape();
  for (let angle = 0; angle < TWO_PI; angle += 0.15) {
    let waveOffset = sin(angle * 12 + time * 15) * 2;
    let innerRadius = radius - 8;
    let x = objX + cos(angle) * (innerRadius + waveOffset);
    let y = objY + sin(angle) * (innerRadius + waveOffset);
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
  rect(10, 10, 220, 80);
  
  // Coin counter
  fill(255);
  textSize(16);
  text(`Coins: ${boat.coinsCollected}`, 20, 30);
  text(`Speed: ${boat.speed.toFixed(1)}`, 20, 50);
  
  // Controls
  textSize(12);
  text("W/S: Forward/Backward", 20, 70);
  text("A/D: Strafe Left/Right", 20, 85);
}

// Input handling
function keyPressed() {
  boat.handleKeyPressed(key);
}

function keyReleased() {
  boat.handleKeyReleased(key);
}

// Initialize WFC system
function initializeWFC() {
  wfcTiles = {
    water: { weight: 70 },
    island: { weight: 8 },
    rock: { weight: 15 },
    coin: { weight: 7 }
  };
}

function generateInitialWorld() {
  // Generate some initial islands and rocks using WFC
  for (let attempts = 0; attempts < 50; attempts++) {
    let x = random(100, gridWidth * tileSize - 100);
    let y = random(100, gridHeight * tileSize - 100);
    
    let tileType = wfcGenerate(x, y);
    
    if (tileType === 'island') {
      let size = random(40, 80);
      islands.push({
        x: x,
        y: y,
        size: size,
        trees: floor(random(3, 8))
      });
    } else if (tileType === 'rock') {
      rocks.push({
        x: x,
        y: y,
        size: random(15, 30),
        rotation: random(TWO_PI)
      });
    } else if (tileType === 'coin') {
      coins.push({
        x: x,
        y: y,
        collected: false
      });
    }
  }
  
  // Mark initial area as generated
  markRegionAsGenerated(0, 0, gridWidth * tileSize, gridHeight * tileSize);
}

function expandWorld() {
  // Generate new content at world edges using WFC, but only in ungenerated regions
  let attempts = 0;
  let maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    let x = random(cameraX - 200, cameraX + width + 200);
    let y = random(cameraY - 200, cameraY + height + 200);
    
    // Check if this region has already been generated
    if (!isRegionGenerated(x, y) && isPositionValid(x, y)) {
      let tileType = wfcGenerate(x, y);
      
      if (tileType === 'island') {
        let size = random(40, 80);
        islands.push({
          x: x,
          y: y,
          size: size,
          trees: floor(random(3, 8))
        });
        markRegionAsGenerated(x, y, regionSize, regionSize);
      } else if (tileType === 'rock') {
        rocks.push({
          x: x,
          y: y,
          size: random(15, 30),
          rotation: random(TWO_PI)
        });
        markRegionAsGenerated(x, y, regionSize, regionSize);
      } else if (tileType === 'coin') {
        coins.push({
          x: x,
          y: y,
          collected: false
        });
        markRegionAsGenerated(x, y, regionSize, regionSize);
      } else {
        // Even if we generate water, mark the region as generated
        markRegionAsGenerated(x, y, regionSize, regionSize);
      }
    }
    attempts++;
  }
}

function wfcGenerate(x, y) {
  // Simple WFC implementation based on neighboring constraints
  let totalWeight = 0;
  let availableTiles = [];
  
  // Calculate constraints based on nearby objects
  let nearIsland = false;
  let nearRock = false;
  
  for (let island of islands) {
    if (dist(x, y, island.x, island.y) < 100) {
      nearIsland = true;
      break;
    }
  }
  
  for (let rock of rocks) {
    if (dist(x, y, rock.x, rock.y) < 50) {
      nearRock = true;
      break;
    }
  }
  
  // Adjust weights based on constraints
  for (let [type, data] of Object.entries(wfcTiles)) {
    let weight = data.weight;
    
    // Reduce island weight if near another island
    if (type === 'island' && nearIsland) weight *= 0.1;
    
    // Reduce rock weight if near another rock
    if (type === 'rock' && nearRock) weight *= 0.2;
    
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

function isPositionValid(x, y) {
  // Check minimum distance from existing objects
  for (let island of islands) {
    if (dist(x, y, island.x, island.y) < 60) return false;
  }
  
  for (let rock of rocks) {
    if (dist(x, y, rock.x, rock.y) < 40) return false;
  }
  
  for (let coin of coins) {
    if (dist(x, y, coin.x, coin.y) < 30) return false;
  }
  
  return true;
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