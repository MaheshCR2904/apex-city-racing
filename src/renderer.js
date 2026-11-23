// renderer.js - High-Performance City World & Environment Vector Canvas Renderer

export class WorldRenderer {
  constructor(city) {
    this.city = city;
    this.waterTime = 0;
  }

  render(ctx, camera) {
    this.waterTime += 0.02;

    // 1. Draw base terrain (grass / ground / sand)
    this.drawTerrain(ctx, camera);

    // 2. Draw water bodies (ocean, lakes, marina)
    this.drawWater(ctx, camera);

    // 3. Draw road asphalt, sidewalks, and lane markings
    this.drawRoads(ctx, camera);

    // 4. Draw intersections & crosswalks
    this.drawIntersections(ctx, camera);

    // 5. Draw stunt ramps & speed cameras
    this.drawRampsAndTraps(ctx, camera);

    // 6. Draw street props (light poles, cones, hydrants)
    this.drawProps(ctx, camera);

    // 7. Draw collectibles (cash & nitro canisters)
    this.drawCollectibles(ctx, camera);
  }

  // Draw buildings & trees above vehicles (or trees above, buildings with roofs)
  renderBuildingsAndTrees(ctx, camera) {
    // 1. Draw trees
    for (const t of this.city.trees) {
      if (!camera.isInView(t.x, t.y, t.radius * 2)) continue;

      // Soft ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.arc(t.x + 4, t.y + 6, t.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer foliage
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlighted canopy
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(t.x - t.radius * 0.2, t.y - t.radius * 0.2, t.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw buildings
    for (const b of this.city.buildings) {
      if (!camera.isInView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) + 60)) continue;

      if (b.isCircular) {
        this.drawCylindricalTank(ctx, b);
      } else if (b.type === 'skyscraper') {
        this.drawSkyscraper(ctx, b);
      } else if (b.type === 'neon') {
        this.drawNeonBuilding(ctx, b);
      } else if (b.type === 'house') {
        this.drawHouse(ctx, b);
      } else if (b.type === 'container') {
        this.drawContainer(ctx, b);
      } else {
        this.drawGenericBuilding(ctx, b);
      }
    }
  }

  drawTerrain(ctx, camera) {
    // Base grass green / dark urban landscape
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(camera.x - camera.viewportWidth, camera.y - camera.viewportHeight, camera.viewportWidth * 2, camera.viewportHeight * 2);

    // Park green turf
    const parkX = 800, parkY = 800, parkW = 1600, parkH = 1600;
    if (camera.isInView(parkX + parkW / 2, parkY + parkH / 2, 1200)) {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(parkX, parkY, parkW, parkH);
    }

    // Industrial harbor concrete
    const indX = 400, indY = 3800, indW = 2200, indH = 2200;
    if (camera.isInView(indX + indW / 2, indY + indH / 2, 1500)) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(indX, indY, indW, indH);
    }
  }

  drawWater(ctx, camera) {
    for (const wb of this.city.waterBodies) {
      if (!camera.isInView(wb.x + wb.w / 2, wb.y + wb.h / 2, Math.max(wb.w, wb.h))) continue;

      ctx.save();
      // Deep blue water
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(wb.x, wb.y, wb.w, wb.h);

      // Shoreline sand/curb
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

      // Subtle water waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let wy = wb.y + 40; wy < wb.y + wb.h; wy += 60) {
        ctx.beginPath();
        const offset = Math.sin(this.waterTime + wy * 0.05) * 8;
        ctx.moveTo(wb.x + 20, wy + offset);
        ctx.lineTo(wb.x + wb.w - 20, wy + offset);
        ctx.stroke();
      }

      // Island in Central Park Lake
      if (wb.island) {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(wb.island.x, wb.island.y, wb.island.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawRoads(ctx, camera) {
    for (const r of this.city.roads) {
      if (!camera.isInView((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, Math.max(r.width, 1000))) continue;

      const isH = r.isHorizontal;
      const minX = Math.min(r.x1, r.x2);
      const maxX = Math.max(r.x1, r.x2);
      const minY = Math.min(r.y1, r.y2);
      const maxY = Math.max(r.y1, r.y2);

      // 1. Sidewalk borders (concrete curbs)
      ctx.fillStyle = '#64748b';
      if (isH) {
        ctx.fillRect(minX, r.y1 - r.width / 2 - 12, maxX - minX, r.width + 24);
      } else {
        ctx.fillRect(r.x1 - r.width / 2 - 12, minY, r.width + 24, maxY - minY);
      }

      // 2. Asphalt Road Surface
      ctx.fillStyle = r.type === 'highway' ? '#181b24' : '#222834';
      if (isH) {
        ctx.fillRect(minX, r.y1 - r.width / 2, maxX - minX, r.width);
      } else {
        ctx.fillRect(r.x1 - r.width / 2, minY, r.width, maxY - minY);
      }

      // 3. Lane Markings
      ctx.save();
      if (r.lanes >= 4) {
        // Double Yellow Centerline
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        if (isH) {
          ctx.beginPath();
          ctx.moveTo(minX, r.y1 - 3);
          ctx.lineTo(maxX, r.y1 - 3);
          ctx.moveTo(minX, r.y1 + 3);
          ctx.lineTo(maxX, r.y1 + 3);
          ctx.stroke();

          // Dashed white dividers for multi-lanes
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 25]);
          ctx.beginPath();
          ctx.moveTo(minX, r.y1 - r.width * 0.25);
          ctx.lineTo(maxX, r.y1 - r.width * 0.25);
          ctx.moveTo(minX, r.y1 + r.width * 0.25);
          ctx.lineTo(maxX, r.y1 + r.width * 0.25);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(r.x1 - 3, minY);
          ctx.lineTo(r.x1 - 3, maxY);
          ctx.moveTo(r.x1 + 3, minY);
          ctx.lineTo(r.x1 + 3, maxY);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 25]);
          ctx.beginPath();
          ctx.moveTo(r.x1 - r.width * 0.25, minY);
          ctx.lineTo(r.x1 - r.width * 0.25, maxY);
          ctx.moveTo(r.x1 + r.width * 0.25, minY);
          ctx.lineTo(r.x1 + r.width * 0.25, maxY);
          ctx.stroke();
        }
      } else {
        // Single dashed yellow divider
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([18, 22]);
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(minX, r.y1);
          ctx.lineTo(maxX, r.y1);
        } else {
          ctx.moveTo(r.x1, minY);
          ctx.lineTo(r.x1, maxY);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawIntersections(ctx, camera) {
    for (const inter of this.city.intersections) {
      if (!camera.isInView(inter.x, inter.y, inter.size + 40)) continue;

      // Asphalt junction box
      ctx.fillStyle = '#1e2430';
      ctx.fillRect(inter.x - inter.size / 2, inter.y - inter.size / 2, inter.size, inter.size);

      // Zebra Crosswalks
      this.drawCrosswalk(ctx, inter.x, inter.y - inter.size / 2 - 12, inter.size, 16, true);
      this.drawCrosswalk(ctx, inter.x, inter.y + inter.size / 2 + 12, inter.size, 16, true);
      this.drawCrosswalk(ctx, inter.x - inter.size / 2 - 12, inter.y, 16, inter.size, false);
      this.drawCrosswalk(ctx, inter.x + inter.size / 2 + 12, inter.y, 16, inter.size, false);

      // Traffic Light Signals (Red / Green)
      if (inter.hasLights) {
        this.drawTrafficLightPost(ctx, inter.x - inter.size / 2, inter.y - inter.size / 2, inter.lightState === 'GREEN_V');
        this.drawTrafficLightPost(ctx, inter.x + inter.size / 2, inter.y + inter.size / 2, inter.lightState === 'GREEN_H');
      }
    }
  }

  drawCrosswalk(ctx, x, y, w, h, isH) {
    ctx.fillStyle = '#ffffff';
    if (isH) {
      const stripes = Math.floor(w / 14);
      for (let s = 0; s < stripes; s++) {
        ctx.fillRect(x - w / 2 + s * 14 + 2, y - h / 2, 8, h);
      }
    } else {
      const stripes = Math.floor(h / 14);
      for (let s = 0; s < stripes; s++) {
        ctx.fillRect(x - w / 2, y - h / 2 + s * 14 + 2, w, 8);
      }
    }
  }

  drawTrafficLightPost(ctx, x, y, isGreen) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 5, y - 5, 10, 10);
    // Green or Red light beacon
    ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawRampsAndTraps(ctx, camera) {
    // 1. Stunt Ramps
    for (const ramp of this.city.stuntRamps) {
      if (!camera.isInView(ramp.x, ramp.y, 60)) continue;

      ctx.save();
      ctx.translate(ramp.x, ramp.y);
      ctx.rotate(ramp.angle);

      // Ramp base
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-ramp.width / 2, -ramp.length / 2, ramp.width, ramp.length);

      // Black hazard chevron arrows
      ctx.fillStyle = '#0f172a';
      for (let a = -ramp.length / 2 + 10; a < ramp.length / 2; a += 16) {
        ctx.beginPath();
        ctx.moveTo(-ramp.width * 0.35, a + 8);
        ctx.lineTo(0, a);
        ctx.lineTo(ramp.width * 0.35, a + 8);
        ctx.lineTo(0, a + 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Speed Traps
    for (const trap of this.city.speedTraps) {
      if (!camera.isInView(trap.x, trap.y, 80)) continue;

      ctx.save();
      ctx.translate(trap.x, trap.y);

      // Speed camera housing
      ctx.fillStyle = '#475569';
      ctx.fillRect(-10, -10, 20, 20);

      // Sensor lens
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Road speed label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${trap.targetSpeed}k`, 0, -14);

      ctx.restore();
    }
  }

  drawProps(ctx, camera) {
    // Streetlights
    for (const p of this.city.props) {
      if (!camera.isInView(p.x, p.y, 30)) continue;

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Bulb
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dynamic props (traffic cones, fire hydrants)
    for (const dp of this.city.dynamicProps) {
      if (!camera.isInView(dp.x, dp.y, 30)) continue;

      if (dp.type === 'cone') {
        ctx.fillStyle = '#ea580c'; // bright orange
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (dp.type === 'hydrant') {
        ctx.fillStyle = '#dc2626'; // fire hydrant red
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(dp.x - 4, dp.y - 4, 8, 8);
      }
    }
  }

  drawCollectibles(ctx, camera) {
    for (const c of this.city.collectibles) {
      if (c.collected || !camera.isInView(c.x, c.y, 40)) continue;

      const bobY = Math.sin(c.bobTimer) * 4;
      ctx.save();
      ctx.translate(c.x, c.y + bobY);

      if (c.type === 'cash') {
        // Floating Cash Briefcase / Bundle
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.fillRect(-12, -8, 24, 16);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      } else if (c.type === 'nitro') {
        // Cyan Nitro NOS Cylinder
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(-8, -14, 16, 28, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NOS', 0, 3);
      }

      ctx.restore();
    }
  }

  drawSkyscraper(ctx, b) {
    // 2.5D Roof drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b.x + 12, b.y + 12, b.w, b.h);

    // Tower base
    ctx.fillStyle = b.mainColor;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Glass curtain wall grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = b.x + 20; gx < b.x + b.w; gx += 25) {
      ctx.beginPath();
      ctx.moveTo(gx, b.y);
      ctx.lineTo(gx, b.y + b.h);
      ctx.stroke();
    }

    // Parapet roof rim
    ctx.strokeStyle = b.accentColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);

    // Helipad
    if (b.hasHelipad) {
      const hx = b.x + b.w / 2;
      const hy = b.y + b.h / 2;
      const r = Math.min(b.w, b.h) * 0.32;

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(r)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', hx, hy);
    } else if (b.hasGlassPool) {
      // Rooftop infinity pool
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(b.x + 15, b.y + 15, b.w - 30, b.h - 30);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 15, b.y + 15, b.w - 30, b.h - 30);
    } else {
      // HVAC units
      ctx.fillStyle = '#475569';
      for (let k = 0; k < b.rooftopUnits; k++) {
        ctx.fillRect(b.x + 20 + k * 35, b.y + 20, 24, 20);
      }
    }

    // Antenna with blinking red aircraft warning light
    if (b.antenna) {
      const ax = b.x + 15;
      const ay = b.y + 15;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(ax - 2, ay - 2, 4, 4);

      const blink = Math.floor(Date.now() * 0.003) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ax, ay, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawNeonBuilding(ctx, b) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);

    ctx.fillStyle = b.mainColor;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Neon edge border
    ctx.strokeStyle = b.accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Large glowing marquee / billboard sign
    if (b.title) {
      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(b.x + 10, b.y + b.h / 2 - 14, b.w - 20, 28);

      ctx.fillStyle = b.accentColor;
      ctx.font = 'bold 13px "Segoe UI", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.title, b.x + b.w / 2, b.y + b.h / 2);
      ctx.restore();
    }
  }

  drawHouse(ctx, b) {
    // Green lawn around house
    ctx.fillStyle = '#15803d';
    ctx.fillRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);

    // House shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w, b.h);

    // Pitched Roof
    ctx.fillStyle = b.accentColor;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Roof ridge line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.h / 2);
    ctx.lineTo(b.x + b.w, b.y + b.h / 2);
    ctx.stroke();

    // Backyard swimming pool
    if (b.hasPool) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(b.x + b.w - 28, b.y + b.h - 22, 22, 16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x + b.w - 28, b.y + b.h - 22, 22, 16);
    }
  }

  drawContainer(ctx, b) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);

    ctx.fillStyle = b.mainColor;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Corrugated lines on container
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    for (let cx = b.x + 8; cx < b.x + b.w; cx += 10) {
      ctx.beginPath();
      ctx.moveTo(cx, b.y);
      ctx.lineTo(cx, b.y + b.h);
      ctx.stroke();
    }
  }

  drawCylindricalTank(ctx, b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = b.radius || b.w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 8, r, 0, Math.PI * 2);
    ctx.fill();

    // Silo top
    ctx.fillStyle = b.mainColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Catwalk walkway
    ctx.strokeStyle = b.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawGenericBuilding(ctx, b) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w, b.h);

    ctx.fillStyle = b.mainColor;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.strokeStyle = b.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
}
