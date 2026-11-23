// camera3d.js - Dynamic 3D Chase Camera with Speed FOV, Drift Lag, Screen Shake & Multi-View Modes

import * as THREE from '../lib/three.module.js';

export class Camera3D {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.5, 4000);

    this.modes = ['CHASE', 'CLOSE', 'HOOD', 'HELI'];
    this.currentModeIndex = 0;
    this.mode = this.modes[0];

    // Current camera position and look target in world space
    this.currentPos = new THREE.Vector3(0, 20, -30);
    this.currentTarget = new THREE.Vector3(0, 0, 0);

    // Dynamic FOV
    this.baseFov = 65;
    this.maxFov = 82;
    this.targetFov = 65;

    // Shake
    this.shakeOffset = new THREE.Vector3();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  toggleView() {
    this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
    this.mode = this.modes[this.currentModeIndex];
    return this.mode;
  }

  update(dt, player, car3D, particleSystem) {
    const carPos = car3D.root.position;
    const carRotY = car3D.root.rotation.y;

    // Forward and Right vectors from car heading
    const forwardX = Math.sin(carRotY);
    const forwardZ = Math.cos(carRotY);

    // 1. Dynamic FOV expansion based on speed and nitro
    const speedRatio = Math.min(1.0, Math.abs(player.speed) / 750);
    this.targetFov = this.baseFov + speedRatio * (this.maxFov - this.baseFov);
    if (player.isNitroActive) {
      this.targetFov += 8;
    }
    this.camera.fov += (this.targetFov - this.camera.fov) * dt * 4.0;
    this.camera.updateProjectionMatrix();

    // 2. Compute Target Position & Target LookAt depending on Mode
    let idealPos = new THREE.Vector3();
    let idealTarget = new THREE.Vector3();

    if (this.mode === 'CHASE') {
      // Behind and above car with dynamic drift lag
      const dist = 18 + speedRatio * 4;
      const height = 7 + speedRatio * 1.5;

      idealPos.set(
        carPos.x - forwardX * dist,
        carPos.y + height,
        carPos.z - forwardZ * dist
      );

      idealTarget.set(
        carPos.x + forwardX * 12,
        carPos.y + 2.2,
        carPos.z + forwardZ * 12
      );
    } else if (this.mode === 'CLOSE') {
      // Close follow
      const dist = 11;
      const height = 4.2;

      idealPos.set(
        carPos.x - forwardX * dist,
        carPos.y + height,
        carPos.z - forwardZ * dist
      );

      idealTarget.set(
        carPos.x + forwardX * 8,
        carPos.y + 1.8,
        carPos.z + forwardZ * 8
      );
    } else if (this.mode === 'HOOD') {
      // First-person hood view
      idealPos.set(
        carPos.x + forwardX * 1.2,
        carPos.y + 2.0,
        carPos.z + forwardZ * 1.2
      );

      idealTarget.set(
        carPos.x + forwardX * 35,
        carPos.y + 1.8,
        carPos.z + forwardZ * 35
      );
    } else if (this.mode === 'HELI') {
      // High-angle aerial helicopter cam
      idealPos.set(
        carPos.x - forwardX * 25,
        carPos.y + 45,
        carPos.z - forwardZ * 25
      );

      idealTarget.set(
        carPos.x,
        carPos.y,
        carPos.z
      );
    }

    // 3. Smooth Damping / Interpolation
    const lerpSpeed = this.mode === 'HOOD' ? 30.0 : 8.0;
    this.currentPos.lerp(idealPos, Math.min(1.0, dt * lerpSpeed));
    this.currentTarget.lerp(idealTarget, Math.min(1.0, dt * lerpSpeed));

    // 4. Apply Screen Shake
    if (particleSystem && particleSystem.shakeDuration > 0) {
      const mag = particleSystem.shakeMagnitude * 0.08 * particleSystem.shakeDuration;
      this.shakeOffset.set(
        (Math.random() - 0.5) * mag,
        (Math.random() - 0.5) * mag,
        (Math.random() - 0.5) * mag
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    this.camera.position.copy(this.currentPos).add(this.shakeOffset);
    this.camera.lookAt(this.currentTarget);
  }
}
