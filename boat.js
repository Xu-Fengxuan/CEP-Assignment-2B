class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.direction = 0; // Current visual direction
    this.targetDirection = 0; // Target direction to smoothly transition to
    this.directionSpeed = 0.3; // How fast direction changes (0.1 = slow, 1.0 = instant)
    this.speed = 3;
    this.radius = 16; // Changed from size to radius (half of 32px sprite diameter)
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

    // Update target direction based on movement
    if (moveX !== 0 || moveY !== 0) {
      this.targetDirection = this.getDirection(moveX, moveY);
    }

    // Smoothly interpolate current direction towards target direction
    this.updateDirectionSmooth();

    // Move boat with sliding collision
    const newX = this.x + moveX * this.speed;
    const newY = this.y + moveY * this.speed;

    // Check collision with land tiles and implement sliding
    this.moveWithSliding(newX, newY, moveX, moveY);

    // Check for coin collection
    this.collectCoins();

    // Generate new sections if needed
    this.checkSectionGeneration();
  }

  updateDirectionSmooth() {
    if (this.direction === this.targetDirection) return;

    // Calculate the shortest rotation path (accounting for wrap-around)
    let diff = this.targetDirection - this.direction;
    
    // Handle wrap-around (shortest path around the circle)
    if (diff > 8) {
      diff -= 16;
    } else if (diff < -8) {
      diff += 16;
    }
    
    // Apply smooth interpolation
    const directionChange = diff * this.directionSpeed;
    this.direction += directionChange;
    
    // Handle wrap-around for current direction
    if (this.direction >= 16) {
      this.direction -= 16;
    } else if (this.direction < 0) {
      this.direction += 16;
    }
    
    // Snap to target if very close to prevent infinite micro-adjustments
    if (Math.abs(diff) < 0.1) {
      this.direction = this.targetDirection;
    }
  }

  // Move boat with sliding collision detection
  moveWithSliding(targetX, targetY, moveX, moveY) {
    // First try to move to the target position
    if (this.canMoveTo(targetX, targetY)) {
      this.x = targetX;
      this.y = targetY;
      return;
    }
    
    // If full movement is blocked, try sliding along walls
    // Try horizontal movement only
    const horizontalX = this.x + moveX * this.speed;
    const canMoveHorizontal = this.canMoveTo(horizontalX, this.y);
    
    // Try vertical movement only
    const verticalY = this.y + moveY * this.speed;
    const canMoveVertical = this.canMoveTo(this.x, verticalY);
    
    // Apply sliding movement
    if (canMoveHorizontal && canMoveVertical) {
      // Both directions are free - this shouldn't happen if we got here
      // but handle it just in case
      this.x = horizontalX;
      this.y = verticalY;
    } else if (canMoveHorizontal) {
      // Only horizontal movement is possible - slide along vertical wall
      this.x = horizontalX;
    } else if (canMoveVertical) {
      // Only vertical movement is possible - slide along horizontal wall
      this.y = verticalY;
    }
    // If neither direction is possible, boat stays in place
  }

  canMoveTo(x, y) {
    // Use circular collision detection
    const radius = this.radius;
    
    // Check collision in a circle around the boat position
    const checkRadius = radius + 2; // Small buffer for smoother collision
    const steps = 8; // Number of points to check around the circle
    
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const checkX = x + Math.cos(angle) * checkRadius;
      const checkY = y + Math.sin(angle) * checkRadius;
      
      const gridX = Math.floor(checkX / tileSize);
      const gridY = Math.floor(checkY / tileSize);
      const tile = this.getTileAt(gridX, gridY);
      
      // If any point on the circle hits a land tile, check specific collision area
      if (isLandTile(tile)) {
        if (this.checkLandTileCollision(checkX, checkY, gridX, gridY, tile)) {
          return false;
        }
      }
    }
    
    // Also check the center point
    const centerGridX = Math.floor(x / tileSize);
    const centerGridY = Math.floor(y / tileSize);
    const centerTile = this.getTileAt(centerGridX, centerGridY);
    
    if (isLandTile(centerTile)) {
      if (this.checkLandTileCollision(x, y, centerGridX, centerGridY, centerTile)) {
        return false;
      }
    }
    
    return true;
  }

  checkLandTileCollision(worldX, worldY, gridX, gridY, tileType) {
    // Convert world coordinates to local tile coordinates (0-32)
    const localX = worldX - (gridX * tileSize);
    const localY = worldY - (gridY * tileSize);
    
    // Check collision based on tile type's specific collision area
    switch(tileType) {
      case TILES.LAND_TOP_LEFT:
        // Bottom right quadrant only (16-32, 16-32)
        return localX >= 16 && localY >= 16;
        
      case TILES.LAND_TOP_MIDDLE:
        // Bottom half only (0-32, 16-32)
        return localY >= 16;
        
      case TILES.LAND_TOP_RIGHT:
        // Bottom left quadrant only (0-16, 16-32)
        return localX <= 16 && localY >= 16;
        
      case TILES.LAND_LEFT_MIDDLE:
        // Right half only (16-32, 0-32)
        return localX >= 16;
        
      case TILES.LAND_MIDDLE:
        // Whole tile (0-32, 0-32)
        return true;
        
      case TILES.LAND_RIGHT_MIDDLE:
        // Left half only (0-16, 0-32)
        return localX <= 16;
        
      case TILES.LAND_BOTTOM_LEFT:
        // Top right quadrant only (16-32, 0-16)
        return localX >= 16 && localY <= 16;
        
      case TILES.LAND_BOTTOM_MIDDLE:
        // Top half only (0-32, 0-16)
        return localY <= 16;
        
      case TILES.LAND_BOTTOM_RIGHT:
        // Top left quadrant only (0-16, 0-16)
        return localX <= 16 && localY <= 16;
        
      default:
        // For any other land tiles, use full collision
        return true;
    }
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
      
      // Use radius instead of size for collision
      if (distance < this.radius) {
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
    
    // Use the smoothly interpolated direction for rendering
    const renderDirection = Math.round(this.direction);
    const validDirection = Math.max(0, Math.min(15, renderDirection));
    
    if (spritesLoaded && boatSprites && boatSprites[validDirection]) {
      // Draw the boat sprite
      imageMode(CENTER);
      const spriteSize = 32; // Scale up the 16x16 sprite
      image(boatSprites[validDirection], 0, 0, spriteSize, spriteSize);
      
      // Debug: Draw collision circle (uncomment to visualize)
      // stroke(255, 0, 0, 100);
      // strokeWeight(1);
      // noFill();
      // ellipse(0, 0, this.radius * 2, this.radius * 2);
    } else {
      // Fallback to simple drawing if sprites not loaded
      fill(139, 69, 19);
      stroke(101, 67, 33);
      strokeWeight(1);
      ellipse(0, 0, this.radius * 2, this.radius * 2);
      
      // Add a direction indicator
      fill(255, 0, 0);
      const angle = validDirection * (Math.PI * 2) / 16;
      const dx = Math.cos(angle) * this.radius / 2;
      const dy = Math.sin(angle) * this.radius / 2;
      ellipse(dx, dy, 4, 4);
    }
    
    pop();
  }
}