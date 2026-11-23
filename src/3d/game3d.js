// game3d.js - Main 3D Game Loop, Three.js WebGL Engine, Subsystems Coordination & HUD Binding

import * as THREE from '/node_modules/three/build/three.module.js';

import { City } from '../city.js';
import { Car } from '../car.js';
import { TrafficManager } from '../traffic.js';
import { MissionManager } from '../races.js';
import { ParticleSystem } from '../particles.js';
import { AudioEngine } from '../audio.js';
import { UIManager } from '../ui.js';

import { City3D } from './city3d.js';
import { Car3D } from './car3d.js';
import { Camera3D } from './camera3d.js';
import { Traffic3D } from './traffic3d.js';
import { Lighting3D } from './lighting3d.js';
import { Particles3D } from './particles3d.js';

export class Game3D {
  constructor() {
    this.canvas = document.getElementById('game-canvas');

    // 1. Three.js Scene & WebGL Renderer
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 2. Camera
    this.camera3D = new Camera3D(window.innerWidth / window.innerHeight);

    // 3. Core Physics & Simulation Subsystems
    this.city = new City();
    this.player = new Car('hatch', 2600, 2600, 0); // Start in central avenue
    this.trafficManager = new TrafficManager(this.city);
    this.missionManager = new MissionManager();
    this.particleSystem = new ParticleSystem(this.city.width, this.city.height);
    this.audioEngine = new AudioEngine();
    this.uiManager = new UIManager(this);

    // 4. 3D World Meshes & Visual Subsystems
    this.city3D = new City3D(this.scene, this.city);
    this.car3D = new Car3D(this.scene, this.player);
    this.traffic3D = new Traffic3D(this.scene, this.trafficManager, this.city);
    this.lighting3D = new Lighting3D(this.scene, this.renderer);
    this.particles3D = new Particles3D(this.scene, this.city);

    // Controls
    this.controls = {
      throttle: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false
    };

    this.lastTime = performance.now();
    this.isPaused = false;

    this.setupWindow();
    this.setupKeyboard();
    this.bindAudioActivation();
    this.setupCameraBtn();

    // Start 60 FPS Render Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  setupWindow() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.camera3D.resize(w / h);
    });
  }

  setupCameraBtn() {
    const camBtn = document.getElementById('btn-camera');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        const mode = this.camera3D.toggleView();
        camBtn.textContent = `📷 CAM: ${mode}`;
        this.uiManager.showNotification(`CAMERA: ${mode}`, '#00f0ff');
      });
    }
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
      if (key === 'c') {
        const mode = this.camera3D.toggleView();
        const btn = document.getElementById('btn-camera');
        if (btn) btn.textContent = `📷 CAM: ${mode}`;
        this.uiManager.showNotification(`CAMERA: ${mode}`, '#00f0ff');
      }
      if (key === 'h') this.audioEngine.playHorn();
      if (key === 'm') this.uiManager.openFullMap();
      if (key === 'g') this.uiManager.openGarage();
      if (key === 'r') this.uiManager.openRaceSelect();
      if (key === 'l') {
        this.player.headlights = !this.player.headlights;
        if (this.car3D.headlightLeft && this.car3D.headlightRight) {
          this.car3D.headlightLeft.visible = this.player.headlights;
          this.car3D.headlightRight.visible = this.player.headlights;
        }
      }
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
    // 1. Simulation & Traffic Cycles
    this.city.update(dt);

    // 2. Player Vehicle Kinematics
    this.player.update(dt, this.controls, this.city, this.particleSystem, this.audioEngine);

    // 3. Ambient Traffic, Police Pursuit, AI Racers
    this.trafficManager.update(dt, this.player, this.missionManager.wantedLevel, this.particleSystem, this.audioEngine);

    // 4. Races, Checkpoints & Delivery Missions
    this.missionManager.update(dt, this.player, this.trafficManager, this.particleSystem, this.audioEngine);

    // 5. Speed Cameras
    for (const trap of this.city.speedTraps) {
      const dist = Math.hypot(this.player.x - trap.x, this.player.y - trap.y);
      const kmh = Math.abs(this.player.speed) * 0.36;
      if (dist < trap.radius && kmh > trap.targetSpeed) {
        if (!trap.lastTriggered || performance.now() - trap.lastTriggered > 4000) {
          trap.lastTriggered = performance.now();
          this.missionManager.addHeat(1);
          this.particleSystem.triggerScreenShake(0.25, 7);
          this.particleSystem.createFloatingText(trap.x, trap.y - 30, `RADAR FLASH! ${Math.round(kmh)} KM/H (+1 HEAT)`, '#ef4444');
          this.audioEngine.playWhoosh();
        }
      }
    }

    // 6. 3D Meshes & Environment Updates
    this.city3D.update(dt);
    this.car3D.update(dt, this.city);
    this.traffic3D.update(dt);
    this.particles3D.update(dt, this.player, this.car3D, this.missionManager);
    this.lighting3D.update(dt, this.car3D.root.position);

    // 7. 3D Camera Follow
    this.camera3D.update(dt, this.player, this.car3D, this.particleSystem);

    // 8. 2D Particle System for Screen Shake & Floating Texts
    this.particleSystem.update(dt);

    // 9. Procedural Audio Engine Modulation
    this.audioEngine.updateEngine(
      this.player.rpm,
      this.player.isDrifting,
      this.player.isNitroActive,
      this.missionManager.wantedLevel,
      this.player.isPolice
    );

    // 10. Update HUD, Minimap & Gauges
    this.uiManager.update(this.player, this.missionManager, this.city, dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera3D.camera);
  }
}

// Start 3D Game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game3D();
});
