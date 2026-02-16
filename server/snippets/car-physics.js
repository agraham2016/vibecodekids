/**
 * Car Physics Snippet
 * Steering, acceleration, drift, top-down and 3D driving mechanics.
 * Used for racing games, street racing, driving sims.
 */

export const CAR_PHYSICS_SNIPPET = `
// ===== CAR PHYSICS (for racing / driving games) =====

// --- Top-Down Car (bird's-eye view) ---
// Car has position (x, y), angle, speed
// ArrowUp = accelerate, ArrowDown = brake/reverse, Left/Right = steer
function updateTopDownCar(car, keys, dt) {
  const ACCEL = 300;
  const BRAKE = 400;
  const MAX_SPEED = 500;
  const STEER_SPEED = 3.0;   // radians/sec
  const DRAG = 0.98;

  if (keys.ArrowUp) car.speed = Math.min(car.speed + ACCEL * dt, MAX_SPEED);
  else if (keys.ArrowDown) car.speed = Math.max(car.speed - BRAKE * dt, -MAX_SPEED * 0.3);
  else car.speed *= DRAG;

  // Steering only works when moving
  if (Math.abs(car.speed) > 10) {
    if (keys.ArrowLeft) car.angle -= STEER_SPEED * dt * (car.speed > 0 ? 1 : -1);
    if (keys.ArrowRight) car.angle += STEER_SPEED * dt * (car.speed > 0 ? 1 : -1);
  }

  car.x += Math.sin(car.angle) * car.speed * dt;
  car.y -= Math.cos(car.angle) * car.speed * dt;
}

// Draw top-down car on canvas
function drawTopDownCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = car.color || '#ff4444';
  ctx.fillRect(-15, -25, 30, 50);  // Car body
  ctx.fillStyle = '#222';
  ctx.fillRect(-12, -28, 8, 10);   // Left headlight
  ctx.fillRect(4, -28, 8, 10);     // Right headlight
  ctx.fillStyle = '#ff8800';
  ctx.fillRect(-12, 18, 8, 8);     // Left taillight
  ctx.fillRect(4, 18, 8, 8);       // Right taillight
  ctx.restore();
}

// --- 3D Racing (Three.js, endless road style) ---
// Car stays at fixed Z, world scrolls toward camera.
// See THREE_D_RACING_RULES for full pattern.
//
// Key variables:
//   var speed = 0, maxSpeed = 80, accel = 40, brakeForce = 60;
//   var steerSpeed = 50, carX = 0, roadWidth = 10;
//
// In game loop:
//   if (keys.ArrowUp) speed = Math.min(speed + accel * dt, maxSpeed);
//   if (keys.ArrowDown) speed = Math.max(speed - brakeForce * dt, 0);
//   if (!keys.ArrowUp && !keys.ArrowDown) speed *= 0.97; // coast
//   if (keys.ArrowLeft) carX = Math.max(carX - steerSpeed * dt, -roadWidth);
//   if (keys.ArrowRight) carX = Math.min(carX + steerSpeed * dt, roadWidth);
//   car.position.x = carX;
//
// Scenery scrolling:
//   for (var obj of scenery) {
//     obj.position.z += speed * dt;
//     if (obj.position.z > 20) obj.position.z -= totalRoadLength;
//   }

// --- Drift Mechanic (optional fun addition) ---
// When turning at high speed, add sideways slide:
//   var driftFactor = (Math.abs(car.speed) > MAX_SPEED * 0.7 && (keys.ArrowLeft || keys.ArrowRight)) ? 0.3 : 0;
//   car.x += Math.cos(car.angle) * car.speed * driftFactor * dt;
//   // Draw skid marks: small grey circles at rear wheel positions

// --- Garage / Car Selection Pattern ---
// Show a grid of car options. Each car has: name, color, stats (speed, handling, accel).
// On click/select, store the choice and use it in the race.
//   var cars = [
//     { name: 'Street Racer', color: '#ff4444', maxSpeed: 500, handling: 0.8, accel: 300 },
//     { name: 'Muscle Car', color: '#4488ff', maxSpeed: 600, handling: 0.5, accel: 250 },
//     { name: 'Drift King', color: '#44ff88', maxSpeed: 450, handling: 1.0, accel: 280 },
//   ];
`;
