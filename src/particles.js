// particles.js - Particle Systems: Tire Smoke, Skidmarks, Nitro Flame, Sparks, Water Spouts & Floating Text

export class ParticleSystem {
  constructor(worldWidth, worldHeight) {
    this.particles = [];
    this.floatingTexts = [];
    this.skidmarks = []; // line segments with alpha
    this.maxSkidmarks = 1500;

    // Screen shake state
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  triggerScreenShake(duration = 0.3, magnitude = 6) {
    this.shakeDuration = duration;
    this.shakeMagnitude = magnitude;
  }

  addSkidmark(x, y, angle, alpha = 0.5) {
    this.skidmarks.push({
      x, y,
      angle,
      alpha,
      life: 1.0 // Fades slowly over time
    });

    if (this.skidmarks.length > this.maxSkidmarks) {
      this.skidmarks.shift();
    }
  }

  createTireSmoke(x, y) {
    this.particles.push({
      type: 'smoke',
      x: x + (Math.random() * 6 - 3),
      y: y + (Math.random() * 6 - 3),
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      size: 4 + Math.random() * 6,
      maxSize: 18 + Math.random() * 10,
      alpha: 0.55,
      life: 0.7 + Math.random() * 0.4,
      maxLife: 0.7 + Math.random() * 0.4,
      color: 'rgba(200, 210, 220, '
    });
  }

  createNitroFlame(x, y, carAngle) {
    const spread = (Math.random() - 0.5) * 0.35;
    const speed = 120 + Math.random() * 80;
    const flameAngle = carAngle + Math.PI + spread;

    // Core cyan/blue flame
    this.particles.push({
      type: 'nitro_core',
      x, y,
      vx: Math.cos(flameAngle) * speed,
      vy: Math.sin(flameAngle) * speed,
      size: 3 + Math.random() * 3,
      alpha: 0.9,
      life: 0.22,
      maxLife: 0.22,
      color: '#00f0ff'
    });

    // Outer orange/purple flare
    this.particles.push({
      type: 'nitro_flare',
      x, y,
      vx: Math.cos(flameAngle) * (speed * 0.75),
      vy: Math.sin(flameAngle) * (speed * 0.75),
      size: 6 + Math.random() * 4,
      alpha: 0.7,
      life: 0.3,
      maxLife: 0.3,
      color: '#ff007f'
    });
  }

  createSparks(x, y, nx, ny, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.5;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1.0,
        life: 0.3 + Math.random() * 0.25,
        maxLife: 0.3 + Math.random() * 0.25,
        color: Math.random() > 0.4 ? '#facc15' : '#fb923c'
      });
    }
  }

  createWaterSpout(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        type: 'water',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        alpha: 0.75,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 0.8 + Math.random() * 0.5,
        color: '#38bdf8'
      });
    }
  }

  createLandingDust(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        type: 'smoke',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6,
        maxSize: 22,
        alpha: 0.5,
        life: 0.6,
        maxLife: 0.6,
        color: 'rgba(180, 180, 190, '
      });
    }
  }

  createCollectSparks(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5,
        alpha: 1.0,
        life: 0.45,
        maxLife: 0.45,
        color: color
      });
    }
  }

  createConfetti(x, y) {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push({
        type: 'confetti',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        alpha: 1.0,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  createFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({
      x, y,
      text,
      color,
      vy: -40,
      alpha: 1.0,
      life: 1.4,
      maxLife: 1.4
    });
  }

  update(dt) {
    // 1. Screen shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const factor = this.shakeDuration;
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeMagnitude * factor * 10;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeMagnitude * factor * 10;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 2. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'smoke') {
        p.vx *= 0.94;
        p.vy *= 0.94;
        const progress = 1.0 - p.life / p.maxLife;
        p.currentSize = p.size + (p.maxSize - p.size) * progress;
        p.alpha = 0.55 * (p.life / p.maxLife);
      } else if (p.type === 'spark' || p.type === 'confetti') {
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha = p.life / p.maxLife;
      } else if (p.type === 'water') {
        p.vx *= 0.95;
        p.vy += 80 * dt; // gravity
        p.alpha = p.life / p.maxLife;
      }
    }

    // 3. Update floating arcade texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.alpha = ft.life / ft.maxLife;
    }

    // 4. Skidmarks slow aging
    for (let i = this.skidmarks.length - 1; i >= 0; i--) {
      const sm = this.skidmarks[i];
      sm.life -= dt * 0.015; // stays for over a minute
      if (sm.life <= 0) {
        this.skidmarks.splice(i, 1);
      }
    }
  }

  // Draw skidmarks on the road layer (before cars)
  drawSkidmarks(ctx, camera) {
    ctx.save();
    for (const sm of this.skidmarks) {
      if (!camera.isInView(sm.x, sm.y, 40)) continue;
      ctx.save();
      ctx.translate(sm.x, sm.y);
      ctx.rotate(sm.angle);
      ctx.fillStyle = `rgba(15, 15, 20, ${sm.alpha * sm.life})`;
      ctx.fillRect(-6, -2.5, 12, 5);
      ctx.restore();
    }
    ctx.restore();
  }

  // Draw dynamic particles (above cars)
  drawParticles(ctx, camera) {
    ctx.save();
    for (const p of this.particles) {
      if (!camera.isInView(p.x, p.y, 50)) continue;

      if (p.type === 'smoke') {
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentSize || p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'nitro_core' || p.type === 'nitro_flare') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'water') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw floating texts
    ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      if (!camera.isInView(ft.x, ft.y, 60)) continue;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
