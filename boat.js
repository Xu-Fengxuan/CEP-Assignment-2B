class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.direction = 0; // Current visual direction
    this.targetDirection = 0; // Target direction to smoothly transition to
    this.directionSpeed = 0.3; // How fast direction changes (0.1 = slow, 1.0 = instant)
    this.speed = 3;
    this.radius = 16; // Collision radius (half of 32px sprite diameter)
  }

  update() {
    // Only update if game is in playing state
    if (gameState !== GAME_STATES.PLAYING) return;
    
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

    // Check for damage-causing collisions
    this.checkDamageCollisions();

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
      // Reset land immunity only when we can move freely to our intended target
      // This means we're no longer blocked by land
      damageImmunity.lastLandCollision = false;
      return;
    }
    
    // If we can't move to target position, check if it's because of land collision
    // and apply damage if so
    if (this.isCollidingWithLand(targetX, targetY) && !damageImmunity.lastLandCollision) {
      takeDamage(BOAT_STATS.LAND_DAMAGE, 'land');
      damageImmunity.lastLandCollision = true;
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
    // Don't reset immunity here - only reset when we can move to our intended target
  }

  canMoveTo(x, y) {
    // Use circle-rectangle collision detection
    return !this.isCollidingWithLand(x, y);
  }

  getLandTileCollider(tileX, tileY, tileType) {
    const tileWorldX = tileX * tileSize;
    const tileWorldY = tileY * tileSize;
    
    // Return the collision rectangle for each land tile type
    // Corner tiles have colliders in the quarter opposite to their name
    // Side tiles have colliders in the half opposite to their name
    switch(tileType) {
      case TILES.LAND_TOP_LEFT:
        // Bottom right quadrant
        return {
          x: tileWorldX + 16,
          y: tileWorldY + 16,
          width: 16,
          height: 16
        };
        
      case TILES.LAND_TOP_MIDDLE:
        // Bottom half
        return {
          x: tileWorldX,
          y: tileWorldY + 16,
          width: 32,
          height: 16
        };
        
      case TILES.LAND_TOP_RIGHT:
        // Bottom left quadrant
        return {
          x: tileWorldX,
          y: tileWorldY + 16,
          width: 16,
          height: 16
        };
        
      case TILES.LAND_LEFT_MIDDLE:
        // Right half
        return {
          x: tileWorldX + 16,
          y: tileWorldY,
          width: 16,
          height: 32
        };
        
      case TILES.LAND_MIDDLE:
        // Whole tile
        return {
          x: tileWorldX,
          y: tileWorldY,
          width: 32,
          height: 32
        };
        
      case TILES.LAND_RIGHT_MIDDLE:
        // Left half
        return {
          x: tileWorldX,
          y: tileWorldY,
          width: 16,
          height: 32
        };
        
      case TILES.LAND_BOTTOM_LEFT:
        // Top right quadrant
        return {
          x: tileWorldX + 16,
          y: tileWorldY,
          width: 16,
          height: 16
        };
        
      case TILES.LAND_BOTTOM_MIDDLE:
        // Top half
        return {
          x: tileWorldX,
          y: tileWorldY,
          width: 32,
          height: 16
        };
        
      case TILES.LAND_BOTTOM_RIGHT:
        // Top left quadrant
        return {
          x: tileWorldX,
          y: tileWorldY,
          width: 16,
          height: 16
        };
        
      default:
        // For any other land tiles, use full collision
        return {
          x: tileWorldX,
          y: tileWorldY,
          width: 32,
          height: 32
        };
    }
  }

  circleRectangleCollision(circle, rectangle) {
    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
    const closestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));
    
    // Calculate the distance between the circle center and this closest point
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    
    // Check if the distance is less than the circle's radius
    return distanceSquared < (circle.radius * circle.radius);
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
    
    // Map angle to sprite directions
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
        totalScore += 10;
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

  checkDamageCollisions() {
    const currentRockCollision = this.isCollidingWithRockCenter();
    
    // Rock damage logic - only take damage when starting to collide  
    if (currentRockCollision && !damageImmunity.lastRockCollision) {
      takeDamage(BOAT_STATS.ROCK_DAMAGE, 'rock');
      damageImmunity.lastRockCollision = true;
    }
    
    // Reset rock immunity only when no longer colliding with rocks
    if (!currentRockCollision && damageImmunity.lastRockCollision) {
      damageImmunity.lastRockCollision = false;
    }
    
    // Note: Land immunity is handled in moveWithSliding() since land damage
    // is triggered by movement attempts, not just position-based collision
  }

  isCollidingWithLand(x, y) {
    // Get all nearby tiles to check collision against
    const boatCircle = { x: x, y: y, radius: this.radius };
    
    // Calculate the range of tiles to check based on boat position and radius
    const buffer = this.radius + tileSize; // Extra buffer to ensure we check all relevant tiles
    const minTileX = Math.floor((x - buffer) / tileSize);
    const maxTileX = Math.ceil((x + buffer) / tileSize);
    const minTileY = Math.floor((y - buffer) / tileSize);
    const maxTileY = Math.ceil((y + buffer) / tileSize);
    
    // Loop through all tiles in the range
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tile = this.getTileAt(tileX, tileY);
        
        // Check collision with land tiles
        if (isLandTile(tile)) {
          const collider = this.getLandTileCollider(tileX, tileY, tile);
          if (collider && this.circleRectangleCollision(boatCircle, collider)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  isCollidingWithRockCenter() {
    // Check collision with rock center (8 pixel radius from center)
    const boatCircle = { x: this.x, y: this.y, radius: this.radius };
    
    // Calculate the range of tiles to check
    const buffer = this.radius + tileSize;
    const minTileX = Math.floor((this.x - buffer) / tileSize);
    const maxTileX = Math.ceil((this.x + buffer) / tileSize);
    const minTileY = Math.floor((this.y - buffer) / tileSize);
    const maxTileY = Math.ceil((this.y + buffer) / tileSize);
    
    // Loop through all tiles in the range
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tile = this.getTileAt(tileX, tileY);
        
        if (tile === TILES.ROCK) {
          // Create a circular collider for the center 6 pixels of the rock
          const rockCenterX = tileX * tileSize + tileSize / 2;
          const rockCenterY = tileY * tileSize + tileSize / 2;
          const rockCenterRadius = 6;
          
          // Check circle-to-circle collision
          const distance = Math.sqrt(
            (this.x - rockCenterX) ** 2 + 
            (this.y - rockCenterY) ** 2
          );
          
          if (distance < (this.radius + rockCenterRadius)) {
            return true;
          }
        }
      }
    }
    
    return false;
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
      
      // Collision visualization (uncomment for debugging)
      // stroke(255, 0, 0, 100);
      // strokeWeight(1);
      // noFill();
      // ellipse(0, 0, this.radius * 2, this.radius * 2);
      
      // Collision areas visualization (uncomment for debugging)
      // this.debugDrawColliders();
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

  debugDrawColliders() {
    // Draw colliders for nearby tiles (for debugging)
    const buffer = this.radius + tileSize;
    const minTileX = Math.floor((this.x - buffer) / tileSize);
    const maxTileX = Math.ceil((this.x + buffer) / tileSize);
    const minTileY = Math.floor((this.y - buffer) / tileSize);
    const maxTileY = Math.ceil((this.y + buffer) / tileSize);
    
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tile = this.getTileAt(tileX, tileY);
        
        if (isLandTile(tile)) {
          const collider = this.getLandTileCollider(tileX, tileY, tile);
          if (collider) {
            push();
            translate(-this.x, -this.y); // Undo boat translation
            stroke(255, 0, 0, 150);
            strokeWeight(2);
            noFill();
            rect(collider.x, collider.y, collider.width, collider.height);
            pop();
          }
        }
        
        if (tile === TILES.ROCK) {
          // Draw rock center collision area
          const rockCenterX = tileX * tileSize + tileSize / 2;
          const rockCenterY = tileY * tileSize + tileSize / 2;
          push();
          translate(-this.x, -this.y); // Undo boat translation
          stroke(0, 255, 255, 150);
          strokeWeight(2);
          noFill();
          ellipse(rockCenterX, rockCenterY, 16, 16); // 8 pixel radius = 16 diameter
          pop();
        }
      }
    }
  }
}
