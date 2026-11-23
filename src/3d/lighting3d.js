// lighting3d.js - Dynamic 3D Sky Dome, Sun/Moon Trajectory, Atmospheric Fog & Shadows

import * as THREE from '../lib/three.module.js';

export class Lighting3D {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.timeOfDay = 0.85; // Default Night (cyberpunk neon vibe)
    this.timeSpeed = 0.008;
    this.manualOverride = false;

    // Enable shadows in Three.js
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 1. Hemispheric Ambient Light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.4);
    this.hemiLight.position.set(0, 500, 0);
    this.scene.add(this.hemiLight);

    // 2. Directional Sun/Moon Light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(200, 400, 200);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 1200;

    const d = 250;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;

    this.scene.add(this.dirLight);

    // 3. Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.0012);

    // 4. Large Sky Dome
    this.buildSkyDome();
  }

  buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(2500, 32, 24);
    this.skyMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);
  }

  toggleDayNight() {
    this.manualOverride = true;
    this.timeOfDay = this.timeOfDay > 0.4 ? 0.0 : 0.85;
  }

  update(dt, playerPos) {
    if (!this.manualOverride) {
      this.timeOfDay = (this.timeOfDay + this.timeSpeed * dt) % 1.0;
    }

    // Keep sun shadow frustum centered near player
    if (playerPos) {
      this.dirLight.position.set(playerPos.x + 120, 260, playerPos.z + 120);
      this.dirLight.target.position.copy(playerPos);
      this.dirLight.target.updateMatrixWorld();
    }

    // Colors according to time of day
    let skyCol = 0x090d16;
    let sunCol = 0xffffff;
    let sunIntensity = 1.0;
    let hemiIntensity = 0.35;

    if (this.timeOfDay < 0.25) {
      // Day (Bright Noon)
      skyCol = 0x38bdf8;
      sunCol = 0xfffaed;
      sunIntensity = 1.4;
      hemiIntensity = 0.55;
    } else if (this.timeOfDay < 0.45) {
      // Sunset / Golden Hour
      skyCol = 0xf97316;
      sunCol = 0xfb923c;
      sunIntensity = 0.9;
      hemiIntensity = 0.4;
    } else if (this.timeOfDay < 0.85) {
      // Deep Cyber Night
      skyCol = 0x050814;
      sunCol = 0x38bdf8; // Moonlight
      sunIntensity = 0.28;
      hemiIntensity = 0.18;
    } else {
      // Sunrise
      skyCol = 0xa855f7;
      sunCol = 0xfbcfe8;
      sunIntensity = 0.8;
      hemiIntensity = 0.35;
    }

    this.skyMat.color.setHex(skyCol);
    this.scene.fog.color.setHex(skyCol);
    this.renderer.setClearColor(skyCol);

    this.dirLight.color.setHex(sunCol);
    this.dirLight.intensity = sunIntensity;
    this.hemiLight.intensity = hemiIntensity;
  }
}
