// car.js - Vehicle Physics, Drifting, Nitro, Damage, and Custom Car Models

export const CAR_MODELS = [
  {
    id: 'hatch',
    name: 'STREET PULSE',
    category: 'Hot Hatch',
    price: 0,
    topSpeed: 170, // km/h
    accel: 240,
    handling: 3.4,
    driftMultiplier: 1.0,
    weight: 1100,
    nitroCapacity: 100,
    bodyColor: '#3b82f6',
    rimColor: '#cbd5e1',
    neonColor: '#00f0ff',
    length: 44,
    width: 22,
    description: 'Agile and responsive street hatch. Perfect for weaving through downtown traffic.'
  },
  {
    id: 'muscle',
    name: 'V8 THUNDERBOLT',
    category: 'Muscle Car',
    price: 1500,
    topSpeed: 195,
    accel: 280,
    handling: 2.7,
    driftMultiplier: 1.4,
    weight: 1650,
    nitroCapacity: 120,
    bodyColor: '#dc2626',
    rimColor: '#f59e0b',
    neonColor: '#ef4444',
    length: 48,
    width: 24,
    description: 'Raw American horsepower. Heavy rear-wheel burnouts and deep roaring drifts.'
  },
  {
    id: 'jdm',
    name: 'FUJIWARA DRIFT',
    category: 'JDM Legend',
    price: 3200,
    topSpeed: 210,
    accel: 300,
    handling: 3.6,
    driftMultiplier: 2.2,
    weight: 1200,
    nitroCapacity: 110,
    bodyColor: '#f8fafc',
    rimColor: '#1e293b',
    neonColor: '#ec4899',
    length: 46,
    width: 23,
    description: 'Tuned Japanese drift icon. Breaks into high-angle powerslides effortlessly.'
  },
  {
    id: 'supercar',
    name: 'APEX GT',
    category: 'Exotic Supercar',
    price: 6500,
    topSpeed: 240,
    accel: 360,
    handling: 3.8,
    driftMultiplier: 1.2,
    weight: 1350,
    nitroCapacity: 140,
    bodyColor: '#f59e0b',
    rimColor: '#0f172a',
    neonColor: '#fbbf24',
    length: 50,
    width: 25,
    description: 'Carbon fiber aerodynamics with razor-sharp cornering and staggering speed.'
  },
  {
    id: 'police',
    name: 'METRO ENFORCER',
    category: 'Police Interceptor',
    price: 9000,
    topSpeed: 230,
    accel: 330,
    handling: 3.2,
    driftMultiplier: 1.1,
    weight: 1900,
    nitroCapacity: 150,
    bodyColor: '#090d16',
    rimColor: '#ffffff',
    neonColor: '#3b82f6',
    length: 50,
    width: 25,
    isPolice: true,
    description: 'Reinforced bull-bars to ram suspects. Equipped with high-output emergency siren!'
  },
  {
    id: 'cyber',
    name: 'CYBER PHANTOM',
    category: 'Hypercar Prototype',
    price: 15000,
    topSpeed: 275,
    accel: 440,
    handling: 4.2,
    driftMultiplier: 1.8,
    weight: 1250,
    nitroCapacity: 180,
    bodyColor: '#10b981',
    rimColor: '#00f0ff',
    neonColor: '#00f0ff',
    length: 52,
    width: 25,
    description: 'Next-gen experimental hypercar with active aero flaps and instant torque delivery.'
  }
];

export class Car {
  constructor(modelId = 'hatch', x = 2600, y = 2600, angle = 0) {
    this.setModel(modelId);

    // Position and orientation
    this.x = x;
    this.y = y;
    this.angle = angle; // Radians (0 = pointing right)
    
    // Velocities
    this.speed = 0; // Forward speed (pixels/sec)
    this.lateralSpeed = 0; // Sideways slip speed
    this.angularVelocity = 0;
    this.steerAngle = 0; // Current front wheel angle

    // Vertical height for jumps & stunt ramps
    this.z = 0;
    this.vz = 0;
    this.isAirborne = false;

    // Nitro
    this.nitro = this.nitroCapacity;
    this.isNitroActive = false;

    // Health & Damage
    this.maxHealth = 100;
    this.health = 100;

    // Drifting state & combo
    this.isDrifting = false;
    this.driftScore = 0;
    this.driftCombo = 1.0;
    this.driftDuration = 0;
    this.driftComboTimeout = 0;

    // Lights
    this.headlights = true;
    this.braking = false;
    this.reversing = false;
    this.underglow = true;

    // Sirens (for police interceptor)
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Gear & RPM for audio engine
    this.gear = 1;
    this.rpm = 1000;
    this.revLimiter = false;
    this.isShifting = false;
    this.shiftTimer = 0;

    // Realistic Weight Transfer & Suspension (Spring-Damper Simulation)
    this.pitch = 0; // Front dive (+), rear squat (-)
    this.pitchVel = 0;
    this.roll = 0;  // Body lean into corners
    this.rollVel = 0;
    this.suspensionBounce = 0;

    // Burnout state
    this.isBurnout = false;

    // Custom paint / visual overrides
    this.customBodyColor = null;
    this.customNeonColor = null;

    // Total distance & cash
    this.cash = 0;
    this.totalDistance = 0;
  }

  setModel(modelId) {
    const preset = CAR_MODELS.find(m => m.id === modelId) || CAR_MODELS[0];
    this.modelId = preset.id;
    this.name = preset.name;
    this.category = preset.category;
    this.length = preset.length;
    this.width = preset.width;
    this.baseTopSpeed = preset.topSpeed;
    this.baseAccel = preset.accel;
    this.baseHandling = preset.handling;
    this.driftMultiplier = preset.driftMultiplier;
    this.weight = preset.weight;
    this.nitroCapacity = preset.nitroCapacity;
    this.bodyColor = preset.bodyColor;
    this.rimColor = preset.rimColor;
    this.neonColor = preset.neonColor;
    this.isPolice = !!preset.isPolice;

    // Upgrades level (0 to 4)
    this.upgrades = this.upgrades || { engine: 0, handling: 0, nitro: 0, armor: 0 };
    this.applyUpgrades();
  }

  applyUpgrades() {
    this.topSpeed = (this.baseTopSpeed + this.upgrades.engine * 15) * 2.8; // converted to px/s (~500 - 800)
    this.accel = this.baseAccel + this.upgrades.engine * 35;
    this.handling = this.baseHandling + this.upgrades.handling * 0.3;
    this.maxNitro = this.nitroCapacity + this.upgrades.nitro * 25;
    this.maxHealth = 100 + this.upgrades.armor * 25;
    if (this.health > this.maxHealth) this.health = this.maxHealth;
    if (this.nitro > this.maxNitro) this.nitro = this.maxNitro;
  }

  update(dt, controls, city, particleSystem, audioSystem) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05); // prevent giant deltas on tab switch

    // 1. Airtime and Jump Physics
    if (this.isAirborne || this.z > 0) {
      this.z += this.vz * dt;
      this.vz -= 380 * dt; // gravity
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.isAirborne = false;
        // Landing dust and sound
        if (particleSystem) {
          particleSystem.createLandingDust(this.x, this.y, 16);
        }
        if (audioSystem) {
          audioSystem.playThud(Math.min(1.0, Math.abs(this.vz) / 200));
        }
      }
    }

    // 2. Nitro Handling
    const wantsNitro = controls.nitro && this.nitro > 0 && !this.isAirborne;
    this.isNitroActive = wantsNitro && (controls.throttle || this.speed > 50);

    let currentAccel = this.accel;
    let currentMaxSpeed = this.topSpeed;

    if (this.isNitroActive) {
      this.nitro = Math.max(0, this.nitro - 35 * dt);
      currentAccel *= 1.7;
      currentMaxSpeed *= 1.35;

      // Nitro exhaust flame particles
      if (particleSystem && Math.random() < 0.8) {
        const backX = this.x - Math.cos(this.angle) * (this.length / 2 + 2);
        const backY = this.y - Math.sin(this.angle) * (this.length / 2 + 2);
        particleSystem.createNitroFlame(backX, backY, this.angle);
      }
    } else {
      // Passive nitro regeneration
      this.nitro = Math.min(this.maxNitro, this.nitro + 5 * dt);
    }

    // 3. Throttle, Reverse, Braking & Burnout
    this.braking = false;
    this.reversing = false;
    this.isBurnout = false;

    // Check for Burnout (Holding Gas + Brake simultaneously at standstill or low speed)
    if (controls.throttle && controls.brake && Math.abs(this.speed) < 80 && !this.isAirborne) {
      this.isBurnout = true;
      this.speed *= 0.85; // Hold car in place with front brakes
      this.rpm = 6800 + (Math.random() - 0.5) * 800; // Revving engine on limiter

      // Billow thick burnout smoke at rear wheels
      if (particleSystem) {
        const forwardX = Math.cos(this.angle);
        const forwardY = Math.sin(this.angle);
        const rightX = -Math.sin(this.angle);
        const rightY = Math.cos(this.angle);
        const rearDist = this.length * 0.38;
        const trackDist = this.width * 0.44;

        const rlX = this.x - forwardX * rearDist - rightX * trackDist;
        const rlY = this.y - forwardY * rearDist - rightY * trackDist;
        const rrX = this.x - forwardX * rearDist + rightX * trackDist;
        const rrY = this.y - forwardY * rearDist + rightY * trackDist;

        particleSystem.createTireSmoke(rlX, rlY);
        particleSystem.createTireSmoke(rrX, rrY);
        particleSystem.addSkidmark(rlX, rlY, this.angle, 0.7);
        particleSystem.addSkidmark(rrX, rrY, this.angle, 0.7);
      }
    } else if (controls.throttle) {
      if (this.speed < -10) {
        // Was reversing, now braking
        this.speed += 420 * dt;
        this.braking = true;
      } else {
        // Accelerate forward with gear torque curve
        const gearTorque = [0, 1.25, 1.15, 1.05, 0.95, 0.85, 0.75];
        const torqueMult = gearTorque[this.gear] || 1.0;
        this.speed += currentAccel * torqueMult * dt;
        if (this.speed > currentMaxSpeed) {
          this.speed = Math.max(currentMaxSpeed, this.speed - 120 * dt);
        }
      }
    } else if (controls.brake) {
      if (this.speed > 10) {
        // High-performance braking with ABS modulation
        this.speed -= 520 * dt;
        this.braking = true;
      } else {
        // Reverse gear
        this.speed -= currentAccel * 0.55 * dt;
        const maxReverse = -160;
        if (this.speed < maxReverse) this.speed = maxReverse;
        this.reversing = true;
      }
    } else {
      // Natural rolling resistance and aerodynamic drag (drag proportional to v^2)
      const aeroDrag = (this.speed * Math.abs(this.speed)) * 0.00035 * dt;
      const rollingDrag = 110 * dt;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - rollingDrag - aeroDrag);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + rollingDrag - aeroDrag);
      }
    }

    // Dynamic Weight Transfer & Suspension Simulation
    let targetPitch = 0;
    if (this.braking) {
      targetPitch = 0.09; // Front dive under hard braking
    } else if (controls.throttle && this.speed < currentMaxSpeed * 0.9) {
      targetPitch = -0.065; // Rear squat on acceleration
    }

    // Lateral weight transfer (roll leaning outward into corners)
    const targetRoll = -this.angularVelocity * 0.085;

    // Damped spring oscillation
    const springK = 32.0;
    const dampingC = 7.5;
    this.pitchVel += (targetPitch - this.pitch) * springK * dt - this.pitchVel * dampingC * dt;
    this.pitch += this.pitchVel * dt;
    this.rollVel += (targetRoll - this.roll) * springK * dt - this.rollVel * dampingC * dt;
    this.roll += this.rollVel * dt;

    // 4. Steering and Caster Return
    const steerSpeed = 6.0;
    const maxSteer = 0.58; // radians front wheel angle (~33 degrees)

    // Dynamic steering angle sensitivity based on speed
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / (this.topSpeed * 0.8));
    const steerLimit = maxSteer * (1.0 - speedRatio * 0.38);

    if (controls.left) {
      this.steerAngle = Math.max(-steerLimit, this.steerAngle - steerSpeed * dt);
    } else if (controls.right) {
      this.steerAngle = Math.min(steerLimit, this.steerAngle + steerSpeed * dt);
    } else {
      // Center return
      if (this.steerAngle > 0) {
        this.steerAngle = Math.max(0, this.steerAngle - steerSpeed * 1.5 * dt);
      } else if (this.steerAngle < 0) {
        this.steerAngle = Math.min(0, this.steerAngle + steerSpeed * 1.5 * dt);
      }
    }

    // 5. Drifting Mechanics & Lateral Grip
    const isHandbrake = controls.handbrake;
    const isSharpTurn = Math.abs(this.steerAngle) > 0.35 && Math.abs(this.speed) > 150;
    const driftTrigger = isHandbrake || isSharpTurn;

    // Normal lateral grip vs drift grip
    let lateralGrip = 0.88;
    if (driftTrigger) {
      lateralGrip = isHandbrake ? 0.28 : 0.45;
    }

    // Angular velocity update from steering & forward motion
    const turnFactor = (this.speed / 180) * this.handling;
    this.angularVelocity = this.steerAngle * turnFactor;

    if (driftTrigger && Math.abs(this.speed) > 120) {
      // Enhance drift spin angle
      this.angularVelocity *= (1.35 * this.driftMultiplier);
      this.isDrifting = true;
    } else {
      this.isDrifting = false;
    }

    // Apply rotation
    this.angle += this.angularVelocity * dt;

    // 6. Velocity decomposition & Slip Angle
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const rightX = -Math.sin(this.angle);
    const rightY = Math.cos(this.angle);

    // Lateral slip dampening
    this.lateralSpeed *= Math.pow(lateralGrip, dt * 60);

    // Add slip from sharp turn
    if (this.isDrifting) {
      this.lateralSpeed += this.angularVelocity * 45 * dt;
    }

    // Total displacement
    const vx = forwardX * this.speed + rightX * this.lateralSpeed;
    const vy = forwardY * this.speed + rightY * this.lateralSpeed;

    this.x += vx * dt;
    this.y += vy * dt;
    this.totalDistance += Math.hypot(vx, vy) * dt;

    // 7. Drift Score & Particles (Skidmarks and Smoke)
    const slipAngle = Math.abs(this.lateralSpeed) / (Math.abs(this.speed) + 1);
    if (this.isDrifting && slipAngle > 0.25 && !this.isAirborne) {
      this.driftDuration += dt;
      this.driftCombo = Math.min(5.0, 1.0 + this.driftDuration * 0.4);
      const points = Math.floor(Math.abs(this.speed) * slipAngle * this.driftMultiplier * this.driftCombo * dt * 8);
      this.driftScore += points;
      this.driftComboTimeout = 1.8;

      // Spawn skidmarks and tire smoke at both rear tires
      const wheelBase = this.length * 0.38;
      const wheelTrack = this.width * 0.44;

      const rearLeftX = this.x - forwardX * wheelBase - rightX * wheelTrack;
      const rearLeftY = this.y - forwardY * wheelBase - rightY * wheelTrack;
      const rearRightX = this.x - forwardX * wheelBase + rightX * wheelTrack;
      const rearRightY = this.y - forwardY * wheelBase + rightY * wheelTrack;

      if (particleSystem) {
        particleSystem.addSkidmark(rearLeftX, rearLeftY, this.angle, 0.45);
        particleSystem.addSkidmark(rearRightX, rearRightY, this.angle, 0.45);

        if (Math.random() < 0.7) {
          particleSystem.createTireSmoke(rearLeftX, rearLeftY);
          particleSystem.createTireSmoke(rearRightX, rearRightY);
        }
      }
    } else {
      if (this.driftComboTimeout > 0) {
        this.driftComboTimeout -= dt;
        if (this.driftComboTimeout <= 0) {
          // Bank drift score into player cash!
          if (this.driftScore > 200) {
            const reward = Math.floor(this.driftScore / 25);
            this.cash += reward;
            if (particleSystem) {
              particleSystem.createFloatingText(this.x, this.y - 40, `+$${reward} DRIFT BONUS!`, '#10b981');
            }
          }
          this.driftScore = 0;
          this.driftDuration = 0;
          this.driftCombo = 1.0;
        }
      }
    }

    // 8. Stunt Ramps Collision
    if (!this.isAirborne && city) {
      for (const ramp of city.stuntRamps) {
        const dist = Math.hypot(this.x - ramp.x, this.y - ramp.y);
        if (dist < 40 && this.speed > 160) {
          this.isAirborne = true;
          this.vz = 220 * ramp.boost;
          this.speed *= 1.15;
          if (audioSystem) audioSystem.playWhoosh();
          if (particleSystem) particleSystem.createFloatingText(this.x, this.y - 50, 'SUPER JUMP!', '#00f0ff');
          break;
        }
      }
    }

    // 9. Collectibles Collision
    if (city) {
      for (const col of city.collectibles) {
        if (!col.collected) {
          const dist = Math.hypot(this.x - col.x, this.y - col.y);
          if (dist < col.radius + this.width / 2) {
            col.collected = true;
            if (col.type === 'cash') {
              this.cash += col.val;
              if (audioSystem) audioSystem.playCash();
              if (particleSystem) {
                particleSystem.createFloatingText(col.x, col.y - 30, `+$${col.val}`, '#10b981');
                particleSystem.createCollectSparks(col.x, col.y, '#10b981');
              }
            } else if (col.type === 'nitro') {
              this.nitro = this.maxNitro;
              if (audioSystem) audioSystem.playNitroChime();
              if (particleSystem) {
                particleSystem.createFloatingText(col.x, col.y - 30, 'NOS REFILLED!', '#00f0ff');
                particleSystem.createCollectSparks(col.x, col.y, '#00f0ff');
              }
            }
          }
        }
      }
    }

    // 10. City Obstacles Collision (Buildings & Dynamic Props)
    if (!this.isAirborne && city) {
      this.resolveCollisions(city, particleSystem, audioSystem);
    }

    // 11. Sirens update (police car)
    if (this.isPolice) {
      this.sirenTimer += dt * 8;
    }

    // 12. Engine RPM calculation
    this.updateEngineRPM(dt, audioSystem);

    // Clamp coordinates to world boundaries
    const pad = 60;
    this.x = Math.max(pad, Math.min(city.width - pad, this.x));
    this.y = Math.max(pad, Math.min(city.height - pad, this.y));
  }

  updateEngineRPM(dt = 0.016, audioSystem = null) {
    if (this.isBurnout) return; // Burnout maintains high revs

    const absSpeed = Math.abs(this.speed);
    const gearMax = [0, 85, 175, 280, 400, 560, 750]; // 6-speed gearbox
    let newGear = 1;

    for (let g = 1; g <= 6; g++) {
      if (absSpeed <= gearMax[g] || g === 6) {
        newGear = g;
        const prevMax = gearMax[g - 1];
        const span = gearMax[g] - prevMax;
        const progress = Math.max(0, Math.min(1, (absSpeed - prevMax) / span));

        let targetRpm = 1200 + progress * 6800;
        // Rev limiter bounce near redline
        if (targetRpm > 7800 && absSpeed >= gearMax[g] * 0.96) {
          this.revLimiter = Math.random() > 0.45;
          targetRpm = this.revLimiter ? 7950 : 7400;
          if (audioSystem && Math.random() < 0.2) audioSystem.playExhaustPop();
        } else {
          this.revLimiter = false;
        }

        // Detect Gear Shift (play exhaust pop sound)
        if (newGear !== this.gear) {
          if (audioSystem) audioSystem.playExhaustPop();
          this.isShifting = true;
          this.shiftTimer = 0.12;
        }

        this.gear = newGear;
        this.rpm += (targetRpm - this.rpm) * Math.min(1.0, 18.0 * (dt || 0.016));
        break;
      }
    }
  }

  resolveCollisions(city, particleSystem, audioSystem) {
    const nearby = city.getNearbyObjects(this.x, this.y, 80);
    const carRadius = Math.max(this.length, this.width) * 0.45;

    for (const item of nearby) {
      if (item.type === 'building') {
        const b = item.data;
        // Check collision against axis-aligned building box
        const closestX = Math.max(b.x, Math.min(this.x, b.x + b.w));
        const closestY = Math.max(b.y, Math.min(this.y, b.y + b.h));
        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < carRadius * carRadius) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = carRadius - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push car out of building
          this.x += nx * overlap;
          this.y += ny * overlap;

          // Bounce and impact
          const impactSpeed = Math.abs(this.speed);
          if (impactSpeed > 40) {
            this.speed = -this.speed * 0.35;
            this.health = Math.max(0, this.health - impactSpeed * 0.025);

            if (audioSystem) {
              audioSystem.playCrash(Math.min(1.0, impactSpeed / 300));
            }
            if (particleSystem) {
              particleSystem.createSparks(closestX, closestY, nx, ny, 12);
              if (impactSpeed > 200) {
                particleSystem.triggerScreenShake(0.3, 8);
              }
            }
          }
        }
      } else if (item.type === 'tree') {
        const t = item.data;
        const dx = this.x - t.x;
        const dy = this.y - t.y;
        const dist = Math.hypot(dx, dy);
        const minDist = carRadius + t.radius * 0.5;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / (dist || 0.001);
          const ny = dy / (dist || 0.001);

          this.x += nx * overlap;
          this.y += ny * overlap;

          if (Math.abs(this.speed) > 40) {
            this.speed = -this.speed * 0.3;
            if (audioSystem) audioSystem.playCrash(0.4);
            if (particleSystem) particleSystem.createSparks(t.x, t.y, nx, ny, 6);
          }
        }
      } else if (item.type === 'dynamicProp') {
        const dp = item.data;
        if (!dp.active) continue;

        const dx = dp.x - this.x;
        const dy = dp.y - this.y;
        const dist = Math.hypot(dx, dy);
        const minDist = carRadius + dp.radius;

        if (dist < minDist) {
          // Transfer momentum to dynamic prop!
          const pushForce = Math.max(100, Math.abs(this.speed) * 1.4);
          const angle = Math.atan2(dy, dx);
          dp.vx = Math.cos(angle) * pushForce;
          dp.vy = Math.sin(angle) * pushForce;

          if (dp.type === 'hydrant' && !dp.isBurst) {
            dp.isBurst = true;
            if (audioSystem) audioSystem.playSplash();
            if (particleSystem) {
              particleSystem.createWaterSpout(dp.x, dp.y);
            }
          } else if (dp.type === 'cone') {
            if (audioSystem) audioSystem.playConeHit();
          }
        }
      }
    }
  }

  // Draw the high-fidelity vector car sprite
  draw(ctx) {
    ctx.save();

    // Drop shadow when jumping or normal ambient ground shadow
    const shadowDist = 6 + this.z * 0.4;
    const shadowScale = 1.0 + this.z * 0.015;

    ctx.save();
    ctx.translate(this.x + shadowDist * 0.5, this.y + shadowDist * 0.8);
    ctx.rotate(this.angle);
    ctx.scale(shadowScale, shadowScale);
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.15, 0.45 - this.z * 0.003)})`;
    ctx.beginPath();
    ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 6);
    ctx.fill();
    ctx.restore();

    // Actual car body translated by z height
    ctx.translate(this.x, this.y - this.z);
    ctx.rotate(this.angle);

    // Neon underglow
    if (this.underglow && !this.isAirborne) {
      const glowCol = this.customNeonColor || this.neonColor;
      ctx.save();
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = glowCol;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-this.length / 2 + 4, -this.width / 2 + 2, this.length - 8, this.width - 4, 8);
      ctx.stroke();
      ctx.restore();
    }

    // Wheels (4 wheels with steer angle on front wheels)
    const wheelW = 10;
    const wheelH = 4.5;
    const frontX = this.length * 0.32;
    const rearX = -this.length * 0.32;
    const trackY = this.width * 0.5;

    this.drawWheel(ctx, frontX, -trackY, this.steerAngle, wheelW, wheelH);
    this.drawWheel(ctx, frontX, trackY, this.steerAngle, wheelW, wheelH);
    this.drawWheel(ctx, rearX, -trackY, 0, wheelW, wheelH);
    this.drawWheel(ctx, rearX, trackY, 0, wheelW, wheelH);

    // Car Main Body
    const bodyCol = this.customBodyColor || this.bodyColor;
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 6);
    ctx.fill();

    // Body contour gradient / metallic sheen
    const grad = ctx.createLinearGradient(0, -this.width / 2, 0, this.width / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 6);
    ctx.fill();

    // Windshield & Windows
    const glassColor = '#1e293b';
    ctx.fillStyle = glassColor;
    // Front windshield
    ctx.beginPath();
    ctx.roundRect(-this.length * 0.1, -this.width * 0.38, this.length * 0.35, this.width * 0.76, 4);
    ctx.fill();

    // Rear window
    ctx.beginPath();
    ctx.roundRect(-this.length * 0.36, -this.width * 0.34, this.length * 0.18, this.width * 0.68, 3);
    ctx.fill();

    // Windshield glass reflection highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.length * 0.15, -this.width * 0.25);
    ctx.lineTo(-this.length * 0.05, this.width * 0.25);
    ctx.stroke();

    // Roof panel
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.roundRect(-this.length * 0.18, -this.width * 0.32, this.length * 0.26, this.width * 0.64, 2);
    ctx.fill();

    // Headlights (Front)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = this.headlights ? 12 : 0;
    ctx.fillRect(this.length / 2 - 3, -this.width / 2 + 2, 3, 5);
    ctx.fillRect(this.length / 2 - 3, this.width / 2 - 7, 3, 5);
    ctx.shadowBlur = 0;

    // Taillights / Brake lights (Rear)
    const brakeActive = this.braking || this.reversing;
    ctx.fillStyle = this.reversing ? '#f8fafc' : (brakeActive ? '#ff0033' : '#b91c1c');
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = brakeActive ? 14 : 4;
    ctx.fillRect(-this.length / 2, -this.width / 2 + 2, 3, 5);
    ctx.fillRect(-this.length / 2, this.width / 2 - 7, 3, 5);
    ctx.shadowBlur = 0;

    // Police Lightbar (if police car)
    if (this.isPolice) {
      const isRed = Math.floor(this.sirenTimer) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillRect(-4, -this.width * 0.28, 8, this.width * 0.56);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  drawWheel(ctx, x, y, steerAngle, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(steerAngle);
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2);
    ctx.fill();
    // Rim center
    ctx.fillStyle = this.rimColor;
    ctx.fillRect(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
    ctx.restore();
  }
}
