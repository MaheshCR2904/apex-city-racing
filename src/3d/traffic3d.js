// traffic3d.js - 3D Civilian Vehicles, Police Interceptors & AI Racers Mesh Manager

import * as THREE from '../lib/three.module.js';
import { SCALE } from './city3d.js';

export class Traffic3D {
  constructor(scene, trafficManager, cityData) {
    this.scene = scene;
    this.trafficManager = trafficManager;
    this.cityData = cityData;

    this.vehicleMeshes = new Map(); // v -> 3D Group
    this.policeMeshes = new Map();  // cop -> 3D Group
    this.racerMeshes = new Map();   // racer -> 3D Group

    this.materials = {
      window: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      taillight: new THREE.MeshBasicMaterial({ color: 0xef4444 })
    };
  }

  to3DX(x) {
    return (x - this.cityData.width / 2) * SCALE;
  }

  to3DZ(y) {
    return (y - this.cityData.height / 2) * SCALE;
  }

  update(dt) {
    this.updateCivilianCars();
    this.updatePoliceCars();
    this.updateAIRacers();
  }

  updateCivilianCars() {
    const activeSet = new Set(this.trafficManager.vehicles);

    // Remove despawned cars
    for (const [v, group] of this.vehicleMeshes.entries()) {
      if (!activeSet.has(v)) {
        this.scene.remove(group);
        this.vehicleMeshes.delete(v);
      }
    }

    // Add or update active cars
    for (const v of this.trafficManager.vehicles) {
      let group = this.vehicleMeshes.get(v);
      if (!group) {
        group = this.createCivilianMesh(v);
        this.vehicleMeshes.set(v, group);
        this.scene.add(group);
      }

      group.position.set(this.to3DX(v.x), 0, this.to3DZ(v.y));
      group.rotation.y = -v.angle + Math.PI / 2;
    }
  }

  updatePoliceCars() {
    const activeSet = new Set(this.trafficManager.policeUnits);

    for (const [cop, group] of this.policeMeshes.entries()) {
      if (!activeSet.has(cop)) {
        this.scene.remove(group);
        this.policeMeshes.delete(cop);
      }
    }

    for (const cop of this.trafficManager.policeUnits) {
      let group = this.policeMeshes.get(cop);
      if (!group) {
        group = this.createPoliceMesh(cop);
        this.policeMeshes.set(cop, group);
        this.scene.add(group);
      }

      group.position.set(this.to3DX(cop.x), 0, this.to3DZ(cop.y));
      group.rotation.y = -cop.angle + Math.PI / 2;

      // Flash Police Siren Lightbar
      const isRed = Math.floor(cop.sirenTimer * 2) % 2 === 0;
      if (group.userData.lightMat) {
        group.userData.lightMat.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
      }
    }
  }

  updateAIRacers() {
    const activeSet = new Set(this.trafficManager.aiRacers);

    for (const [racer, group] of this.racerMeshes.entries()) {
      if (!activeSet.has(racer)) {
        this.scene.remove(group);
        this.racerMeshes.delete(racer);
      }
    }

    for (const racer of this.trafficManager.aiRacers) {
      let group = this.racerMeshes.get(racer);
      if (!group) {
        group = this.createRacerMesh(racer);
        this.racerMeshes.set(racer, group);
        this.scene.add(group);
      }

      group.position.set(this.to3DX(racer.x), 0, this.to3DZ(racer.y));
      group.rotation.y = -racer.angle + Math.PI / 2;
    }
  }

  createCivilianMesh(v) {
    const group = new THREE.Group();
    const w = v.width * SCALE * 0.45;
    const l = v.length * SCALE * 0.45;
    const h = v.isBus ? 3.4 : (v.isTaxi ? 2.1 : 2.0);

    // Main Body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.55, l);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(v.color),
      roughness: 0.4,
      metalness: 0.4
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, h * 0.35, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Windshield & Cabin
    const cabinGeo = new THREE.BoxGeometry(w * 0.88, h * 0.5, l * 0.55);
    const cabinMesh = new THREE.Mesh(cabinGeo, this.materials.window);
    cabinMesh.position.set(0, h * 0.72, -l * 0.05);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // Taxi Checker Sign
    if (v.isTaxi) {
      const taxiGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
      const taxiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const taxiMesh = new THREE.Mesh(taxiGeo, taxiMat);
      taxiMesh.position.set(0, h * 1.05, -l * 0.05);
      group.add(taxiMesh);
    }

    // Wheels
    this.addStandardWheels(group, w, l);
    return group;
  }

  createPoliceMesh(cop) {
    const group = new THREE.Group();
    const w = 4.0;
    const l = 7.8;
    const h = 2.2;

    // Body (Black & White)
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.55, l);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.4 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, h * 0.35, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // White door panel
    const doorGeo = new THREE.BoxGeometry(w * 1.02, h * 0.4, l * 0.35);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(0, h * 0.35, 0);
    group.add(doorMesh);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(w * 0.86, h * 0.5, l * 0.55);
    const cabinMesh = new THREE.Mesh(cabinGeo, this.materials.window);
    cabinMesh.position.set(0, h * 0.72, -l * 0.05);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // Flashing Siren Lightbar
    const barGeo = new THREE.BoxGeometry(2.4, 0.4, 0.7);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const barMesh = new THREE.Mesh(barGeo, lightMat);
    barMesh.position.set(0, h * 1.05, -l * 0.05);
    group.add(barMesh);
    group.userData.lightMat = lightMat;

    this.addStandardWheels(group, w, l);
    return group;
  }

  createRacerMesh(racer) {
    const group = new THREE.Group();
    const w = 4.2;
    const l = 8.0;
    const h = 2.0;

    // Body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.5, l);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(racer.color),
      roughness: 0.3,
      metalness: 0.7
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, h * 0.35, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(w * 0.85, h * 0.48, l * 0.52);
    const cabinMesh = new THREE.Mesh(cabinGeo, this.materials.window);
    cabinMesh.position.set(0, h * 0.7, -l * 0.05);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // Rear Wing
    const wingGeo = new THREE.BoxGeometry(w * 0.95, 0.2, 0.9);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.set(0, 2.5, -l * 0.45);
    group.add(wingMesh);

    this.addStandardWheels(group, w, l);
    return group;
  }

  addStandardWheels(group, w, l) {
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.45, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const positions = [
      [-w * 0.48, 0.65, l * 0.32],
      [w * 0.48, 0.65, l * 0.32],
      [-w * 0.48, 0.65, -l * 0.32],
      [w * 0.48, 0.65, -l * 0.32]
    ];

    for (const pos of positions) {
      const wheelMesh = new THREE.Mesh(wheelGeo, this.materials.wheel);
      wheelMesh.position.set(...pos);
      group.add(wheelMesh);
    }
  }
}
