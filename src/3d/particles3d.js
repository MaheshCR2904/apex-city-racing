// particles3d.js - 3D Particle Systems: Tire Smoke, Nitro Flames, Sparks & Checkpoint Gate Hoops

import * as THREE from '../lib/three.module.js';
import { SCALE } from './city3d.js';

export class Particles3D {
  constructor(scene, cityData) {
    this.scene = scene;
    this.cityData = cityData;

    this.particles = [];
    this.particlePool = new THREE.Group();
    this.scene.add(this.particlePool);

    // Shared smoke geometry & material
    this.smokeGeo = new THREE.DodecahedronGeometry(0.8, 1);
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.45
    });

    // Spark geometry & material
    this.sparkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // 3D Race Checkpoint Ring
    this.checkpointRingGeo = new THREE.TorusGeometry(14, 1.0, 16, 32);
    this.checkpointRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true
    });
    this.checkpointRingMesh = new THREE.Mesh(this.checkpointRingGeo, this.checkpointRingMat);
    this.checkpointRingMesh.visible = false;
    this.scene.add(this.checkpointRingMesh);

    // 3D Delivery Beacon Cylinder
    const beaconGeo = new THREE.CylinderGeometry(12, 12, 40, 24, 1, true);
    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.deliveryBeaconMesh = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.deliveryBeaconMesh.visible = false;
    this.scene.add(this.deliveryBeaconMesh);

    // 3D Nitro Exhaust Flames (mounted to player car)
    this.nitroFlameGroup = new THREE.Group();
    const flameGeo = new THREE.ConeGeometry(0.5, 3.2, 12);
    flameGeo.rotateX(-Math.PI / 2); // points backward

    const flameMatCore = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const flameMatOuter = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.75 });

    this.flameLeftCore = new THREE.Mesh(flameGeo, flameMatCore);
    this.flameRightCore = new THREE.Mesh(flameGeo, flameMatCore);
    this.flameLeftOuter = new THREE.Mesh(flameGeo, flameMatOuter);
    this.flameRightOuter = new THREE.Mesh(flameGeo, flameMatOuter);

    this.flameLeftCore.position.set(-1.1, 0.75, -4.2);
    this.flameRightCore.position.set(1.1, 0.75, -4.2);
    this.flameLeftOuter.position.set(-1.1, 0.75, -4.2);
    this.flameRightOuter.position.set(1.1, 0.75, -4.2);
    this.flameLeftOuter.scale.set(1.4, 1.4, 1.3);
    this.flameRightOuter.scale.set(1.4, 1.4, 1.3);

    this.nitroFlameGroup.add(this.flameLeftCore, this.flameRightCore, this.flameLeftOuter, this.flameRightOuter);
    this.nitroFlameGroup.visible = false;
    this.scene.add(this.nitroFlameGroup);
  }

  to3DX(x) {
    return (x - this.cityData.width / 2) * SCALE;
  }

  to3DZ(y) {
    return (y - this.cityData.height / 2) * SCALE;
  }

  createTireSmoke(x, y, z = 0.5) {
    if (this.particles.length > 90) return;

    const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    mesh.position.set(x, z, y);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    const p = {
      mesh,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      scale: 0.7,
      maxScale: 3.2,
      opacity: 0.45,
      life: 0.65,
      maxLife: 0.65
    };

    this.particlePool.add(mesh);
    this.particles.push(p);
  }

  createCollisionSparks(x, y, z = 1.0, count = 8) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
      mesh.position.set(x, z, y);

      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 35;
      const p = {
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 8 + Math.random() * 15,
        vz: Math.sin(angle) * speed,
        scale: 1.0,
        life: 0.35,
        maxLife: 0.35
      };

      this.particlePool.add(mesh);
      this.particles.push(p);
    }
  }

  update(dt, player, car3D, missionManager) {
    // 1. Tire smoke when drifting or burnout
    if ((player.isDrifting || player.isBurnout) && !player.isAirborne) {
      const carPos = car3D.root.position;
      const rotY = car3D.root.rotation.y;
      const backX = carPos.x - Math.sin(rotY) * 3.5;
      const backZ = carPos.z - Math.cos(rotY) * 3.5;

      this.createTireSmoke(backX + (Math.random() - 0.5) * 2.5, backZ + (Math.random() - 0.5) * 2.5);
      if (player.isBurnout) {
        this.createTireSmoke(backX + (Math.random() - 0.5) * 3.0, backZ + (Math.random() - 0.5) * 3.0);
      }
    }

    // 2. Nitro Flame updates
    if (player.isNitroActive) {
      this.nitroFlameGroup.visible = true;
      this.nitroFlameGroup.position.copy(car3D.root.position);
      this.nitroFlameGroup.rotation.y = car3D.root.rotation.y;

      const flicker = 0.8 + Math.random() * 0.4;
      this.flameLeftCore.scale.set(flicker, flicker, flicker * 1.3);
      this.flameRightCore.scale.set(flicker, flicker, flicker * 1.3);
    } else {
      this.nitroFlameGroup.visible = false;
    }

    // 3. Update dynamic particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particlePool.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      const progress = 1.0 - p.life / p.maxLife;
      if (p.opacity !== undefined) {
        p.mesh.material.opacity = p.opacity * (p.life / p.maxLife);
        const s = p.scale + (p.maxScale - p.scale) * progress;
        p.mesh.scale.set(s, s, s);
      } else {
        p.vy -= 45 * dt; // gravity on sparks
      }
    }

    // 4. Update 3D Race Checkpoint Ring
    if (missionManager.currentMode === 'race' && missionManager.activeTrack && !missionManager.isRaceFinished) {
      const cp = missionManager.activeTrack.checkpoints[missionManager.currentCpIndex];
      this.checkpointRingMesh.visible = true;
      this.checkpointRingMesh.position.set(this.to3DX(cp.x), 8, this.to3DZ(cp.y));
      this.checkpointRingMesh.rotation.y += dt * 1.5;
    } else {
      this.checkpointRingMesh.visible = false;
    }

    // 5. Update 3D Delivery Beacon
    if (missionManager.currentMode === 'delivery' && missionManager.activeDelivery) {
      const d = missionManager.activeDelivery;
      this.deliveryBeaconMesh.visible = true;
      this.deliveryBeaconMesh.position.set(this.to3DX(d.x), 20, this.to3DZ(d.y));
      this.deliveryBeaconMesh.rotation.y += dt * 0.8;
    } else {
      this.deliveryBeaconMesh.visible = false;
    }
  }
}
