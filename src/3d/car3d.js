// car3d.js - High-Fidelity 3D Car Model with PBR Clearcoat Shaders, Disc Brakes, Brembo Calipers, Side Mirrors & Dynamic Suspension

import * as THREE from '../lib/three.module.js';
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

    // Headlight SpotLights & Emissives
    this.headlightLeft = null;
    this.headlightRight = null;
    this.taillightMaterial = null;
    this.lightbarMaterial = null;
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
    const bodyColor = new THREE.Color(car.bodyColor || 0xdc2626);
    const neonColor = new THREE.Color(car.neonColor || 0x06b6d4);

    // Dimensions in 3D
    const length = car.length * SCALE * 0.45; // ~8.2 units
    const width = car.width * SCALE * 0.48;   // ~4.4 units
    const height = 2.4;

    // 1. High-Performance PBR Automotive Paint
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      metalness: 0.86,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.55,
      metalness: 0.45
    });

    // 2. Lower Chassis & Front Splitter / Rear Diffuser
    const chassisGeo = new THREE.BoxGeometry(width, 0.5, length);
    const chassisMesh = new THREE.Mesh(chassisGeo, carbonMat);
    chassisMesh.position.set(0, 0.65, 0);
    chassisMesh.castShadow = true;
    this.bodyGroup.add(chassisMesh);

    // Front Aerodynamic Carbon Splitter & Winglets
    const splitterGeo = new THREE.BoxGeometry(width * 1.04, 0.12, 1.2);
    const splitterMesh = new THREE.Mesh(splitterGeo, carbonMat);
    splitterMesh.position.set(0, 0.42, length * 0.46);
    splitterMesh.castShadow = true;
    this.bodyGroup.add(splitterMesh);

    // Splitter Canards (Aero Winglets)
    const canardGeo = new THREE.BoxGeometry(0.12, 0.4, 0.6);
    const canardL = new THREE.Mesh(canardGeo, carbonMat);
    canardL.position.set(-width * 0.51, 0.6, length * 0.44);
    canardL.rotation.z = 0.2;
    const canardR = new THREE.Mesh(canardGeo, carbonMat);
    canardR.position.set(width * 0.51, 0.6, length * 0.44);
    canardR.rotation.z = -0.2;
    this.bodyGroup.add(canardL);
    this.bodyGroup.add(canardR);

    // 3. Sculpted Main Car Body
    const bodyGeo = new THREE.BoxGeometry(width * 0.96, height * 0.56, length * 0.94);
    this.mainBodyMesh = new THREE.Mesh(bodyGeo, paintMat);
    this.mainBodyMesh.position.set(0, 1.25, 0);
    this.mainBodyMesh.castShadow = true;
    this.mainBodyMesh.receiveShadow = true;
    this.bodyGroup.add(this.mainBodyMesh);

    // Hood scoop / vent indentation
    const hoodVentGeo = new THREE.BoxGeometry(width * 0.42, 0.12, length * 0.25);
    const hoodVentMesh = new THREE.Mesh(hoodVentGeo, carbonMat);
    hoodVentMesh.position.set(0, 1.54, length * 0.22);
    this.bodyGroup.add(hoodVentMesh);

    // Front Air Intake Grille
    const grilleGeo = new THREE.BoxGeometry(width * 0.65, 0.5, 0.2);
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
    const grilleMesh = new THREE.Mesh(grilleGeo, grilleMat);
    grilleMesh.position.set(0, 0.9, length * 0.48);
    this.bodyGroup.add(grilleMesh);

    // 4. Cockpit Cabin & Windshield Glass
    const cabinLen = length * 0.54;
    const cabinWid = width * 0.82;
    const cabinH = height * 0.54;
    const cabinGeo = new THREE.BoxGeometry(cabinWid, cabinH, cabinLen);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.95,
      transmission: 0.3,
      transparent: true,
      opacity: 0.92
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, 1.3 + height * 0.42, -length * 0.04);
    cabinMesh.castShadow = true;
    this.bodyGroup.add(cabinMesh);

    // Roof panel
    const roofGeo = new THREE.BoxGeometry(cabinWid * 0.92, 0.18, cabinLen * 0.88);
    const roofMesh = new THREE.Mesh(roofGeo, paintMat);
    roofMesh.position.set(0, 1.3 + height * 0.68, -length * 0.04);
    this.bodyGroup.add(roofMesh);

    // 5. Dual Aerodynamic Side View Mirrors
    const mirrorStemGeo = new THREE.BoxGeometry(0.35, 0.1, 0.15);
    const mirrorHousingGeo = new THREE.BoxGeometry(0.48, 0.3, 0.25);
    const mirrorGlassGeo = new THREE.PlaneGeometry(0.44, 0.26);
    const mirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

    // Left Mirror
    const mirrorLGroup = new THREE.Group();
    const stemL = new THREE.Mesh(mirrorStemGeo, carbonMat);
    const houseL = new THREE.Mesh(mirrorHousingGeo, paintMat);
    houseL.position.set(-0.35, 0.05, 0);
    const glassL = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
    glassL.position.set(-0.35, 0.05, -0.13);
    glassL.rotation.y = Math.PI;
    mirrorLGroup.add(stemL);
    mirrorLGroup.add(houseL);
    mirrorLGroup.add(glassL);
    mirrorLGroup.position.set(-width * 0.46, 1.8, length * 0.12);
    this.bodyGroup.add(mirrorLGroup);

    // Right Mirror
    const mirrorRGroup = new THREE.Group();
    const stemR = new THREE.Mesh(mirrorStemGeo, carbonMat);
    const houseR = new THREE.Mesh(mirrorHousingGeo, paintMat);
    houseR.position.set(0.35, 0.05, 0);
    const glassR = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
    glassR.position.set(0.35, 0.05, -0.13);
    glassR.rotation.y = Math.PI;
    mirrorRGroup.add(stemR);
    mirrorRGroup.add(houseR);
    mirrorRGroup.add(glassR);
    mirrorRGroup.position.set(width * 0.46, 1.8, length * 0.12);
    this.bodyGroup.add(mirrorRGroup);

    // 6. GT Racing Rear Spoiler Wing
    const spoilerW = width * 0.98;
    const wingGeo = new THREE.BoxGeometry(spoilerW, 0.18, 1.1);
    const wingMesh = new THREE.Mesh(wingGeo, carbonMat);
    wingMesh.position.set(0, 2.75, -length * 0.44);
    wingMesh.castShadow = true;
    this.bodyGroup.add(wingMesh);

    // Carbon Struts
    const strutGeo = new THREE.BoxGeometry(0.12, 0.85, 0.35);
    const strutLeft = new THREE.Mesh(strutGeo, carbonMat);
    strutLeft.position.set(-spoilerW * 0.36, 2.3, -length * 0.44);
    const strutRight = new THREE.Mesh(strutGeo, carbonMat);
    strutRight.position.set(spoilerW * 0.36, 2.3, -length * 0.44);
    this.bodyGroup.add(strutLeft);
    this.bodyGroup.add(strutRight);

    // 7. Quad Chrome Exhaust Tips with Titanium Sheen
    const exhaustGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15
    });

    const exPositions = [
      -width * 0.32, -width * 0.22,
      width * 0.22, width * 0.32
    ];
    exPositions.forEach((xPos) => {
      const tip = new THREE.Mesh(exhaustGeo, exhaustMat);
      tip.position.set(xPos, 0.65, -length * 0.48);
      this.bodyGroup.add(tip);
    });

    // 8. Front Headlights & LED Halo DRLs
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headGeo = new THREE.BoxGeometry(0.85, 0.32, 0.25);
    const hlLeft = new THREE.Mesh(headGeo, headMat);
    hlLeft.position.set(-width * 0.34, 1.25, length * 0.47);
    const hlRight = new THREE.Mesh(headGeo, headMat);
    hlRight.position.set(width * 0.34, 1.25, length * 0.47);
    this.bodyGroup.add(hlLeft);
    this.bodyGroup.add(hlRight);

    // Real 3D Headlight SpotLights projecting beam forward
    this.headlightLeft = new THREE.SpotLight(0xffffff, 2.8, 95, Math.PI / 6, 0.45, 1.2);
    this.headlightLeft.position.set(-width * 0.34, 1.25, length * 0.47);
    this.headlightTargetLeft = new THREE.Object3D();
    this.headlightTargetLeft.position.set(-width * 0.34, 0, length * 0.47 + 65);
    this.bodyGroup.add(this.headlightLeft);
    this.bodyGroup.add(this.headlightTargetLeft);
    this.headlightLeft.target = this.headlightTargetLeft;

    this.headlightRight = new THREE.SpotLight(0xffffff, 2.8, 95, Math.PI / 6, 0.45, 1.2);
    this.headlightRight.position.set(width * 0.34, 1.25, length * 0.47);
    this.headlightTargetRight = new THREE.Object3D();
    this.headlightTargetRight.position.set(width * 0.34, 0, length * 0.47 + 65);
    this.bodyGroup.add(this.headlightRight);
    this.bodyGroup.add(this.headlightTargetRight);
    this.headlightRight.target = this.headlightTargetRight;

    // 9. Modern Full-Width Taillight Bar
    this.taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    const fullTailGeo = new THREE.BoxGeometry(width * 0.88, 0.18, 0.2);
    const tailBar = new THREE.Mesh(fullTailGeo, this.taillightMaterial);
    tailBar.position.set(0, 1.35, -length * 0.47);
    this.bodyGroup.add(tailBar);

    // Outer brake light blocks
    const tailGeo = new THREE.BoxGeometry(0.85, 0.32, 0.2);
    const tlLeft = new THREE.Mesh(tailGeo, this.taillightMaterial);
    tlLeft.position.set(-width * 0.34, 1.25, -length * 0.47);
    const tlRight = new THREE.Mesh(tailGeo, this.taillightMaterial);
    tlRight.position.set(width * 0.34, 1.25, -length * 0.47);
    this.bodyGroup.add(tlLeft);
    this.bodyGroup.add(tlRight);

    // 10. Police Lightbar (if police interceptor)
    if (car.isPolice) {
      const barGeo = new THREE.BoxGeometry(width * 0.75, 0.35, 0.6);
      this.policeLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      this.policeLightbar = new THREE.Mesh(barGeo, this.policeLightMat);
      this.policeLightbar.position.set(0, 1.3 + height * 0.68 + 0.3, -length * 0.04);
      this.bodyGroup.add(this.policeLightbar);
    } else {
      this.policeLightbar = null;
    }

    // 11. Neon Undercarriage Glow Plane
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

    // 12. 4 Realistic Wheels with Disc Brakes and Red Calipers
    const wheelRadius = 0.74;
    const wheelThick = 0.52;
    const frontZ = length * 0.32;
    const rearZ = -length * 0.32;
    const trackX = width * 0.49;

    this.wheelFL = this.createWheelAssembly(wheelRadius, wheelThick, true, true);
    this.wheelFR = this.createWheelAssembly(wheelRadius, wheelThick, false, true);
    this.wheelRL = this.createWheelAssembly(wheelRadius, wheelThick, true, false);
    this.wheelRR = this.createWheelAssembly(wheelRadius, wheelThick, false, false);

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

  createWheelAssembly(radius, thickness, isLeft, isFront) {
    // Knuckle pivot (steers with steering wheel on front wheels)
    const pivot = new THREE.Group();

    // 1. Fixed Brake System (Mounted to hub, does not spin with tire)
    const brakeGroup = new THREE.Group();

    // Perforated Metallic Disc Brake Rotor
    const rotorRadius = radius * 0.68;
    const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.08, 24);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.95,
      roughness: 0.22
    });
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    brakeGroup.add(rotorMesh);

    // High Performance Brembo Brake Caliper (Bright Sports Red)
    const caliperGeo = new THREE.BoxGeometry(0.24, 0.36, 0.32);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Crimson red
      metalness: 0.5,
      roughness: 0.25
    });
    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
    // Position caliper at top-back angle of disc
    const caliperAngle = isFront ? 0.75 : -0.75;
    caliperMesh.position.set(
      (isLeft ? 0.04 : -0.04),
      Math.sin(caliperAngle) * (rotorRadius * 0.8),
      Math.cos(caliperAngle) * (rotorRadius * 0.8)
    );
    brakeGroup.add(caliperMesh);
    pivot.add(brakeGroup);

    // 2. Rotating Wheel Group (Spins with vehicle speed)
    const spinGroup = new THREE.Group();

    // Rubber Tire Tread
    const tireGeo = new THREE.CylinderGeometry(radius, radius, thickness, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.92,
      metalness: 0.1
    });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    spinGroup.add(tireMesh);

    // Deep-Dish Alloy Rim Barrel
    const rimRadius = radius * 0.68;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, thickness * 1.04, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.9,
      roughness: 0.15
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    spinGroup.add(rimMesh);

    // 5-Spoke Sports Rim Details
    const spokeGeo = new THREE.BoxGeometry(thickness * 1.05, rimRadius * 0.92, 0.12);
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2
    });
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      const angle = (i * Math.PI * 2) / 5;
      spoke.rotation.x = angle;
      spinGroup.add(spoke);
    }

    // Center Hub Cap with chrome lug nuts
    const hubGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, thickness * 1.08, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    spinGroup.add(hubMesh);

    pivot.add(spinGroup);

    return { pivot, spinGroup, brakeGroup };
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
    this.root.rotation.y = -player.angle + Math.PI / 2;

    // 3. Wheel Spin & Steering
    const speedRatio = player.speed * 0.05;
    this.wheelRotation += speedRatio * dt * 25;

    // Steer front wheels
    this.wheelFL.pivot.rotation.y = player.steerAngle;
    this.wheelFR.pivot.rotation.y = player.steerAngle;

    // Spin wheels around axle
    this.wheelFL.spinGroup.rotation.x = this.wheelRotation;
    this.wheelFR.spinGroup.rotation.x = this.wheelRotation;
    this.wheelRL.spinGroup.rotation.x = this.wheelRotation;
    this.wheelRR.spinGroup.rotation.x = this.wheelRotation;

    // 4. Realistic Dynamic Suspension Coupling
    // Use the physical spring-damper weight transfer values calculated in car.js!
    const targetPitch = player.pitch || 0;
    const targetRoll = player.roll || 0;

    // Subtle high-speed road vibration feedback
    const roadVibration = Math.abs(player.speed) > 50
      ? Math.sin(performance.now() * 0.035) * Math.min(0.04, Math.abs(player.speed) * 0.00012)
      : 0;

    this.bodyGroup.position.y = roadVibration;
    this.bodyGroup.rotation.x = targetPitch;
    this.bodyGroup.rotation.z = targetRoll;

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
