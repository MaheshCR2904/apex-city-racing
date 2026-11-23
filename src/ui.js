// ui.js - Modern Racing HUD, Minimap, Full City Map, Garage & Touch Controls

import { CAR_MODELS } from './car.js';
import { RACE_TRACKS } from './races.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // Elements
    this.speedText = document.getElementById('speed-value');
    this.gearText = document.getElementById('gear-value');
    this.rpmBar = document.getElementById('rpm-bar');
    this.nitroBar = document.getElementById('nitro-bar');
    this.healthBar = document.getElementById('health-bar');
    this.cashText = document.getElementById('cash-value');
    this.districtName = document.getElementById('district-name');
    this.districtDesc = document.getElementById('district-desc');

    this.driftHud = document.getElementById('drift-hud');
    this.driftScoreText = document.getElementById('drift-score');
    this.driftMultiplierText = document.getElementById('drift-multiplier');

    this.wantedContainer = document.getElementById('wanted-stars');
    this.raceHud = document.getElementById('race-hud');
    this.racePosition = document.getElementById('race-position');
    this.raceLap = document.getElementById('race-lap');
    this.raceTimer = document.getElementById('race-timer');
    this.countdownOverlay = document.getElementById('countdown-overlay');

    this.deliveryHud = document.getElementById('delivery-hud');
    this.deliveryDest = document.getElementById('delivery-dest');
    this.deliveryTimerText = document.getElementById('delivery-timer');

    // Minimap canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Modals
    this.garageModal = document.getElementById('garage-modal');
    this.fullmapModal = document.getElementById('fullmap-modal');
    this.raceSelectModal = document.getElementById('race-select-modal');
    this.helpModal = document.getElementById('help-modal');

    this.fullmapCanvas = document.getElementById('fullmap-canvas');
    this.fullmapCtx = this.fullmapCanvas ? this.fullmapCanvas.getContext('2d') : null;

    this.unlockedCars = new Set(['hatch']);
    this.bindEvents();
  }

  bindEvents() {
    // Menu buttons
    document.getElementById('btn-garage')?.addEventListener('click', () => this.openGarage());
    document.getElementById('btn-map')?.addEventListener('click', () => this.openFullMap());
    document.getElementById('btn-races')?.addEventListener('click', () => this.openRaceSelect());
    document.getElementById('btn-delivery')?.addEventListener('click', () => {
      this.game.missionManager.startDeliveryMission(this.game.player);
      this.showNotification('EXPRESS DELIVERY STARTED!', '#facc15');
    });
    document.getElementById('btn-daynight')?.addEventListener('click', () => {
      this.game.lightingManager.toggleDayNight();
    });
    document.getElementById('btn-audio')?.addEventListener('click', () => {
      const isMuted = this.game.audioEngine.toggleMute();
      document.getElementById('btn-audio').textContent = isMuted ? '🔇 MUTED' : '🔊 AUDIO';
    });
    document.getElementById('btn-radio')?.addEventListener('click', () => {
      const isPlaying = this.game.audioEngine.toggleMusic();
      document.getElementById('btn-radio').textContent = isPlaying ? '📻 RADIO: ON' : '📻 RADIO: OFF';
    });
    document.getElementById('btn-help')?.addEventListener('click', () => {
      this.helpModal.classList.toggle('hidden');
    });

    // Close buttons for modals
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    // Setup touch controls for mobile
    this.setupTouchControls();
  }

  setupTouchControls() {
    const bindTouch = (id, controlKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.game.controls[controlKey] = true;
        this.game.audioEngine.resume();
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.game.controls[controlKey] = false;
      }, { passive: false });
      el.addEventListener('mousedown', () => {
        this.game.controls[controlKey] = true;
        this.game.audioEngine.resume();
      });
      el.addEventListener('mouseup', () => {
        this.game.controls[controlKey] = false;
      });
    };

    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-gas', 'throttle');
    bindTouch('touch-brake', 'brake');
    bindTouch('touch-drift', 'handbrake');
    bindTouch('touch-nitro', 'nitro');
  }

  update(player, missionManager, city, dt) {
    // 1. Digital Speed (convert px/s to km/h)
    const kmh = Math.round(Math.abs(player.speed) * 0.36);
    if (this.speedText) this.speedText.textContent = kmh;
    if (this.gearText) this.gearText.textContent = player.speed < -5 ? 'R' : player.gear;

    // 2. RPM & Nitro Bars
    if (this.rpmBar) {
      const rpmPercent = Math.min(100, (player.rpm / 8000) * 100);
      this.rpmBar.style.width = `${rpmPercent}%`;
    }
    if (this.nitroBar) {
      const nitroPercent = (player.nitro / player.maxNitro) * 100;
      this.nitroBar.style.width = `${nitroPercent}%`;
    }
    if (this.healthBar) {
      const healthPercent = (player.health / player.maxHealth) * 100;
      this.healthBar.style.width = `${healthPercent}%`;
      this.healthBar.style.backgroundColor = healthPercent < 30 ? '#ef4444' : (healthPercent < 60 ? '#f59e0b' : '#10b981');
    }

    // 3. Cash
    if (this.cashText) {
      this.cashText.textContent = `$${player.cash.toLocaleString()}`;
    }

    // 4. District Banner
    const currentDist = city.getDistrictAt(player.x, player.y);
    if (this.districtName && this.districtDesc) {
      this.districtName.textContent = currentDist.name;
      this.districtName.style.color = currentDist.color || '#00f0ff';
      this.districtDesc.textContent = currentDist.desc;
    }

    // 5. Drift HUD
    if (this.driftHud) {
      if (player.driftScore > 0) {
        this.driftHud.classList.remove('hidden');
        if (this.driftScoreText) this.driftScoreText.textContent = Math.round(player.driftScore);
        if (this.driftMultiplierText) this.driftMultiplierText.textContent = `x${player.driftCombo.toFixed(1)}`;
      } else {
        this.driftHud.classList.add('hidden');
      }
    }

    // 6. Wanted Level Stars
    if (this.wantedContainer) {
      let starsHtml = '';
      for (let s = 1; s <= 5; s++) {
        const active = s <= missionManager.wantedLevel;
        starsHtml += `<span class="star ${active ? 'active glow-star' : 'inactive'}">★</span>`;
      }
      this.wantedContainer.innerHTML = starsHtml;
    }

    // 7. Race Mode HUD
    if (this.raceHud) {
      if (missionManager.currentMode === 'race' && missionManager.activeTrack) {
        this.raceHud.classList.remove('hidden');
        if (this.racePosition) {
          const pos = missionManager.playerPosition;
          const suffix = pos === 1 ? 'ST' : (pos === 2 ? 'ND' : (pos === 3 ? 'RD' : 'TH'));
          this.racePosition.textContent = `${pos}${suffix} / 4`;
        }
        if (this.raceLap) {
          this.raceLap.textContent = `LAP ${Math.min(missionManager.currentLap, missionManager.totalLaps)} / ${missionManager.totalLaps}`;
        }
        if (this.raceTimer) {
          const mins = Math.floor(missionManager.raceTime / 60);
          const secs = (missionManager.raceTime % 60).toFixed(2);
          this.raceTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
        }

        // Countdown
        if (this.countdownOverlay) {
          if (missionManager.countdown > 0) {
            this.countdownOverlay.classList.remove('hidden');
            const countNum = Math.ceil(missionManager.countdown);
            this.countdownOverlay.textContent = countNum > 3 ? '3' : (countNum > 0 ? countNum : 'GO!');
          } else {
            this.countdownOverlay.classList.add('hidden');
          }
        }
      } else {
        this.raceHud.classList.add('hidden');
        if (this.countdownOverlay) this.countdownOverlay.classList.add('hidden');
      }
    }

    // 8. Delivery Mode HUD
    if (this.deliveryHud) {
      if (missionManager.currentMode === 'delivery' && missionManager.activeDelivery) {
        this.deliveryHud.classList.remove('hidden');
        if (this.deliveryDest) this.deliveryDest.textContent = missionManager.activeDelivery.title;
        if (this.deliveryTimerText) {
          const t = Math.max(0, Math.ceil(missionManager.deliveryTimer));
          this.deliveryTimerText.textContent = `00:${t.toString().padStart(2, '0')}`;
          this.deliveryTimerText.style.color = t < 10 ? '#ef4444' : '#facc15';
        }
      } else {
        this.deliveryHud.classList.add('hidden');
      }
    }

    // 9. Draw Minimap
    this.drawMinimap(player, city, missionManager, this.game.trafficManager);
  }

  drawMinimap(player, city, missionManager, trafficManager) {
    const ctx = this.minimapCtx;
    const size = this.minimapCanvas.width;
    const center = size / 2;
    const scale = size / 2200; // Local radar scale (~2200px view range)

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Rotate with player heading or keep north-up
    ctx.translate(center, center);

    // Draw Roads in local range
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    for (const r of city.roads) {
      const rx1 = (r.x1 - player.x) * scale;
      const ry1 = (r.y1 - player.y) * scale;
      const rx2 = (r.x2 - player.x) * scale;
      const ry2 = (r.y2 - player.y) * scale;
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.stroke();
    }

    // Draw Civilian traffic (small gray dots)
    ctx.fillStyle = '#94a3b8';
    for (const v of trafficManager.vehicles) {
      const vx = (v.x - player.x) * scale;
      const vy = (v.y - player.y) * scale;
      if (Math.abs(vx) < center && Math.abs(vy) < center) {
        ctx.fillRect(vx - 2, vy - 2, 4, 4);
      }
    }

    // Draw Police cruisers (flashing blue/red dots)
    for (const cop of trafficManager.policeUnits) {
      const cx = (cop.x - player.x) * scale;
      const cy = (cop.y - player.y) * scale;
      if (Math.abs(cx) < center && Math.abs(cy) < center) {
        ctx.fillStyle = Math.floor(Date.now() * 0.008) % 2 === 0 ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw AI Racers (purple dots)
    ctx.fillStyle = '#a855f7';
    for (const r of trafficManager.aiRacers) {
      const rx = (r.x - player.x) * scale;
      const ry = (r.y - player.y) * scale;
      if (Math.abs(rx) < center && Math.abs(ry) < center) {
        ctx.beginPath();
        ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Checkpoint / Delivery Target Blip
    let targetX = null, targetY = null, blipCol = '#00f0ff';
    if (missionManager.currentMode === 'race' && missionManager.activeTrack) {
      const cp = missionManager.activeTrack.checkpoints[missionManager.currentCpIndex];
      targetX = cp.x; targetY = cp.y; blipCol = '#00f0ff';
    } else if (missionManager.currentMode === 'delivery' && missionManager.activeDelivery) {
      targetX = missionManager.activeDelivery.x; targetY = missionManager.activeDelivery.y; blipCol = '#facc15';
    }

    if (targetX !== null) {
      let tx = (targetX - player.x) * scale;
      let ty = (targetY - player.y) * scale;

      // Clamp to minimap radar border if offscreen
      const dist = Math.hypot(tx, ty);
      const maxR = center - 8;
      if (dist > maxR) {
        tx = (tx / dist) * maxR;
        ty = (ty / dist) * maxR;
      }

      ctx.fillStyle = blipCol;
      ctx.shadowColor = blipCol;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Player Car Icon (Cyan Arrow in center)
    ctx.rotate(player.angle);
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  openGarage() {
    this.closeAllModals();
    this.garageModal.classList.remove('hidden');
    this.renderGarageCatalog();
  }

  renderGarageCatalog() {
    const container = document.getElementById('garage-car-list');
    if (!container) return;

    const player = this.game.player;
    container.innerHTML = '';

    for (const car of CAR_MODELS) {
      const isOwned = this.unlockedCars.has(car.id);
      const isSelected = player.modelId === car.id;

      const card = document.createElement('div');
      card.className = `car-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="car-card-header">
          <span class="car-title">${car.name}</span>
          <span class="car-category">${car.category}</span>
        </div>
        <div class="car-preview" style="background: linear-gradient(135deg, ${car.bodyColor}33, #090d16)">
          <div class="car-mini-sprite" style="background-color: ${car.bodyColor}; box-shadow: 0 0 12px ${car.neonColor}"></div>
        </div>
        <div class="car-stats">
          <div>Top Speed: <b>${car.topSpeed} km/h</b></div>
          <div>Accel: <b>${car.accel}</b></div>
          <div>Handling: <b>${car.handling}</b></div>
          <div>Drift: <b>${car.driftMultiplier}x</b></div>
        </div>
        <div class="car-action">
          ${isSelected ? '<button class="btn btn-active" disabled>EQUIPPED</button>' :
            (isOwned ? `<button class="btn btn-select" data-id="${car.id}">DRIVE</button>` :
            `<button class="btn btn-buy" data-id="${car.id}" data-price="${car.price}">BUY $${car.price.toLocaleString()}</button>`)}
        </div>
      `;

      card.querySelector('.btn-select')?.addEventListener('click', () => {
        player.setModel(car.id);
        this.renderGarageCatalog();
        this.showNotification(`SWITCHED TO ${car.name}!`, '#00f0ff');
      });

      card.querySelector('.btn-buy')?.addEventListener('click', () => {
        if (player.cash >= car.price) {
          player.cash -= car.price;
          this.unlockedCars.add(car.id);
          player.setModel(car.id);
          this.game.audioEngine.playCash();
          this.renderGarageCatalog();
          this.showNotification(`PURCHASED ${car.name}!`, '#10b981');
        } else {
          this.showNotification('NOT ENOUGH CASH!', '#ef4444');
        }
      });

      container.appendChild(card);
    }

    // Render upgrade slots
    this.renderUpgrades();
  }

  renderUpgrades() {
    const upgContainer = document.getElementById('garage-upgrades');
    if (!upgContainer) return;

    const player = this.game.player;
    const upgradeTypes = [
      { key: 'engine', name: 'TURBO ENGINE', cost: 1000 },
      { key: 'handling', name: 'RACING TIRES', cost: 800 },
      { key: 'nitro', name: 'STAGE-2 NOS', cost: 1200 },
      { key: 'armor', name: 'REINFORCED CHASSIS', cost: 900 }
    ];

    upgContainer.innerHTML = '';
    for (const upg of upgradeTypes) {
      const lvl = player.upgrades[upg.key] || 0;
      const isMax = lvl >= 4;
      const cost = Math.floor(upg.cost * (1 + lvl * 0.75));

      const row = document.createElement('div');
      row.className = 'upgrade-row';
      row.innerHTML = `
        <div class="upgrade-info">
          <span>${upg.name}</span>
          <span class="lvl-badge">LVL ${lvl}/4</span>
        </div>
        <button class="btn btn-upgrade ${isMax ? 'disabled' : ''}" ${isMax ? 'disabled' : ''}>
          ${isMax ? 'MAX' : `UPGRADE $${cost}`}
        </button>
      `;

      row.querySelector('.btn-upgrade')?.addEventListener('click', () => {
        if (!isMax) {
          if (player.cash >= cost) {
            player.cash -= cost;
            player.upgrades[upg.key] = lvl + 1;
            player.applyUpgrades();
            this.game.audioEngine.playCash();
            this.renderUpgrades();
            this.showNotification(`${upg.name} UPGRADED TO LVL ${lvl + 1}!`, '#10b981');
          } else {
            this.showNotification('NOT ENOUGH CASH FOR UPGRADE!', '#ef4444');
          }
        }
      });

      upgContainer.appendChild(row);
    }
  }

  openRaceSelect() {
    this.closeAllModals();
    this.raceSelectModal.classList.remove('hidden');

    const container = document.getElementById('race-tracks-list');
    if (!container) return;
    container.innerHTML = '';

    for (const track of RACE_TRACKS) {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <div class="track-header">
          <span class="track-name">${track.name}</span>
          <span class="track-district">${track.district}</span>
        </div>
        <div class="track-info">
          <div>Laps: <b>${track.laps}</b></div>
          <div>Prize: <b style="color: #10b981">$${track.reward.toLocaleString()}</b></div>
        </div>
        <button class="btn btn-start-race" data-id="${track.id}">START RACE</button>
      `;

      card.querySelector('.btn-start-race')?.addEventListener('click', () => {
        this.closeAllModals();
        this.game.missionManager.startRace(track.id, this.game.player, this.game.trafficManager);
      });

      container.appendChild(card);
    }
  }

  openFullMap() {
    this.closeAllModals();
    this.fullmapModal.classList.remove('hidden');
    this.drawFullMap();
  }

  drawFullMap() {
    if (!this.fullmapCtx) return;
    const ctx = this.fullmapCtx;
    const size = this.fullmapCanvas.width;
    const city = this.game.city;
    const player = this.game.player;
    const scale = size / city.width;

    ctx.clearRect(0, 0, size, size);

    // City terrain
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Districts colored bounding zones
    for (const d of city.districts) {
      ctx.fillStyle = `${d.color}15`;
      ctx.fillRect(d.x * scale, d.y * scale, d.w * scale, d.h * scale);
      ctx.strokeStyle = `${d.color}66`;
      ctx.lineWidth = 1;
      ctx.strokeRect(d.x * scale, d.y * scale, d.w * scale, d.h * scale);

      ctx.fillStyle = d.color;
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.fillText(d.name, (d.x + 10) * scale, (d.y + 20) * scale);
    }

    // Water
    for (const wb of city.waterBodies) {
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(wb.x * scale, wb.y * scale, wb.w * scale, wb.h * scale);
    }

    // Roads
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    for (const r of city.roads) {
      ctx.beginPath();
      ctx.moveTo(r.x1 * scale, r.y1 * scale);
      ctx.lineTo(r.x2 * scale, r.y2 * scale);
      ctx.stroke();
    }

    // Checkpoints of current race if active
    if (this.game.missionManager.currentMode === 'race' && this.game.missionManager.activeTrack) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cps = this.game.missionManager.activeTrack.checkpoints;
      for (let i = 0; i < cps.length; i++) {
        const cp = cps[i];
        if (i === 0) ctx.moveTo(cp.x * scale, cp.y * scale);
        else ctx.lineTo(cp.x * scale, cp.y * scale);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Player location beacon
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(player.x * scale, player.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  closeAllModals() {
    this.garageModal?.classList.add('hidden');
    this.fullmapModal?.classList.add('hidden');
    this.raceSelectModal?.classList.add('hidden');
    this.helpModal?.classList.add('hidden');
  }

  showNotification(msg, color = '#00f0ff') {
    const notif = document.getElementById('notification-toast');
    if (!notif) return;
    notif.textContent = msg;
    notif.style.borderColor = color;
    notif.style.color = color;
    notif.classList.remove('hidden');
    setTimeout(() => {
      notif.classList.add('hidden');
    }, 2800);
  }
}
