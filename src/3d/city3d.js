// city3d.js - Complete 3D Procedural Metropolis Environment for Three.js

import * as THREE from '/node_modules/three/build/three.module.js';

export const SCALE = 0.4; // 1 world unit = 2.5 2D pixels

export class City3D {
  constructor(scene, cityData) {
    this.scene = scene;
    this.cityData = cityData;

    this.buildingMeshes = [];
    this.lampLights = [];
    this.trafficLightMeshes = [];
    this.treeMeshes = [];
    this.rampMeshes = [];
    this.collectibleMeshes = [];
    this.waterMesh = null;

    // Shared materials for high performance
    this.materials = this.initMaterials();

    this.buildGroundAndTerrain();
    this.buildRoadsAndSidewalks();
    this.buildWaterBodies();
    this.buildBuildings();
    this.buildTrees();
    this.buildStreetLamps();
    this.buildTrafficLights();
    this.buildStuntRamps();
    this.buildCollectibles();
  }

  initMaterials() {
    // Procedural glowing skyscraper window texture
    const windowCanvas = document.createElement('canvas');
    windowCanvas.width = 128;
    windowCanvas.height = 256;
    const wCtx = windowCanvas.getContext('2d');
    wCtx.fillStyle = '#0f172a';
    wCtx.fillRect(0, 0, 128, 256);

    for (let y = 8; y < 256; y += 16) {
      for (let x = 6; x < 128; x += 14) {
        const lit = Math.random() > 0.35;
        if (lit) {
          wCtx.fillStyle = Math.random() > 0.2 ? '#fef08a' : '#38bdf8';
        } else {
          wCtx.fillStyle = '#1e293b';
        }
        wCtx.fillRect(x, y, 9, 10);
      }
    }
    const windowTexture = new THREE.CanvasTexture(windowCanvas);
    windowTexture.wrapS = THREE.RepeatWrapping;
    windowTexture.wrapT = THREE.RepeatWrapping;

    // Asphalt road texture
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 64;
    roadCanvas.height = 64;
    const rCtx = roadCanvas.getContext('2d');
    rCtx.fillStyle = '#1e2430';
    rCtx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 200; i++) {
      rCtx.fillStyle = Math.random() > 0.5 ? '#242b38' : '#191e28';
      rCtx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    }
    const roadTexture = new THREE.CanvasTexture(roadCanvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;

    return {
      windowTexture,
      roadTexture,
      ground: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 }),
      parkGrass: new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8, metalness: 0.1 }),
      industrialGround: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.2 }),
      asphalt: new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.85, metalness: 0.1 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.1 }),
      curb: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }),
      roadLineWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      roadLineYellow: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
      water: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.8, transparent: true, opacity: 0.88 }),
      treeTrunk: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 }),
      treeFoliage: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 }),
      treeFoliageLight: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 }),
      glassTower: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        map: windowTexture,
        roughness: 0.3,
        metalness: 0.7
      }),
      concreteRoof: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
      metalContainer: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.6 }),
      stuntRamp: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.3 }),
      lampHead: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      lampPole: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 })
    };
  }

  to3DX(x) {
    return (x - this.cityData.width / 2) * SCALE;
  }

  to3DZ(y) {
    return (y - this.cityData.height / 2) * SCALE;
  }

  buildGroundAndTerrain() {
    const size = this.cityData.width * SCALE;
    const groundGeo = new THREE.PlaneGeometry(size * 1.5, size * 1.5);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.ground);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Central Park green terrain block
    const parkX = this.to3DX(1600);
    const parkZ = this.to3DZ(1600);
    const parkGeo = new THREE.BoxGeometry(1600 * SCALE, 0.4, 1600 * SCALE);
    const parkMesh = new THREE.Mesh(parkGeo, this.materials.parkGrass);
    parkMesh.position.set(parkX, 0.2, parkZ);
    parkMesh.receiveShadow = true;
    this.scene.add(parkMesh);

    // Industrial Docks concrete apron
    const indX = this.to3DX(1500);
    const indZ = this.to3DZ(4900);
    const indGeo = new THREE.BoxGeometry(2200 * SCALE, 0.3, 2200 * SCALE);
    const indMesh = new THREE.Mesh(indGeo, this.materials.industrialGround);
    indMesh.position.set(indX, 0.15, indZ);
    indMesh.receiveShadow = true;
    this.scene.add(indMesh);
  }

  buildRoadsAndSidewalks() {
    const roadGroup = new THREE.Group();

    for (const r of this.cityData.roads) {
      const isH = r.isHorizontal;
      const minX = Math.min(r.x1, r.x2);
      const maxX = Math.max(r.x1, r.x2);
      const minY = Math.min(r.y1, r.y2);
      const maxY = Math.max(r.y1, r.y2);

      const length = (isH ? maxX - minX : maxY - minY) * SCALE;
      const width = r.width * SCALE;
      const midX = this.to3DX((r.x1 + r.x2) / 2);
      const midZ = this.to3DZ((r.y1 + r.y2) / 2);

      // 1. Sidewalk base (wider than road, height 0.3)
      const sidewalkW = width + 28 * SCALE;
      const swGeo = new THREE.BoxGeometry(isH ? length : sidewalkW, 0.25, isH ? sidewalkW : length);
      const swMesh = new THREE.Mesh(swGeo, this.materials.sidewalk);
      swMesh.position.set(midX, 0.12, midZ);
      swMesh.receiveShadow = true;
      roadGroup.add(swMesh);

      // 2. Asphalt Road Ribbon (height 0.3)
      const roadGeo = new THREE.BoxGeometry(isH ? length : width, 0.28, isH ? width : length);
      const roadMesh = new THREE.Mesh(roadGeo, this.materials.asphalt);
      roadMesh.position.set(midX, 0.15, midZ);
      roadMesh.receiveShadow = true;
      roadGroup.add(roadMesh);

      // 3. Center dividing line
      const lineLen = length;
      const lineGeo = new THREE.PlaneGeometry(isH ? lineLen : 0.4, isH ? 0.4 : lineLen);
      lineGeo.rotateX(-Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeo, this.materials.roadLineYellow);
      lineMesh.position.set(midX, 0.31, midZ);
      roadGroup.add(lineMesh);
    }

    this.scene.add(roadGroup);
  }

  buildWaterBodies() {
    for (const wb of this.cityData.waterBodies) {
      const w = wb.w * SCALE;
      const h = wb.h * SCALE;
      const cx = this.to3DX(wb.x + wb.w / 2);
      const cz = this.to3DZ(wb.y + wb.h / 2);

      const waterGeo = new THREE.BoxGeometry(w, 0.5, h);
      const waterMesh = new THREE.Mesh(waterGeo, this.materials.water);
      waterMesh.position.set(cx, 0.05, cz);
      this.scene.add(waterMesh);
    }
  }

  buildBuildings() {
    const buildingGroup = new THREE.Group();

    for (const b of this.cityData.buildings) {
      const bx = this.to3DX(b.x + b.w / 2);
      const bz = this.to3DZ(b.y + b.h / 2);
      const bw = b.w * SCALE;
      const bd = b.h * SCALE;
      const bh = (b.heightLevel || 40) * SCALE * 1.8; // Vertical height in 3D

      if (b.isCircular) {
        // Oil / Fuel Storage Silo
        const r = (b.radius || b.w / 2) * SCALE;
        const siloGeo = new THREE.CylinderGeometry(r, r, bh, 24);
        const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
        const siloMesh = new THREE.Mesh(siloGeo, siloMat);
        siloMesh.position.set(bx, bh / 2, bz);
        siloMesh.castShadow = true;
        siloMesh.receiveShadow = true;
        buildingGroup.add(siloMesh);

        // Conical cap roof
        const capGeo = new THREE.ConeGeometry(r * 1.05, 3, 24);
        const capMesh = new THREE.Mesh(capGeo, siloMat);
        capMesh.position.set(bx, bh + 1.5, bz);
        buildingGroup.add(capMesh);
      } else if (b.type === 'container') {
        // Shipping container with corrugated colors
        const cGeo = new THREE.BoxGeometry(bw, bh, bd);
        const cMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(b.mainColor),
          roughness: 0.6,
          metalness: 0.4
        });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        cMesh.position.set(bx, bh / 2, bz);
        cMesh.castShadow = true;
        cMesh.receiveShadow = true;
        buildingGroup.add(cMesh);
      } else if (b.type === 'house') {
        // Suburban House body + Pitched Roof
        const houseGeo = new THREE.BoxGeometry(bw, bh, bd);
        const houseMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
        const houseMesh = new THREE.Mesh(houseGeo, houseMat);
        houseMesh.position.set(bx, bh / 2, bz);
        houseMesh.castShadow = true;
        buildingGroup.add(houseMesh);

        // Triangular pitched roof
        const roofGeo = new THREE.ConeGeometry(Math.max(bw, bd) * 0.72, 6, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.accentColor), roughness: 0.7 });
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.set(bx, bh + 3, bz);
        buildingGroup.add(roofMesh);
      } else {
        // Skyscraper / High-Rise Office Tower
        const towerGeo = new THREE.BoxGeometry(bw, bh, bd);

        // Skyscraper window material with vertical repeat
        const towerMat = this.materials.glassTower.clone();
        towerMat.color = new THREE.Color(b.mainColor);
        towerMat.map = this.materials.windowTexture.clone();
        towerMat.map.repeat.set(Math.max(1, Math.floor(bw / 12)), Math.max(2, Math.floor(bh / 8)));

        const towerMesh = new THREE.Mesh(towerGeo, towerMat);
        towerMesh.position.set(bx, bh / 2, bz);
        towerMesh.castShadow = true;
        towerMesh.receiveShadow = true;
        buildingGroup.add(towerMesh);

        // Rooftop structure / Helipad / AC equipment
        if (b.hasHelipad) {
          const heliGeo = new THREE.CylinderGeometry(bw * 0.35, bw * 0.35, 0.4, 24);
          const heliMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
          const heliMesh = new THREE.Mesh(heliGeo, heliMat);
          heliMesh.position.set(bx, bh + 0.2, bz);
          buildingGroup.add(heliMesh);

          // Helipad ring
          const ringGeo = new THREE.RingGeometry(bw * 0.25, bw * 0.3, 24);
          ringGeo.rotateX(-Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.position.set(bx, bh + 0.45, bz);
          buildingGroup.add(ringMesh);
        } else {
          // AC Blocks
          const acGeo = new THREE.BoxGeometry(bw * 0.3, 2.5, bd * 0.3);
          const acMesh = new THREE.Mesh(acGeo, this.materials.concreteRoof);
          acMesh.position.set(bx, bh + 1.25, bz);
          buildingGroup.add(acMesh);
        }

        // Antenna with flashing beacon
        if (b.antenna) {
          const antGeo = new THREE.CylinderGeometry(0.2, 0.4, 14, 8);
          const antMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
          const antMesh = new THREE.Mesh(antGeo, antMat);
          antMesh.position.set(bx, bh + 7, bz);
          buildingGroup.add(antMesh);

          // Red beacon light sphere
          const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
          beaconMesh.position.set(bx, bh + 14, bz);
          buildingGroup.add(beaconMesh);
        }

        // Neon District Glowing Edge / Marquee Sign
        if (b.neonColor) {
          const edgeGeo = new THREE.BoxGeometry(bw + 0.6, 1.2, bd + 0.6);
          const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(b.neonColor) });
          const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
          edgeMesh.position.set(bx, bh, bz);
          buildingGroup.add(edgeMesh);
        }
      }
    }

    this.scene.add(buildingGroup);
  }

  buildTrees() {
    const treeGroup = new THREE.Group();

    for (const t of this.cityData.trees) {
      const tx = this.to3DX(t.x);
      const tz = this.to3DZ(t.y);
      const r = t.radius * SCALE;

      // Tree trunk
      const trunkH = 4 + r * 0.4;
      const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, trunkH, 8);
      const trunkMesh = new THREE.Mesh(trunkGeo, this.materials.treeTrunk);
      trunkMesh.position.set(tx, trunkH / 2, tz);
      trunkMesh.castShadow = true;
      treeGroup.add(trunkMesh);

      // Layered foliage (two cones)
      const fol1Geo = new THREE.ConeGeometry(r * 1.2, r * 1.5, 8);
      const fol1Mesh = new THREE.Mesh(fol1Geo, this.materials.treeFoliage);
      fol1Mesh.position.set(tx, trunkH + r * 0.6, tz);
      fol1Mesh.castShadow = true;
      treeGroup.add(fol1Mesh);

      const fol2Geo = new THREE.ConeGeometry(r * 0.85, r * 1.2, 8);
      const fol2Mesh = new THREE.Mesh(fol2Geo, this.materials.treeFoliageLight);
      fol2Mesh.position.set(tx, trunkH + r * 1.3, tz);
      treeGroup.add(fol2Mesh);
    }

    this.scene.add(treeGroup);
  }

  buildStreetLamps() {
    const lampGroup = new THREE.Group();

    for (let i = 0; i < this.cityData.props.length; i += 2) {
      const p = this.cityData.props[i];
      if (p.type === 'streetlight') {
        const lx = this.to3DX(p.x);
        const lz = this.to3DZ(p.y);

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 9, 8);
        const poleMesh = new THREE.Mesh(poleGeo, this.materials.lampPole);
        poleMesh.position.set(lx, 4.5, lz);
        lampGroup.add(poleMesh);

        // Glowing bulb
        const bulbGeo = new THREE.SphereGeometry(0.6, 8, 8);
        const bulbMesh = new THREE.Mesh(bulbGeo, this.materials.lampHead);
        bulbMesh.position.set(lx, 9, lz);
        lampGroup.add(bulbMesh);
      }
    }

    this.scene.add(lampGroup);
  }

  buildTrafficLights() {
    const tlGroup = new THREE.Group();

    for (const tl of this.cityData.trafficLights) {
      const tx = this.to3DX(tl.x);
      const tz = this.to3DZ(tl.y);

      // Gantry post
      const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 11, 8);
      const postMesh = new THREE.Mesh(postGeo, this.materials.lampPole);
      postMesh.position.set(tx - 6, 5.5, tz);
      tlGroup.add(postMesh);

      // Horizontal arm
      const armGeo = new THREE.BoxGeometry(12, 0.4, 0.4);
      const armMesh = new THREE.Mesh(armGeo, this.materials.lampPole);
      armMesh.position.set(tx, 10.5, tz);
      tlGroup.add(armMesh);

      // Traffic light box
      const boxGeo = new THREE.BoxGeometry(1.2, 3.2, 1.2);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(tx, 9.8, tz);
      tlGroup.add(boxMesh);

      // Light lens (Green or Red)
      const lensGeo = new THREE.SphereGeometry(0.45, 8, 8);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const lensMesh = new THREE.Mesh(lensGeo, lensMat);
      lensMesh.position.set(tx, 9.4, tz + 0.6);
      tlGroup.add(lensMesh);

      this.trafficLightMeshes.push({ data: tl, lensMesh, lensMat });
    }

    this.scene.add(tlGroup);
  }

  buildStuntRamps() {
    const rampGroup = new THREE.Group();

    for (const r of this.cityData.stuntRamps) {
      const rx = this.to3DX(r.x);
      const rz = this.to3DZ(r.y);
      const w = r.width * SCALE;
      const l = r.length * SCALE;

      // 3D Wedge Ramp
      const rampGeo = new THREE.BoxGeometry(w, 4, l);
      rampGeo.rotateX(0.22); // Angled incline
      const rampMesh = new THREE.Mesh(rampGeo, this.materials.stuntRamp);
      rampMesh.position.set(rx, 1.6, rz);
      rampMesh.rotation.y = -r.angle;
      rampGroup.add(rampMesh);
    }

    this.scene.add(rampGroup);
  }

  buildCollectibles() {
    const colGroup = new THREE.Group();

    for (const c of this.cityData.collectibles) {
      const cx = this.to3DX(c.x);
      const cz = this.to3DZ(c.y);

      let mesh;
      if (c.type === 'cash') {
        // Floating green cash briefcase
        const cashGeo = new THREE.BoxGeometry(3, 1.8, 2.2);
        const cashMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.3 });
        mesh = new THREE.Mesh(cashGeo, cashMat);
      } else {
        // Floating cyan NOS cylinder
        const nosGeo = new THREE.CylinderGeometry(0.9, 0.9, 3.2, 16);
        const nosMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
        mesh = new THREE.Mesh(nosGeo, nosMat);
      }

      mesh.position.set(cx, 2.5, cz);
      colGroup.add(mesh);
      this.collectibleMeshes.push({ data: c, mesh });
    }

    this.scene.add(colGroup);
  }

  update(dt) {
    // 1. Update Traffic light colors
    for (const item of this.trafficLightMeshes) {
      const isGreen = item.data.lightState === 'GREEN_V';
      item.lensMat.color.setHex(isGreen ? 0x22c55e : 0xef4444);
    }

    // 2. Animate and rotate collectibles
    for (const item of this.collectibleMeshes) {
      if (item.data.collected) {
        item.mesh.visible = false;
      } else {
        item.mesh.rotation.y += dt * 2.2;
        item.mesh.position.y = 2.5 + Math.sin(Date.now() * 0.004 + item.mesh.position.x) * 0.5;
      }
    }
  }
}
