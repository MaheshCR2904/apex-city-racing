// lighting.js - Day/Night Cycle, Dynamic Headlight Beams, Streetlights & Neon Glow

export class LightingManager {
  constructor() {
    this.timeOfDay = 0.85; // 0.0 = Noon, 0.25 = Sunset, 0.5 = Dusk, 0.85 = Night (start at vibrant Cyber Night!)
    this.timeSpeed = 0.008; // smooth slow cycle
    this.manualOverride = false;

    // Light map offscreen canvas
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
  }

  resize(width, height) {
    this.lightCanvas.width = width;
    this.lightCanvas.height = height;
  }

  toggleDayNight() {
    this.manualOverride = true;
    // Toggle between Noon (0.0) and Night (0.85)
    this.timeOfDay = this.timeOfDay > 0.4 ? 0.0 : 0.85;
  }

  update(dt) {
    if (!this.manualOverride) {
      this.timeOfDay = (this.timeOfDay + this.timeSpeed * dt) % 1.0;
    }
  }

  getAmbientDarkness() {
    // 0.0 (Noon: full bright), 0.25 (Sunset: orange tint), 0.5-0.95 (Night: dark with glowing city lights)
    let darkness = 0;
    let r = 5, g = 8, b = 25;

    if (this.timeOfDay < 0.2) {
      // Day
      darkness = 0.0;
    } else if (this.timeOfDay < 0.35) {
      // Sunset
      const t = (this.timeOfDay - 0.2) / 0.15;
      darkness = t * 0.45;
      r = 40; g = 18; b = 30; // warm dusk
    } else if (this.timeOfDay < 0.85) {
      // Deep Night
      darkness = 0.86;
      r = 4; g = 6; b = 18; // deep blue-black
    } else {
      // Sunrise
      const t = (this.timeOfDay - 0.85) / 0.15;
      darkness = 0.86 * (1.0 - t);
      r = 25; g = 15; b = 25;
    }

    return { darkness, r, g, b };
  }

  renderLighting(mainCtx, camera, player, city, trafficManager) {
    const w = this.lightCanvas.width;
    const h = this.lightCanvas.height;
    if (w === 0 || h === 0) return;

    const { darkness, r, g, b } = this.getAmbientDarkness();
    if (darkness <= 0.02) return; // Full daylight, no dark overlay needed

    const lCtx = this.lightCtx;

    // 1. Fill light canvas with dark ambient veil
    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${darkness})`;
    lCtx.fillRect(0, 0, w, h);

    // 2. Punch out light holes using 'destination-out'
    lCtx.globalCompositeOperation = 'destination-out';

    // A. Player headlights beam cone
    if (player.headlights) {
      const pScreenX = (player.x - camera.x) * camera.zoom + w / 2;
      const pScreenY = (player.y - camera.y) * camera.zoom + h / 2;
      const beamLength = 260 * camera.zoom;
      const beamWidth = 140 * camera.zoom;

      lCtx.save();
      lCtx.translate(pScreenX, pScreenY);
      lCtx.rotate(player.angle);

      // Radial cone gradient
      const coneGrad = lCtx.createRadialGradient(0, 0, 15 * camera.zoom, beamLength * 0.7, 0, beamLength);
      coneGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      coneGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.75)');
      coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lCtx.fillStyle = coneGrad;
      lCtx.beginPath();
      lCtx.moveTo(15 * camera.zoom, -10 * camera.zoom);
      lCtx.lineTo(beamLength, -beamWidth / 2);
      lCtx.lineTo(beamLength, beamWidth / 2);
      lCtx.lineTo(15 * camera.zoom, 10 * camera.zoom);
      lCtx.closePath();
      lCtx.fill();

      // Soft ambient circle right around the car
      const ambientCarGrad = lCtx.createRadialGradient(0, 0, 10, 0, 0, 75 * camera.zoom);
      ambientCarGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      ambientCarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = ambientCarGrad;
      lCtx.beginPath();
      lCtx.arc(0, 0, 75 * camera.zoom, 0, Math.PI * 2);
      lCtx.fill();

      lCtx.restore();
    }

    // B. Streetlights in camera view
    for (const prop of city.props) {
      if (prop.type === 'streetlight') {
        if (!camera.isInView(prop.x, prop.y, 160)) continue;
        const sx = (prop.x - camera.x) * camera.zoom + w / 2;
        const sy = (prop.y - camera.y) * camera.zoom + h / 2;
        const radius = (prop.lightRadius || 160) * camera.zoom;

        const streetGrad = lCtx.createRadialGradient(sx, sy, 8 * camera.zoom, sx, sy, radius);
        streetGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        streetGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        streetGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        lCtx.fillStyle = streetGrad;
        lCtx.beginPath();
        lCtx.arc(sx, sy, radius, 0, Math.PI * 2);
        lCtx.fill();
      }
    }

    // C. Traffic cars headlights
    for (const v of trafficManager.vehicles) {
      if (!camera.isInView(v.x, v.y, 120)) continue;
      const sx = (v.x - camera.x) * camera.zoom + w / 2;
      const sy = (v.y - camera.y) * camera.zoom + h / 2;
      const bLen = 140 * camera.zoom;

      lCtx.save();
      lCtx.translate(sx, sy);
      lCtx.rotate(v.angle);
      const vGrad = lCtx.createRadialGradient(0, 0, 10, bLen * 0.7, 0, bLen);
      vGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
      vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = vGrad;
      lCtx.beginPath();
      lCtx.moveTo(10, -8);
      lCtx.lineTo(bLen, -45 * camera.zoom);
      lCtx.lineTo(bLen, 45 * camera.zoom);
      lCtx.lineTo(10, 8);
      lCtx.closePath();
      lCtx.fill();
      lCtx.restore();
    }

    // D. Police flashing light glows
    for (const cop of trafficManager.policeUnits) {
      if (!camera.isInView(cop.x, cop.y, 160)) continue;
      const sx = (cop.x - camera.x) * camera.zoom + w / 2;
      const sy = (cop.y - camera.y) * camera.zoom + h / 2;
      const rad = 130 * camera.zoom;

      const copGrad = lCtx.createRadialGradient(sx, sy, 10, sx, sy, rad);
      copGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      copGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = copGrad;
      lCtx.beginPath();
      lCtx.arc(sx, sy, rad, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 3. Draw light canvas onto main canvas
    mainCtx.save();
    mainCtx.drawImage(this.lightCanvas, 0, 0);
    mainCtx.restore();

    // 4. Additive Bloom pass for neon signs, headlights, and street bulbs
    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';

    // Neon signs in Neon District
    for (const b of city.buildings) {
      if (b.neonColor && camera.isInView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) {
        const sx = (b.x + b.w / 2 - camera.x) * camera.zoom + w / 2;
        const sy = (b.y + b.h / 2 - camera.y) * camera.zoom + h / 2;
        const rad = Math.max(b.w, b.h) * 0.75 * camera.zoom;

        const neonGrad = mainCtx.createRadialGradient(sx, sy, 10, sx, sy, rad);
        neonGrad.addColorStop(0, b.neonColor);
        neonGrad.addColorStop(1, 'rgba(0,0,0,0)');
        mainCtx.fillStyle = neonGrad;
        mainCtx.globalAlpha = 0.28;
        mainCtx.beginPath();
        mainCtx.arc(sx, sy, rad, 0, Math.PI * 2);
        mainCtx.fill();
      }
    }

    mainCtx.restore();
  }
}
