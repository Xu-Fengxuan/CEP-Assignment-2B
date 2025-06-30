// Boat.js - Player-controlled boat class
class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.maxSpeed = 72; // Doubled from 18 to 36 (2x faster)
    this.acceleration = 2.4; // Doubled acceleration to match
    this.friction = 0.95;
    this.turnSpeed = 0.12; // Adjusted for smoother turning
    
    // Movement flags
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    
    // Game state
    this.coinsCollected = 0;
    
    // Visual properties
    this.size = 20;
    this.wakeTrail = [];
    this.maxWakeLength = 15;
  }
  
  update() {
    // Calculate movement vector based on input
    let moveX = 0;
    let moveY = 0;
    
    if (this.keys.forward) {
      moveY -= this.acceleration;
    }
    if (this.keys.backward) {
      moveY += this.acceleration; // Fixed: removed 0.5 multiplier
    }
    if (this.keys.left) {
      moveX -= this.acceleration;
    }
    if (this.keys.right) {
      moveX += this.acceleration;
    }
    
    // Apply movement
    this.x += moveX;
    this.y += moveY;
    
    // Update angle based on movement direction
    if (moveX !== 0 || moveY !== 0) {
      let targetAngle = atan2(moveY, moveX);
      // Smooth angle interpolation
      let angleDiff = targetAngle - this.angle;
      
      // Handle angle wrapping
      if (angleDiff > PI) angleDiff -= TWO_PI;
      if (angleDiff < -PI) angleDiff += TWO_PI;
      
      this.angle += angleDiff * 0.1;
      
      // Update speed for visual effects
      this.speed = sqrt(moveX * moveX + moveY * moveY) * 10;
    } else {
      this.speed *= this.friction;
    }
    
    // Add to wake trail if moving fast enough
    if (abs(this.speed) > 0.5) {
      this.wakeTrail.push({
        x: this.x - cos(this.angle) * this.size * 0.5,
        y: this.y - sin(this.angle) * this.size * 0.5,
        life: 1.0
      });
      
      // Limit wake trail length
      if (this.wakeTrail.length > this.maxWakeLength) {
        this.wakeTrail.shift();
      }
    }
    
    // Update wake trail life
    for (let wake of this.wakeTrail) {
      wake.life -= 0.02;
    }
    
    // Remove dead wake particles
    this.wakeTrail = this.wakeTrail.filter(wake => wake.life > 0);
    
    // Check collision with islands and rocks
    this.checkCollisions();
  }
  
  draw() {
    push();
    translate(-cameraX, -cameraY);
    
    // Draw wake trail
    this.drawWake();
    
    // Draw boat
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    
    // Boat body
    fill(139, 69, 19);
    stroke(101, 67, 33);
    strokeWeight(2);
    ellipse(0, 0, this.size, this.size * 0.6);
    
    // Boat front
    fill(160, 82, 45);
    triangle(this.size * 0.3, 0, this.size * 0.5, -this.size * 0.2, this.size * 0.5, this.size * 0.2);
    
    // Mast
    stroke(101, 67, 33);
    strokeWeight(3);
    line(0, 0, 0, -this.size * 0.8);
    
    // Sail
    if (abs(this.speed) > 0.5) {
      fill(255, 255, 255, 200);
      stroke(200);
      strokeWeight(1);
      beginShape();
      vertex(-this.size * 0.3, -this.size * 0.7);
      vertex(-this.size * 0.1, -this.size * 0.3);
      vertex(-this.size * 0.1, -this.size * 0.1);
      vertex(-this.size * 0.3, -this.size * 0.5);
      endShape(CLOSE);
    }
    
    pop();
    pop();
  }
  
  drawWake() {
    // Draw wake trail
    for (let i = 0; i < this.wakeTrail.length; i++) {
      let wake = this.wakeTrail[i];
      let alpha = wake.life * 100;
      let size = wake.life * 8;
      
      fill(255, 255, 255, alpha);
      noStroke();
      ellipse(wake.x, wake.y, size, size);
    }
  }
  
  checkCollisions() {
    // Check collision with islands
    for (let island of islands) {
      let distance = dist(this.x, this.y, island.x, island.y);
      if (distance < (island.size / 2) + (this.size / 2)) {
        // Push boat away from island
        let pushAngle = atan2(this.y - island.y, this.x - island.x);
        this.x = island.x + cos(pushAngle) * ((island.size / 2) + (this.size / 2) + 2);
        this.y = island.y + sin(pushAngle) * ((island.size / 2) + (this.size / 2) + 2);
        this.speed *= 0.5; // Reduce speed on collision
      }
    }
    
    // Check collision with rocks
    for (let rock of rocks) {
      let distance = dist(this.x, this.y, rock.x, rock.y);
      if (distance < (rock.size / 2) + (this.size / 2)) {
        // Push boat away from rock
        let pushAngle = atan2(this.y - rock.y, this.x - rock.x);
        this.x = rock.x + cos(pushAngle) * ((rock.size / 2) + (this.size / 2) + 2);
        this.y = rock.y + sin(pushAngle) * ((rock.size / 2) + (this.size / 2) + 2);
        this.speed *= 0.3; // More penalty for hitting rocks
      }
    }
  }
}
