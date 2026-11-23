// races.js - Race Tracks, Checkpoint System, Delivery Missions & Police Heat

export const RACE_TRACKS = [
  {
    id: 'downtown_gp',
    name: 'DOWNTOWN GRAND PRIX',
    district: 'Downtown Metropolis',
    laps: 3,
    reward: 2000,
    checkpoints: [
      { x: 2600, y: 2600, radius: 70 },
      { x: 2600, y: 1600, radius: 70 },
      { x: 3600, y: 1600, radius: 70 },
      { x: 3600, y: 2100, radius: 70 },
      { x: 4100, y: 2100, radius: 70 },
      { x: 4100, y: 3200, radius: 70 },
      { x: 3100, y: 3200, radius: 70 },
      { x: 3100, y: 2600, radius: 70 }
    ]
  },
  {
    id: 'neon_sprint',
    name: 'NEON BOULEVARD BLITZ',
    district: 'Neon Strip',
    laps: 2,
    reward: 2800,
    checkpoints: [
      { x: 4600, y: 2000, radius: 80 },
      { x: 4600, y: 3200, radius: 80 },
      { x: 5200, y: 3200, radius: 80 },
      { x: 5200, y: 4600, radius: 80 },
      { x: 6000, y: 4600, radius: 80 },
      { x: 6000, y: 2600, radius: 80 },
      { x: 5200, y: 2600, radius: 80 },
      { x: 5200, y: 2000, radius: 80 }
    ]
  },
  {
    id: 'harbor_slalom',
    name: 'HARBOR INDUSTRIAL GAUNTLET',
    district: 'Industrial Docks',
    laps: 2,
    reward: 3200,
    checkpoints: [
      { x: 1000, y: 4300, radius: 75 },
      { x: 2100, y: 4300, radius: 75 },
      { x: 2100, y: 5400, radius: 75 },
      { x: 1000, y: 5400, radius: 75 },
      { x: 600, y: 4800, radius: 75 },
      { x: 600, y: 3900, radius: 75 },
      { x: 1600, y: 3900, radius: 75 },
      { x: 1600, y: 4300, radius: 75 }
    ]
  },
  {
    id: 'outer_loop',
    name: 'HIGHWAY OUTER RING ENDURANCE',
    district: 'Outer Loop Expressway',
    laps: 1,
    reward: 4500,
    checkpoints: [
      { x: 500, y: 500, radius: 90 },
      { x: 3000, y: 400, radius: 90 },
      { x: 5950, y: 500, radius: 90 },
      { x: 6000, y: 3000, radius: 90 },
      { x: 5950, y: 5950, radius: 90 },
      { x: 3000, y: 6000, radius: 90 },
      { x: 450, y: 5950, radius: 90 },
      { x: 400, y: 3000, radius: 90 }
    ]
  }
];

export class MissionManager {
  constructor() {
    this.currentMode = 'freeroam'; // 'freeroam', 'race', 'delivery'

    // Race mode state
    this.activeTrack = null;
    this.currentCpIndex = 0;
    this.currentLap = 1;
    this.totalLaps = 3;
    this.raceTime = 0;
    this.lapTimes = [];
    this.playerPosition = 1;
    this.isRaceFinished = false;
    this.countdown = 0; // 3, 2, 1, GO!

    // Delivery mode state
    this.activeDelivery = null;
    this.deliveryTimer = 0;
    this.deliveryTarget = null;
    this.deliveryReward = 0;

    // Wanted Heat Level System (0 to 5)
    this.wantedLevel = 0;
    this.wantedCooloffTimer = 0;
    this.evadingTimer = 0;
  }

  startRace(trackId, player, trafficManager) {
    const track = RACE_TRACKS.find(t => t.id === trackId) || RACE_TRACKS[0];
    this.currentMode = 'race';
    this.activeTrack = track;
    this.currentCpIndex = 1;
    this.currentLap = 1;
    this.totalLaps = track.laps;
    this.raceTime = 0;
    this.lapTimes = [];
    this.isRaceFinished = false;
    this.countdown = 3.99; // 3-second countdown

    // Teleport player to start grid
    const startCp = track.checkpoints[0];
    const nextCp = track.checkpoints[1];
    const initialAngle = Math.atan2(nextCp.y - startCp.y, nextCp.x - startCp.x);

    player.x = startCp.x;
    player.y = startCp.y;
    player.angle = initialAngle;
    player.speed = 0;
    player.lateralSpeed = 0;

    // Init AI rivals
    trafficManager.initRaceCompetitors(track.checkpoints);
  }

  startDeliveryMission(player) {
    this.currentMode = 'delivery';
    const destinations = [
      { name: 'Downtown Sky Tower VIP', x: 2900, y: 2200 },
      { name: 'Neon Arcade Casino', x: 4800, y: 2800 },
      { name: 'Harbor Shipping Warehouse 7', x: 1200, y: 4900 },
      { name: 'Central Park Lakeside Pavilion', x: 1300, y: 1300 },
      { name: 'Sunset Suburb Villa', x: 4400, y: 800 }
    ];

    // Pick destination not too close to player
    const valid = destinations.filter(d => Math.hypot(d.x - player.x, d.y - player.y) > 1400);
    const target = valid[Math.floor(Math.random() * valid.length)] || destinations[0];

    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    const estimatedSecs = Math.max(35, Math.floor(dist / 140));

    this.activeDelivery = {
      title: 'EXPRESS RUSH: ' + target.name,
      x: target.x,
      y: target.y,
      radius: 80,
      reward: Math.floor(dist * 0.75) + 300
    };

    this.deliveryTimer = estimatedSecs;
    this.deliveryReward = this.activeDelivery.reward;
  }

  update(dt, player, trafficManager, particleSystem, audioSystem) {
    // 1. Race Mode Update
    if (this.currentMode === 'race' && this.activeTrack) {
      if (this.countdown > 0) {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          if (audioSystem) audioSystem.playCheckpoint();
        }
        // Lock player during countdown
        player.speed = 0;
        return;
      }

      if (!this.isRaceFinished) {
        this.raceTime += dt;

        // Check if player hit current checkpoint
        const cp = this.activeTrack.checkpoints[this.currentCpIndex];
        const dist = Math.hypot(player.x - cp.x, player.y - cp.y);

        if (dist < cp.radius + player.width / 2) {
          this.currentCpIndex++;
          if (audioSystem) audioSystem.playCheckpoint();
          if (particleSystem) {
            particleSystem.createCollectSparks(cp.x, cp.y, '#00f0ff');
            particleSystem.createFloatingText(cp.x, cp.y - 40, 'CHECKPOINT!', '#00f0ff');
          }

          if (this.currentCpIndex >= this.activeTrack.checkpoints.length) {
            // Lap complete!
            this.currentCpIndex = 0;
            this.lapTimes.push(this.raceTime);
            this.currentLap++;

            if (this.currentLap > this.totalLaps) {
              // Race finished!
              this.isRaceFinished = true;
              const place = this.calculatePlayerPosition(player, trafficManager.aiRacers);
              const prize = place === 1 ? this.activeTrack.reward : (place === 2 ? Math.floor(this.activeTrack.reward * 0.6) : Math.floor(this.activeTrack.reward * 0.3));

              player.cash += prize;
              if (audioSystem) audioSystem.playCash();
              if (particleSystem) {
                particleSystem.createConfetti(player.x, player.y);
                particleSystem.createFloatingText(player.x, player.y - 60, `RACE FINISHED! ${place === 1 ? '1ST PLACE!' : place + 'TH PLACE'} +$${prize}`, '#facc15');
              }
            } else {
              if (particleSystem) {
                particleSystem.createFloatingText(player.x, player.y - 40, `LAP ${this.currentLap}/${this.totalLaps}`, '#facc15');
              }
            }
          }
        }

        this.playerPosition = this.calculatePlayerPosition(player, trafficManager.aiRacers);
      }
    }

    // 2. Delivery Mode Update
    if (this.currentMode === 'delivery' && this.activeDelivery) {
      this.deliveryTimer -= dt;
      const dist = Math.hypot(player.x - this.activeDelivery.x, player.y - this.activeDelivery.y);

      if (dist < this.activeDelivery.radius) {
        // Delivered!
        const timeBonus = Math.floor(Math.max(0, this.deliveryTimer) * 15);
        const total = this.deliveryReward + timeBonus;
        player.cash += total;

        if (audioSystem) audioSystem.playCash();
        if (particleSystem) {
          particleSystem.createConfetti(player.x, player.y);
          particleSystem.createFloatingText(player.x, player.y - 50, `DELIVERY COMPLETE! +$${total}`, '#10b981');
        }

        this.activeDelivery = null;
        this.currentMode = 'freeroam';
      } else if (this.deliveryTimer <= 0) {
        // Failed
        if (particleSystem) {
          particleSystem.createFloatingText(player.x, player.y - 50, 'DELIVERY FAILED - OUT OF TIME!', '#ef4444');
        }
        this.activeDelivery = null;
        this.currentMode = 'freeroam';
      }
    }

    // 3. Wanted Level Heat Decay
    if (this.wantedLevel > 0) {
      // Check if police units are nearby
      const hasCloseCops = trafficManager.policeUnits.some(cop => Math.hypot(cop.x - player.x, cop.y - player.y) < 900);
      if (!hasCloseCops) {
        this.evadingTimer += dt;
        if (this.evadingTimer > 6.0) {
          this.wantedLevel = Math.max(0, this.wantedLevel - 1);
          this.evadingTimer = 0;
          if (particleSystem && this.wantedLevel === 0) {
            particleSystem.createFloatingText(player.x, player.y - 50, 'COPS EVADED! HEAT CLEARED', '#3b82f6');
          }
        }
      } else {
        this.evadingTimer = 0;
      }
    }
  }

  calculatePlayerPosition(player, aiRacers) {
    let position = 1;
    const playerProgress = (this.currentLap - 1) * 1000 + this.currentCpIndex;
    const currentCp = this.activeTrack.checkpoints[this.currentCpIndex];
    const playerDist = Math.hypot(player.x - currentCp.x, player.y - currentCp.y);

    for (const r of aiRacers) {
      const rProgress = (r.lap - 1) * 1000 + r.currentCpIndex;
      if (rProgress > playerProgress) {
        position++;
      } else if (rProgress === playerProgress) {
        const rCp = this.activeTrack.checkpoints[r.currentCpIndex];
        const rDist = Math.hypot(r.x - rCp.x, r.y - rCp.y);
        if (rDist < playerDist) {
          position++;
        }
      }
    }
    return position;
  }

  addHeat(amount) {
    this.wantedLevel = Math.min(5, Math.max(1, Math.round(this.wantedLevel + amount)));
    this.evadingTimer = 0;
  }

  draw(ctx, camera) {
    // 1. Draw race checkpoints
    if (this.currentMode === 'race' && this.activeTrack && !this.isRaceFinished) {
      const cp = this.activeTrack.checkpoints[this.currentCpIndex];
      if (camera.isInView(cp.x, cp.y, cp.radius * 2)) {
        ctx.save();
        ctx.translate(cp.x, cp.y);

        // Animated pulsing checkpoint ring
        const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.15;
        const r = cp.radius * pulse;

        // Glowing fill
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        grad.addColorStop(0.8, 'rgba(0, 240, 255, 0.15)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Checkpoint gate icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`GATE ${this.currentCpIndex + 1}`, 0, 0);

        ctx.restore();
      }
    }

    // 2. Draw delivery target marker
    if (this.currentMode === 'delivery' && this.activeDelivery) {
      const d = this.activeDelivery;
      if (camera.isInView(d.x, d.y, 160)) {
        ctx.save();
        ctx.translate(d.x, d.y);

        const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.18;
        const r = d.radius * pulse;

        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, r);
        grad.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DROP ZONE', 0, 0);

        ctx.restore();
      }
    }
  }
}
