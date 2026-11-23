// car3d.js - 3D Car Model with 4 Rotating & Steering Wheels, Suspension Body Roll & Dynamic Lights

import * as THREE from '/node_modules/three/build/three.module.js';
import { SCALE } from './city3d.js';

export class Car3D {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.root = new THREE.Group();
    this.bodyGroup = new THREE.Group(); // Handles suspension roll and pitch
    this.root.add(this.bodyGroup);

    this.wheelMeshes = [];
    this.wheelRotation = 0;
    this.currentModelId = null;

    // Headlight SpotLights
    this.headlightLeft = null;
    this.headlightRight = null;
    this.taillightMaterial = null;
    this.policeLightbar = null;

    this.buildCarModel(player.modelId);
    this.scene.add(this.root);
  }

  buildCarModel(modelId) {
    this.currentModelId = modelId;
    // Clear previous meshes
    while (this.bodyGroup.children.length > 0) {
      this.bodyGroup.remove(this.bodyGroup.children[0]);
    }
    this.wheelMeshes = [];

    const car = this.player;
    const bodyColor = new THREE.Color(car.bodyColor);
    const neonColor = new THREE.Color(car.neonColor);

    // Dimensions in 3D
    const length = car.length * SCALE * 0.45; // ~8 units
    const width = car.width * SCALE * 0.48;   // ~4.2 units
    const height = 2.4;

    // 1. Lower Chassis & Front Splitter
    const chassisGeo = new THREE.BoxGeometry(width, 0.6, length);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
      metalness: 0.2
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.set(0, 0.7, 0);
    chassisMesh.castShadow = true;
    this.bodyGroup.add(chassisMesh);

    // 2. Main Car Body
    const bodyGeo = new THREE.BoxGeometry(width * 0.96, height * 0.55, length * 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.65
    });
    this.mainBodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mainBodyMesh.position.set(0, 1.3, 0);
    this.mainBodyMesh.castShadow = true;
    this.mainBodyMesh.receiveShadow = true;
    this.bodyGroup.add(this.mainBodyMesh);

    // 3. Cockpit Cabin & Windshield
    const cabinLen = length * 0.52;
    const cabinWid = width * 0.84;
    const cabinH = height * 0.52;
    const cabinGeo = new THREE.BoxGeometry(cabinWid, cabinH, cabinLen);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, 1.3 + height * 0.45, -length * 0.05);
    cabinMesh.castShadow = true;
    this.bodyGroup.add(cabinMesh);

    // Roof panel
    const roofGeo = new THREE.BoxGeometry(cabinWid * 0.92, 0.2, cabinLen * 0.9);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(0, 1.3 + height * 0.7, -length * 0.05);
    this.bodyGroup.add(roofMesh);

    // 4. Rear Aerodynamic Spoiler Wing
    const spoilerW = width * 0.95;
    const wingGeo = new THREE.BoxGeometry(spoilerW, 0.2, 1.0);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.set(0, 2.7, -length * 0.45);
    wingMesh.castShadow = true;
    this.bodyGroup.add(wingMesh);

    // Spoiler Struts
    const strutGeo = new THREE.BoxGeometry(0.15, 0.8, 0.3);
    const strutLeft = new THREE.Mesh(strutGeo, wingMat);
    strutLeft.position.set(-spoilerW * 0.35, 2.3, -length * 0.45);
    const strutRight = new THREE.Mesh(strutGeo, wingMat);
    strutRight.position.set(spoilerW * 0.35, 2.3, -length * 0.45);
    this.bodyGroup.add(strutLeft);
    this.bodyGroup.add(strutRight);

    // 5. Dual Chrome Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.8, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    const exLeft = new THREE.Mesh(exhaustGeo, exhaustMat);
    exLeft.position.set(-width * 0.28, 0.75, -length * 0.48);
    const exRight = new THREE.Mesh(exhaustGeo, exhaustMat);
    exRight.position.set(width * 0.28, 0.75, -length * 0.48);
    this.bodyGroup.add(exLeft);
    this.bodyGroup.add(exRight);

    // 6. Front Headlight Lenses
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headGeo = new THREE.BoxGeometry(0.8, 0.35, 0.2);
    const hlLeft = new THREE.Mesh(headGeo, headMat);
    hlLeft.position.set(-width * 0.34, 1.25, length * 0.47);
    const hlRight = new THREE.Mesh(headGeo, headMat);
    hlRight.position.set(width * 0.34, 1.25, length * 0.47);
    this.bodyGroup.add(hlLeft);
    this.bodyGroup.add(hlRight);

    // Real 3D Headlight SpotLights projecting forward
    this.headlightLeft = new THREE.SpotLight(0xffffff, 2.5, 90, Math.PI / 6, 0.45, 1.2);
    this.headlightLeft.position.set(-width * 0.34, 1.25, length * 0.47);
    this.headlightTargetLeft = new THREE.Object3D();
    this.headlightTargetLeft.position.set(-width * 0.34, 0, length * 0.47 + 60);
    this.bodyGroup.add(this.headlightLeft);
    this.bodyGroup.add(this.headlightTargetLeft);
    this.headlightLeft.target = this.headlightTargetLeft;

    this.headlightRight = new THREE.SpotLight(0xffffff, 2.5, 90, Math.PI / 6, 0.45, 1.2);
    this.headlightRight.position.set(width * 0.34, 1.25, length * 0.47);
    this.headlightTargetRight = new THREE.Object3D();
    this.headlightTargetRight.position.set(width * 0.34, 0, length * 0.47 + 60);
    this.bodyGroup.add(this.headlightRight);
    this.bodyGroup.add(this.headlightTargetRight);
    this.headlightRight.target = this.headlightTargetRight;

    // 7. Taillight / Brake light Lenses
    this.taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    const tailGeo = new THREE.BoxGeometry(0.9, 0.35, 0.2);
    const tlLeft = new THREE.Mesh(tailGeo, this.taillightMaterial);
    tlLeft.position.set(-width * 0.34, 1.25, -length * 0.47);
    const tlRight = new THREE.Mesh(tailGeo, this.taillightMaterial);
    tlRight.position.set(width * 0.34, 1.25, -length * 0.47);
    this.bodyGroup.add(tlLeft);
    this.bodyGroup.add(tlRight);

    // 8. Police Lightbar (if police interceptor)
    if (car.isPolice) {
      const barGeo = new THREE.BoxGeometry(width * 0.75, 0.35, 0.6);
      this.policeLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      this.policeLightbar = new THREE.Mesh(barGeo, this.policeLightMat);
      this.policeLightbar.position.set(0, 1.3 + height * 0.7 + 0.3, -length * 0.05);
      this.bodyGroup.add(this.policeLightbar);
    } else {
      this.policeLightbar = null;
    }

    // 9. Neon Undercarriage Glow Plane
    const glowGeo = new THREE.PlaneGeometry(width * 1.15, length * 1.1);
    glowGeo.rotateX(-Math.PI / 2);
    this.underglowMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      transparent: true,
      opacity: 0.55
    });
    const underglowMesh = new THREE.Mesh(glowGeo, this.underglowMat);
    underglowMesh.position.set(0, 0.1, 0);
    this.bodyGroup.add(underglowMesh);

    // 10. 4 Independent 3D Wheels
    const wheelRadius = 0.72;
    const wheelThick = 0.5;
    const frontZ = length * 0.32;
    const rearZ = -length * 0.32;
    const trackX = width * 0.48;

    this.wheelFL = this.createWheelMesh(wheelRadius, wheelThick);
    this.wheelFR = this.createWheelMesh(wheelRadius, wheelThick);
    this.wheelRL = this.createWheelMesh(wheelRadius, wheelThick);
    this.wheelRR = this.createWheelMesh(wheelRadius, wheelThick);

    this.wheelFL.pivot.position.set(-trackX, wheelRadius, frontZ);
    this.wheelFR.pivot.position.set(trackX, wheelRadius, frontZ);
    this.wheelRL.pivot.position.set(-trackX, wheelRadius, rearZ);
    this.wheelRR.pivot.position.set(trackX, wheelRadius, rearZ);

    this.bodyGroup.add(this.wheelFL.pivot);
    this.bodyGroup.add(this.wheelFR.pivot);
    this.bodyGroup.add(this.wheelRL.pivot);
    this.bodyGroup.add(this.wheelRR.pivot);

    this.wheelMeshes = [this.wheelFL, this.wheelFR, this.wheelRL, this.wheelRR];
  }

  createWheelMesh(radius, thickness) {
    const pivot = new THREE.Group();

    // Tire rubber
    const tireGeo = new THREE.CylinderGeometry(radius, radius, thickness, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    pivot.add(tireMesh);

    // Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, thickness * 1.05, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    pivot.add(rimMesh);

    return { pivot, tireMesh };
  }

  update(dt, cityData) {
    const player = this.player;

    // Check if player changed car model in Garage
    if (player.modelId !== this.currentModelId) {
      this.buildCarModel(player.modelId);
    }

    // 1. Position in 3D (map 2D x, y to 3D X, Z)
    const posX = (player.x - cityData.width / 2) * SCALE;
    const posZ = (player.y - cityData.height / 2) * SCALE;
    const posY = player.z * SCALE;

    this.root.position.set(posX, posY, posZ);

    // 2. Yaw Heading (2D angle to 3D Y rotation)
    // In our 2D system, angle 0 = right (+X), angle PI/2 = down (+Y / +Z).
    // In 3D: forward along +Z when angle is 0, so rotation.y = -player.angle + Math.PI / 2
    this.root.rotation.y = -player.angle + Math.PI / 2;

    // 3. Wheel Spin & Steering
    const speedRatio = player.speed * 0.05;
    this.wheelRotation += speedRatio * dt * 25;

    // Steer front wheels
    this.wheelFL.pivot.rotation.y = player.steerAngle;
    this.wheelFR.pivot.rotation.y = player.steerAngle;

    // Spin all wheels around their axle
    this.wheelFL.tireMesh.rotation.x = this.wheelRotation;
    this.wheelFR.tireMesh.rotation.x = this.wheelRotation;
    this.wheelRL.tireMesh.rotation.x = this.wheelRotation;
    this.wheelRR.tireMesh.rotation.x = this.wheelRotation;

    // 4. Dynamic Suspension Body Roll & Pitch
    // Pitch: braking dips front, acceleration lifts front
    let targetPitch = 0;
    if (player.braking) {
      targetPitch = 0.06;
    } else if (player.speed > 50) {
      targetPitch = -0.04;
    }

    // Roll: cornering & drifting body roll
    const targetRoll = -player.angularVelocity * 0.06;

    this.bodyGroup.rotation.x += (targetPitch - this.bodyGroup.rotation.x) * dt * 10;
    this.bodyGroup.rotation.z += (targetRoll - this.bodyGroup.rotation.z) * dt * 10;

    // 5. Taillight brightness on braking
    if (this.taillightMaterial) {
      const isBrake = player.braking || player.reversing;
      this.taillightMaterial.color.setHex(isBrake ? 0xff0033 : 0x7f1d1d);
    }

    // 6. Police Siren Flashing
    if (this.policeLightbar && player.isPolice) {
      const isRed = Math.floor(player.sirenTimer * 2) % 2 === 0;
      this.policeLightMat.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
    }
  }
}
