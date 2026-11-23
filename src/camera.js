// camera.js - Smooth Dynamic 2D Camera with Speed Zoom, Look-Ahead & Shake

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 2600;
    this.y = 2600;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.65; // Wide angle at 280+ km/h
    this.maxZoom = 1.15; // Close-up when cruising slowly

    // Look-ahead offset along vehicle velocity
    this.lookAheadX = 0;
    this.lookAheadY = 0;
  }

  resize(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  update(dt, targetCar, particleSystem) {
    // 1. Target zoom based on car speed
    const speedRatio = Math.min(1.0, Math.abs(targetCar.speed) / 750);
    this.targetZoom = this.maxZoom - speedRatio * (this.maxZoom - this.minZoom);
    if (targetCar.isNitroActive) {
      this.targetZoom *= 0.92; // extra FOV kick on nitro!
    }

    // Smooth zoom interpolation
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1.0, dt * 4.0);

    // 2. Look-ahead offset based on velocity vector
    const forwardX = Math.cos(targetCar.angle);
    const forwardY = Math.sin(targetCar.angle);
    const targetLookX = forwardX * (targetCar.speed * 0.28);
    const targetLookY = forwardY * (targetCar.speed * 0.28);

    this.lookAheadX += (targetLookX - this.lookAheadX) * Math.min(1.0, dt * 3.5);
    this.lookAheadY += (targetLookY - this.lookAheadY) * Math.min(1.0, dt * 3.5);

    // 3. Smooth camera position tracking target car
    const targetX = targetCar.x + this.lookAheadX;
    const targetY = targetCar.y + this.lookAheadY;

    this.x += (targetX - this.x) * Math.min(1.0, dt * 7.0);
    this.y += (targetY - this.y) * Math.min(1.0, dt * 7.0);

    // Add screen shake offset if active
    if (particleSystem) {
      this.x += particleSystem.shakeOffsetX;
      this.y += particleSystem.shakeOffsetY;
    }
  }

  isInView(worldX, worldY, margin = 50) {
    const halfW = (this.viewportWidth / 2) / this.zoom + margin;
    const halfH = (this.viewportHeight / 2) / this.zoom + margin;
    return (
      worldX >= this.x - halfW &&
      worldX <= this.x + halfW &&
      worldY >= this.y - halfH &&
      worldY <= this.y + halfH
    );
  }

  applyTransform(ctx) {
    ctx.save();
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
