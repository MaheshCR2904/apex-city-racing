// traffic.js - Ambient City Traffic, Police Pursuit AI, and Street Racing AI Rivals

export class TrafficManager {
  constructor(city) {
    this.city = city;
    this.vehicles = [];
    this.maxTraffic = 32;

    this.policeUnits = [];
    this.maxPolice = 3;

    this.aiRacers = [];

    // Vehicle presets
    this.civilianTypes = [
      { name: 'Sedan', w: 22, l: 44, speed: 120, colors: ['#64748b', '#0284c7', '#475569', '#334155', '#cbd5e1'] },
      { name: 'Taxi', w: 22, l: 44, speed: 130, colors: ['#facc15'], isTaxi: true },
      { name: 'Van', w: 25, l: 52, speed: 100, colors: ['#f8fafc', '#94a3b8'] },
      { name: 'Bus', w: 28, l: 72, speed: 85, colors: ['#0284c7', '#ea580c'], isBus: true },
      { name: 'Coupe', w: 22, l: 42, speed: 145, colors: ['#e11d48', '#8b5cf6', '#10b981'] }
    ];

    this.spawnTimer = 0;
  }

  update(dt, player, wantedLevel, particleSystem, audioSystem) {
    this.spawnTimer += dt;

    // 1. Manage ambient traffic density around player
    if (this.spawnTimer > 0.6) {
      this.spawnTimer = 0;
      this.maintainTrafficAroundPlayer(player);
    }

    // 2. Manage Police Pursuit
    this.managePolicePursuit(dt, player, wantedLevel, particleSystem, audioSystem);

    // 3. Update civilian traffic
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const dist = Math.hypot(v.x - player.x, v.y - player.y);

      // Despawn if far from player
      if (dist > 2400) {
        this.vehicles.splice(i, 1);
        continue;
      }

      this.updateCivilianCar(v, dt, player, particleSystem, audioSystem);
    }

    // 4. Update AI Racers (when race mode is active)
    for (const racer of this.aiRacers) {
      this.updateAIRacer(racer, dt, player, particleSystem, audioSystem);
    }
  }

  maintainTrafficAroundPlayer(player) {
    if (this.vehicles.length >= this.maxTraffic) return;

    // Pick random road within 500 - 1800px of player
    const candidateRoads = this.city.roads.filter(r => {
      const midX = (r.x1 + r.x2) / 2;
      const midY = (r.y1 + r.y2) / 2;
      const d = Math.hypot(midX - player.x, midY - player.y);
      return d > 500 && d < 1800;
    });

    if (candidateRoads.length === 0) return;

    const road = candidateRoads[Math.floor(Math.random() * candidateRoads.length)];
    const typePreset = this.civilianTypes[Math.floor(Math.random() * this.civilianTypes.length)];
    const color = typePreset.colors[Math.floor(Math.random() * typePreset.colors.length)];

    // Direction along road
    const forward = Math.random() > 0.5;
    const isH = road.isHorizontal;

    // Lane offset (drive on right side)
    const laneOffset = forward ? road.width * 0.25 : -road.width * 0.25;

    let x, y, angle;
    if (isH) {
      const minX = Math.min(road.x1, road.x2) + 60;
      const maxX = Math.max(road.x1, road.x2) - 60;
      x = minX + Math.random() * (maxX - minX);
      y = road.y1 + (forward ? laneOffset : -laneOffset);
      angle = forward ? 0 : Math.PI;
    } else {
      const minY = Math.min(road.y1, road.y2) + 60;
      const maxY = Math.max(road.y1, road.y2) - 60;
      y = minY + Math.random() * (maxY - minY);
      x = road.x1 + (forward ? -laneOffset : laneOffset);
      angle = forward ? Math.PI / 2 : -Math.PI / 2;
    }

    // Check no overlap with existing cars
    for (const other of this.vehicles) {
      if (Math.hypot(other.x - x, other.y - y) < 70) return;
    }

    this.vehicles.push({
      x, y,
      angle,
      targetSpeed: typePreset.speed * (0.85 + Math.random() * 0.3),
      speed: typePreset.speed * 0.8,
      width: typePreset.w,
      length: typePreset.l,
      color,
      isTaxi: typePreset.isTaxi,
      isBus: typePreset.isBus,
      road,
      braking: false,
      hornTimer: 0,
      turnTimer: 0
    });
  }

  updateCivilianCar(v, dt, player, particleSystem, audioSystem) {
    let desiredSpeed = v.targetSpeed;
    v.braking = false;

    // Check for vehicle or player ahead (raycast collision avoidance)
    const forwardX = Math.cos(v.angle);
    const forwardY = Math.sin(v.angle);

    // Distance to player
    const toPlayerX = player.x - v.x;
    const toPlayerY = player.y - v.y;
    const dotPlayer = toPlayerX * forwardX + toPlayerY * forwardY;
    const crossPlayer = Math.abs(toPlayerX * (-forwardY) + toPlayerY * forwardX);

    if (dotPlayer > 0 && dotPlayer < 120 && crossPlayer < 28) {
      // Player is directly in front!
      desiredSpeed = 0;
      v.braking = true;
      if (dotPlayer < 40 && Math.random() < 0.05 && audioSystem) {
        audioSystem.playHorn();
      }
    }

    // Check traffic lights at intersections ahead
    for (const tl of this.city.trafficLights) {
      const distTL = Math.hypot(tl.x - v.x, tl.y - v.y);
      if (distTL < 85) {
        const isH = v.road.isHorizontal;
        const isRed = (isH && tl.lightState === 'GREEN_V') || (!isH && tl.lightState === 'GREEN_H');
        if (isRed) {
          desiredSpeed = 0;
          v.braking = true;
          break;
        }
      }
    }

    // Check other cars ahead
    for (const other of this.vehicles) {
      if (other === v) continue;
      const ox = other.x - v.x;
      const oy = other.y - v.y;
      const dot = ox * forwardX + oy * forwardY;
      const cross = Math.abs(ox * (-forwardY) + oy * forwardX);
      if (dot > 0 && dot < 90 && cross < 22) {
        desiredSpeed = Math.min(desiredSpeed, other.speed * 0.9);
        v.braking = true;
        break;
      }
    }

    // Smooth acceleration / deceleration
    if (v.speed < desiredSpeed) {
      v.speed += 120 * dt;
    } else if (v.speed > desiredSpeed) {
      v.speed = Math.max(desiredSpeed, v.speed - 220 * dt);
    }

    // Move forward
    v.x += forwardX * v.speed * dt;
    v.y += forwardY * v.speed * dt;

    // Turn at road ends or cross intersections
    v.turnTimer += dt;
    if (v.turnTimer > 2.0) {
      // Check if near intersection to make random turn
      for (const inter of this.city.intersections) {
        if (Math.hypot(v.x - inter.x, v.y - inter.y) < 25 && Math.random() < 0.3) {
          v.turnTimer = 0;
          // Switch road
          const nextRoad = v.road.isHorizontal ? inter.vRoad : inter.hRoad;
          v.road = nextRoad;
          const turnRight = Math.random() > 0.5;
          v.angle += turnRight ? Math.PI / 2 : -Math.PI / 2;
          break;
        }
      }
    }

    // Collision with Player
    this.checkCarCollisionWithPlayer(v, player, particleSystem, audioSystem);
  }

  managePolicePursuit(dt, player, wantedLevel, particleSystem, audioSystem) {
    if (wantedLevel <= 0) {
      this.policeUnits = [];
      return;
    }

    const neededPolice = Math.min(this.maxPolice, wantedLevel);
    while (this.policeUnits.length < neededPolice) {
      // Spawn police car behind or ahead on a nearby road
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnDist = 700 + Math.random() * 300;
      const px = player.x + Math.cos(spawnAngle) * spawnDist;
      const py = player.y + Math.sin(spawnAngle) * spawnDist;

      this.policeUnits.push({
        x: px,
        y: py,
        angle: Math.atan2(player.y - py, player.x - px),
        speed: 160,
        maxSpeed: 230 + wantedLevel * 15,
        accel: 280,
        width: 24,
        length: 48,
        sirenTimer: 0,
        health: 100
      });
    }

    // Update police cruisers
    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const cop = this.policeUnits[i];
      cop.sirenTimer += dt * 10;

      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const dist = Math.hypot(dx, dy);

      // Despawn if player outruns them (> 2500px)
      if (dist > 2500) {
        this.policeUnits.splice(i, 1);
        continue;
      }

      // Police chase AI
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - cop.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      cop.angle += Math.sign(angleDiff) * Math.min(3.2 * dt, Math.abs(angleDiff));

      // Accelerate towards player
      if (cop.speed < cop.maxSpeed) {
        cop.speed += cop.accel * dt;
      }

      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;

      // Ramming / collision with player
      this.checkCarCollisionWithPlayer(cop, player, particleSystem, audioSystem, true);
    }
  }

  checkCarCollisionWithPlayer(car, player, particleSystem, audioSystem, isCop = false) {
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const minDist = (player.width + car.width) * 0.75;

    if (dist < minDist && dist > 0.001) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // Push apart
      player.x += nx * overlap * 0.6;
      player.y += ny * overlap * 0.6;
      car.x -= nx * overlap * 0.4;
      car.y -= ny * overlap * 0.4;

      const relSpeed = Math.abs(player.speed - car.speed);
      if (relSpeed > 40) {
        player.speed *= 0.65;
        car.speed *= 0.6;
        player.health = Math.max(0, player.health - relSpeed * 0.035);

        if (audioSystem) audioSystem.playCrash(Math.min(1.0, relSpeed / 250));
        if (particleSystem) {
          particleSystem.createSparks((player.x + car.x) / 2, (player.y + car.y) / 2, nx, ny, 10);
          particleSystem.triggerScreenShake(0.25, 6);
        }
      }
    }
  }

  initRaceCompetitors(trackCheckpoints) {
    this.aiRacers = [];
    const rivals = [
      { name: 'Viper', color: '#ef4444', speedMult: 0.96, accel: 310, maxSpeed: 215 },
      { name: 'Blaze', color: '#f59e0b', speedMult: 0.94, accel: 290, maxSpeed: 210 },
      { name: 'Shadow', color: '#8b5cf6', speedMult: 0.98, accel: 330, maxSpeed: 220 }
    ];

    const startCp = trackCheckpoints[0];
    const nextCp = trackCheckpoints[1];
    const initialAngle = Math.atan2(nextCp.y - startCp.y, nextCp.x - startCp.x);

    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      // Grid starting positions slightly offset
      const perpAngle = initialAngle + Math.PI / 2;
      const offset = (i + 1) * 32 - 48;
      const backOffset = (i + 1) * 26;

      const sx = startCp.x + Math.cos(perpAngle) * offset - Math.cos(initialAngle) * backOffset;
      const sy = startCp.y + Math.sin(perpAngle) * offset - Math.sin(initialAngle) * backOffset;

      this.aiRacers.push({
        id: 'racer_' + i,
        name: r.name,
        x: sx,
        y: sy,
        angle: initialAngle,
        speed: 0,
        maxSpeed: r.maxSpeed * 2.7,
        accel: r.accel,
        color: r.color,
        width: 24,
        length: 48,
        currentCpIndex: 1,
        lap: 1,
        finished: false,
        nitro: 100,
        checkpoints: trackCheckpoints
      });
    }
  }

  updateAIRacer(racer, dt, player, particleSystem, audioSystem) {
    if (racer.finished) return;

    const targetCp = racer.checkpoints[racer.currentCpIndex];
    const dx = targetCp.x - racer.x;
    const dy = targetCp.y - racer.y;
    const distToCp = Math.hypot(dx, dy);

    // Reached checkpoint
    if (distToCp < 90) {
      racer.currentCpIndex++;
      if (racer.currentCpIndex >= racer.checkpoints.length) {
        racer.currentCpIndex = 0;
        racer.lap++;
        if (racer.lap > 3) {
          racer.finished = true;
          return;
        }
      }
    }

    // Steer towards checkpoint
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - racer.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const steerSpeed = 3.8;
    racer.angle += Math.sign(diff) * Math.min(steerSpeed * dt, Math.abs(diff));

    // Cornering slowdown
    let targetSpeed = racer.maxSpeed;
    if (Math.abs(diff) > 0.6) {
      targetSpeed *= 0.65; // brake before sharp corners
    }

    // Accelerate
    if (racer.speed < targetSpeed) {
      racer.speed += racer.accel * dt;
    } else {
      racer.speed = Math.max(targetSpeed, racer.speed - 260 * dt);
    }

    racer.x += Math.cos(racer.angle) * racer.speed * dt;
    racer.y += Math.sin(racer.angle) * racer.speed * dt;

    // Collide with player
    this.checkCarCollisionWithPlayer(racer, player, particleSystem, audioSystem);
  }

  draw(ctx, camera) {
    // 1. Draw civilian traffic
    for (const v of this.vehicles) {
      if (!camera.isInView(v.x, v.y, 80)) continue;
      this.drawVehicleBody(ctx, v);
    }

    // 2. Draw police units
    for (const cop of this.policeUnits) {
      if (!camera.isInView(cop.x, cop.y, 80)) continue;
      this.drawPoliceBody(ctx, cop);
    }

    // 3. Draw AI Racers
    for (const r of this.aiRacers) {
      if (!camera.isInView(r.x, r.y, 80)) continue;
      this.drawRacerBody(ctx, r);
    }
  }

  drawVehicleBody(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-v.length / 2 + 3, -v.width / 2 + 3, v.length, v.width, 4);
    ctx.fill();

    // Body
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 4);
    ctx.fill();

    // Taxi checker / roof sign
    if (v.isTaxi) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(-6, -4, 12, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -2, 8, 4);
    }

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-v.length * 0.1, -v.width * 0.38, v.length * 0.35, v.width * 0.76, 2);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(v.length / 2 - 2, -v.width / 2 + 2, 2, 4);
    ctx.fillRect(v.length / 2 - 2, v.width / 2 - 6, 2, 4);

    // Taillights
    ctx.fillStyle = v.braking ? '#ff0033' : '#b91c1c';
    if (v.braking) {
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(-v.length / 2, -v.width / 2 + 2, 2, 4);
    ctx.fillRect(-v.length / 2, v.width / 2 - 6, 2, 4);

    ctx.restore();
  }

  drawPoliceBody(ctx, cop) {
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.rotate(cop.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-cop.length / 2 + 3, -cop.width / 2 + 3, cop.length, cop.width, 4);
    ctx.fill();

    // Body (Black & White Interceptor)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-cop.length / 2, -cop.width / 2, cop.length, cop.width, 4);
    ctx.fill();

    // White door panel
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-cop.length * 0.2, -cop.width / 2, cop.length * 0.4, cop.width);

    // Windshield
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(-cop.length * 0.1, -cop.width * 0.38, cop.length * 0.35, cop.width * 0.76, 2);
    ctx.fill();

    // Flashing Red & Blue Siren Bar
    const isRed = Math.floor(cop.sirenTimer) % 2 === 0;
    ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fillRect(-3, -cop.width * 0.35, 6, cop.width * 0.7);

    ctx.restore();
  }

  drawRacerBody(ctx, r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);

    // Underglow
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r.length / 2 + 2, -r.width / 2 + 1, r.length - 4, r.width - 2);

    // Body
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.roundRect(-r.length / 2, -r.width / 2, r.length, r.width, 4);
    ctx.fill();

    // Racing stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r.length / 2, -3, r.length, 6);

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-r.length * 0.1, -r.width * 0.35, r.length * 0.35, r.width * 0.7);

    // Taillights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-r.length / 2, -r.width / 2 + 2, 2, 4);
    ctx.fillRect(-r.length / 2, r.width / 2 - 6, 2, 4);

    ctx.restore();

    // Draw Rival Name Tag
    ctx.save();
    ctx.translate(r.x, r.y - 25);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-30, -10, 60, 16);
    ctx.fillStyle = r.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(r.name, 0, 2);
    ctx.restore();
  }
}
