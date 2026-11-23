// main.js - Core Game Orchestrator, Input Controller & High-FPS Render Loop

import { City } from './city.js';
import { Car } from './car.js';
import { Camera } from './camera.js';
import { WorldRenderer } from './renderer.js';
import { TrafficManager } from './traffic.js';
import { MissionManager } from './races.js';
import { ParticleSystem } from './particles.js';
import { LightingManager } from './lighting.js';
import { AudioEngine } from './audio.js';
import { UIManager } from './ui.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Controls state
    this.controls = {
      throttle: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false
    };

    // Initialize subsystems
    this.city = new City();
    this.player = new Car('hatch', 2600, 2600, 0); // Start in central avenue
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.renderer = new WorldRenderer(this.city);
    this.trafficManager = new TrafficManager(this.city);
    this.missionManager = new MissionManager();
    this.particleSystem = new ParticleSystem(this.city.width, this.city.height);
    this.lightingManager = new LightingManager();
    this.audioEngine = new AudioEngine();
    this.uiManager = new UIManager(this);

    this.lastTime = performance.now();
    this.isPaused = false;

    this.setupWindow();
    this.setupKeyboard();
    this.bindAudioActivation();

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  setupWindow() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.scale(dpr, dpr);
      this.camera.resize(window.innerWidth, window.innerHeight);
      this.lightingManager.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resize);
    resize();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.audioEngine.resume();

      if (e.repeat) return;
      const key = e.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') this.controls.throttle = true;
      if (key === 's' || key === 'arrowdown') this.controls.brake = true;
      if (key === 'a' || key === 'arrowleft') this.controls.left = true;
      if (key === 'd' || key === 'arrowright') this.controls.right = true;
      if (key === ' ' || key === 'space') this.controls.handbrake = true;
      if (key === 'shift') this.controls.nitro = true;

      // Shortcuts
      if (key === 'h') this.audioEngine.playHorn();
      if (key === 'm') this.uiManager.openFullMap();
      if (key === 'g') this.uiManager.openGarage();
      if (key === 'r') this.uiManager.openRaceSelect();
      if (key === 'l') this.player.headlights = !this.player.headlights;
      if (key === 'escape') this.uiManager.closeAllModals();
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.controls.throttle = false;
      if (key === 's' || key === 'arrowdown') this.controls.brake = false;
      if (key === 'a' || key === 'arrowleft') this.controls.left = false;
      if (key === 'd' || key === 'arrowright') this.controls.right = false;
      if (key === ' ' || key === 'space') this.controls.handbrake = false;
      if (key === 'shift') this.controls.nitro = false;
    });
  }

  bindAudioActivation() {
    // Web Audio auto-unlock on user interaction
    const unlock = () => {
      this.audioEngine.resume();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.08);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(dt);
      this.render();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 1. Update City & Traffic light cycles
    this.city.update(dt);

    // 2. Update Player vehicle dynamics
    this.player.update(dt, this.controls, this.city, this.particleSystem, this.audioEngine);

    // 3. Update Ambient Traffic & Police & AI Racers
    this.trafficManager.update(dt, this.player, this.missionManager.wantedLevel, this.particleSystem, this.audioEngine);

    // 4. Update Races, Checkpoints & Missions
    this.missionManager.update(dt, this.player, this.trafficManager, this.particleSystem, this.audioEngine);

    // 5. Update Speed Traps triggering heat & flash
    for (const trap of this.city.speedTraps) {
      const dist = Math.hypot(this.player.x - trap.x, this.player.y - trap.y);
      const kmh = Math.abs(this.player.speed) * 0.36;
      if (dist < trap.radius && kmh > trap.targetSpeed) {
        if (!trap.lastTriggered || performance.now() - trap.lastTriggered > 4000) {
          trap.lastTriggered = performance.now();
          this.missionManager.addHeat(1);
          this.particleSystem.triggerScreenShake(0.2, 5);
          this.particleSystem.createFloatingText(trap.x, trap.y - 30, `SPEED TRAP! ${Math.round(kmh)} KM/H (+1 HEAT)`, '#ef4444');
          this.audioEngine.playWhoosh();
        }
      }
    }

    // 6. Update Camera tracking
    this.camera.update(dt, this.player, this.particleSystem);

    // 7. Update Particles & Floating Text
    this.particleSystem.update(dt);

    // 8. Update Day / Night lighting cycle
    this.lightingManager.update(dt);

    // 9. Modulate Audio synthesizer
    this.audioEngine.updateEngine(
      this.player.rpm,
      this.player.isDrifting,
      this.player.isNitroActive,
      this.missionManager.wantedLevel,
      this.player.isPolice,
      this.player.speed,
      this.player.isBurnout,
      this.controls.throttle
    );

    // 10. Update UI HUD
    this.uiManager.update(this.player, this.missionManager, this.city, dt);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 1. Camera transform for world space
    this.camera.applyTransform(ctx);

    // 2. Render terrain, water, roads, sidewalks, markings, props, ramps
    this.renderer.render(ctx, this.camera);

    // 3. Draw tire skidmarks on asphalt
    this.particleSystem.drawSkidmarks(ctx, this.camera);

    // 4. Draw race checkpoint gates / drop zones
    this.missionManager.draw(ctx, this.camera);

    // 5. Draw civilian traffic, police, AI racers
    this.trafficManager.draw(ctx, this.camera);

    // 6. Draw Player Car
    this.player.draw(ctx);

    // 7. Draw Buildings and Trees (cast 2.5D shadows and roofs)
    this.renderer.renderBuildingsAndTrees(ctx, this.camera);

    // 8. Draw dynamic particles (tire smoke, sparks, nitro flames, water, confetti)
    this.particleSystem.drawParticles(ctx, this.camera);

    // Restore camera transform
    this.camera.restoreTransform(ctx);

    // 9. Dynamic Lighting Pass (Darkness veil punched with headlights, street lamps, sirens, neon bloom)
    this.lightingManager.renderLighting(ctx, this.camera, this.player, this.city, this.trafficManager);
  }
}

// Instantiate game
function initGame() {
  if (!window.game) {
    window.game = new Game();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
