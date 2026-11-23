// city.js - Complete Open-World City Map, Road Network, Buildings & Spatial Grid

export const WORLD_SIZE = 6400;
const CELL_SIZE = 200;
const GRID_CELLS = Math.ceil(WORLD_SIZE / CELL_SIZE);

export class City {
  constructor() {
    this.width = WORLD_SIZE;
    this.height = WORLD_SIZE;

    this.roads = [];
    this.intersections = [];
    this.buildings = [];
    this.props = [];
    this.dynamicProps = []; // knockable props (cones, trash cans, hydrants)
    this.trees = [];
    this.waterBodies = [];
    this.collectibles = [];
    this.stuntRamps = [];
    this.speedTraps = [];
    this.trafficLights = [];
    this.districts = [];

    // Spatial hash for fast collision and culling
    this.spatialGrid = Array.from({ length: GRID_CELLS }, () =>
      Array.from({ length: GRID_CELLS }, () => [])
    );

    this.initDistricts();
    this.generateRoadNetwork();
    this.generateWaterBodies();
    this.generateBuildings();
    this.generatePropsAndDecorations();
    this.generateCollectiblesAndRamps();
    this.buildSpatialHash();
  }

  initDistricts() {
    this.districts = [
      { name: 'DOWNTOWN METROPOLIS', x: 2200, y: 1800, w: 2000, h: 1800, color: '#00f0ff', desc: 'Towering Glass Skyscrapers & Corporate Plazas' },
      { name: 'NEON STRIP & ENTERTAINMENT', x: 4200, y: 2000, w: 1800, h: 2200, color: '#ff007f', desc: 'Vibrant Nightlife, Casinos & Neon Boulevards' },
      { name: 'CENTRAL PARK & GARDENS', x: 800, y: 800, w: 1600, h: 1600, color: '#00ff66', desc: 'Lush Greenery, Scenic Lakes & Botanical Paths' },
      { name: 'SUNSET SUBURBS', x: 2600, y: 400, w: 3400, h: 1400, color: '#ffb703', desc: 'Residential Neighborhoods, Villas & Cul-de-sacs' },
      { name: 'INDUSTRIAL DOCKS & HARBOR', x: 600, y: 4000, w: 2600, h: 2000, color: '#fb8500', desc: 'Cargo Containers, Warehouses & Deepwater Harbor' },
      { name: 'COASTAL WATERFRONT PROMENADE', x: 400, y: 2400, w: 600, h: 1600, color: '#4cc9f0', desc: 'Oceanfront Highway, Yacht Marina & Palm Palms' }
    ];
  }

  generateRoadNetwork() {
    // Road widths: highway=150, avenue=120, street=80, lane=50
    // Highway outer loop
    this.addRoad(400, 400, 6000, 400, 150, 'highway', 'Outer Loop North');
    this.addRoad(6000, 400, 6000, 6000, 150, 'highway', 'Outer Loop East');
    this.addRoad(6000, 6000, 400, 6000, 150, 'highway', 'Outer Loop South');
    this.addRoad(400, 6000, 400, 400, 150, 'highway', 'Outer Loop West');

    // Major horizontal avenues
    this.addRoad(400, 1600, 6000, 1600, 120, 'avenue', 'Metropolitan Blvd');
    this.addRoad(400, 2600, 6000, 2600, 130, 'avenue', 'Central Grand Parkway');
    this.addRoad(400, 3800, 6000, 3800, 120, 'avenue', 'Industrial Expressway');
    this.addRoad(400, 4800, 6000, 4800, 110, 'avenue', 'Harbor Coastline Rd');

    // Major vertical avenues
    this.addRoad(1600, 400, 1600, 6000, 120, 'avenue', 'Parkway West');
    this.addRoad(2600, 400, 2600, 6000, 130, 'avenue', 'Apex Central Ave');
    this.addRoad(3600, 400, 3600, 6000, 130, 'avenue', 'Titan Financial Way');
    this.addRoad(4600, 400, 4600, 6000, 120, 'avenue', 'Neon Boulevard');

    // Secondary connecting streets in Downtown & Neon Strip
    this.addRoad(2600, 2100, 4600, 2100, 80, 'street', 'Skyline Street');
    this.addRoad(2600, 3200, 4600, 3200, 80, 'street', 'Broadway Avenue');
    this.addRoad(3100, 1600, 3100, 3800, 80, 'street', 'Plaza Corridor');
    this.addRoad(4100, 1600, 4100, 4800, 80, 'street', 'Cyber Mall Way');
    this.addRoad(5200, 1600, 5200, 4800, 80, 'street', 'Arcade Alley');
    this.addRoad(4600, 3200, 6000, 3200, 80, 'street', 'Casino Strip');

    // Suburb Streets (North-East)
    this.addRoad(2600, 1000, 6000, 1000, 70, 'street', 'Maple Grove Way');
    this.addRoad(3600, 400, 3600, 1600, 70, 'street', 'Oakwood Lane');
    this.addRoad(4600, 400, 4600, 1600, 70, 'street', 'Cedar Crest Dr');
    this.addRoad(5300, 400, 5300, 1600, 70, 'street', 'Hillside Loop');

    // Industrial Harbor Roads (South-West)
    this.addRoad(400, 4300, 2600, 4300, 90, 'street', 'Freight Terminal Rd');
    this.addRoad(400, 5400, 2600, 5400, 90, 'street', 'Dockworker Way');
    this.addRoad(1000, 3800, 1000, 6000, 90, 'street', 'Crane Avenue');
    this.addRoad(2100, 3800, 2100, 6000, 90, 'street', 'Warehouse Row');

    // Scenic Park Roads (North-West)
    this.addRoad(400, 1000, 1600, 1000, 70, 'park', 'Lakeview Drive');
    this.addRoad(1000, 400, 1000, 1600, 70, 'park', 'Botanical Run');

    // Generate intersections where roads cross
    this.computeIntersections();
  }

  addRoad(x1, y1, x2, y2, width, type, name) {
    const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    this.roads.push({
      x1, y1, x2, y2,
      minX: minX - width / 2,
      maxX: maxX + width / 2,
      minY: minY - width / 2,
      maxY: maxY + width / 2,
      width,
      type,
      name,
      isHorizontal,
      lanes: width >= 140 ? 4 : (width >= 100 ? 2 : 2)
    });
  }

  computeIntersections() {
    this.intersections = [];
    for (let i = 0; i < this.roads.length; i++) {
      for (let j = i + 1; j < this.roads.length; j++) {
        const r1 = this.roads[i];
        const r2 = this.roads[j];

        // Only perpendicular or intersecting
        if (r1.isHorizontal !== r2.isHorizontal) {
          const hRoad = r1.isHorizontal ? r1 : r2;
          const vRoad = r1.isHorizontal ? r2 : r1;

          if (vRoad.x1 >= Math.min(hRoad.x1, hRoad.x2) &&
              vRoad.x1 <= Math.max(hRoad.x1, hRoad.x2) &&
              hRoad.y1 >= Math.min(vRoad.y1, vRoad.y2) &&
              hRoad.y1 <= Math.max(vRoad.y1, vRoad.y2)) {
            
            const ix = vRoad.x1;
            const iy = hRoad.y1;
            const size = Math.max(hRoad.width, vRoad.width);

            const intersection = {
              x: ix,
              y: iy,
              size: size,
              hRoad,
              vRoad,
              // Traffic light state (timer advances in update)
              hasLights: (hRoad.width >= 110 && vRoad.width >= 110),
              lightState: Math.random() > 0.5 ? 'GREEN_H' : 'GREEN_V', // 'GREEN_H' (h green, v red), 'YELLOW_H', 'GREEN_V', 'YELLOW_V'
              timer: Math.random() * 8
            };

            this.intersections.push(intersection);
            if (intersection.hasLights) {
              this.trafficLights.push(intersection);
            }
          }
        }
      }
    }
  }

  generateWaterBodies() {
    // Ocean / Bay along West edge and South harbor
    this.waterBodies = [
      // West ocean strip
      { type: 'ocean', x: 0, y: 0, w: 320, h: WORLD_SIZE, name: 'Pacific Horizon Ocean' },
      // South Ocean
      { type: 'ocean', x: 0, y: 6080, w: WORLD_SIZE, h: 320, name: 'South Deepwater Bay' },
      // Central Park Lake
      { type: 'lake', x: 1000, y: 1100, w: 480, h: 380, island: { x: 1200, y: 1250, r: 60 }, name: 'Emerald Mirror Lake' },
      // Marina basin in Docks
      { type: 'marina', x: 320, y: 4400, w: 380, h: 800, name: 'Cargo Ship Berths' }
    ];
  }

  generateBuildings() {
    // Generate realistic urban blocks within the road grid
    const blocks = [];

    // Extract city blocks defined by main road coordinates
    const vLines = [400, 1000, 1600, 2100, 2600, 3100, 3600, 4100, 4600, 5200, 6000];
    const hLines = [400, 1000, 1600, 2100, 2600, 3200, 3800, 4300, 4800, 5400, 6000];

    for (let xi = 0; xi < vLines.length - 1; xi++) {
      for (let yi = 0; yi < hLines.length - 1; yi++) {
        const x1 = vLines[xi];
        const x2 = vLines[xi + 1];
        const y1 = hLines[yi];
        const y2 = hLines[yi + 1];

        // Margin from road centerlines to make sidewalks and lots
        const margin = 80;
        const blockX = x1 + margin;
        const blockY = y1 + margin;
        const blockW = x2 - x1 - margin * 2;
        const blockH = y2 - y1 - margin * 2;

        if (blockW > 80 && blockH > 80) {
          blocks.push({ x: blockX, y: blockY, w: blockW, h: blockH, xi, yi });
        }
      }
    }

    // Now populate each block based on district
    for (const b of blocks) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;

      // Check if this block is Central Park
      if (cx > 700 && cx < 2300 && cy > 700 && cy < 2300) {
        // Park: No massive buildings, create trees, lawns, pathways, and decorative park gazebo
        this.populateParkBlock(b);
        continue;
      }

      // Check if Industrial / Docks
      if (cy > 3800 && cx < 2600) {
        this.populateIndustrialBlock(b);
        continue;
      }

      // Check if Suburbs
      if (cy < 1600 && cx > 2400) {
        this.populateSuburbBlock(b);
        continue;
      }

      // Check if Neon District
      if (cx > 4200 && cy >= 1600 && cy <= 4600) {
        this.populateNeonBlock(b);
        continue;
      }

      // Default: Downtown Metropolis High-Rises & Plazas
      this.populateDowntownBlock(b);
    }
  }

  populateDowntownBlock(block) {
    // Downtown features large high-rise skyscrapers with rooftop features (helipad, ac units, pool, glass roof)
    const canSplit = block.w > 300 && block.h > 300;
    const subBuildings = [];

    if (canSplit) {
      // 2x2 or 2x1 high-rise towers with an inner pedestrian plaza
      const halfW = (block.w - 30) / 2;
      const halfH = (block.h - 30) / 2;
      subBuildings.push({ x: block.x, y: block.y, w: halfW, h: halfH });
      subBuildings.push({ x: block.x + halfW + 30, y: block.y, w: halfW, h: halfH });
      subBuildings.push({ x: block.x, y: block.y + halfH + 30, w: halfW, h: halfH });
      subBuildings.push({ x: block.x + halfW + 30, y: block.y + halfH + 30, w: halfW, h: halfH });
    } else {
      subBuildings.push(block);
    }

    const towerColors = ['#1a2238', '#0f172a', '#1e293b', '#111827', '#172554'];
    const accentColors = ['#00f0ff', '#38bdf8', '#818cf8', '#6366f1', '#e0e7ff'];

    for (const sb of subBuildings) {
      const heightLevel = 60 + Math.floor(Math.random() * 120); // 60 to 180 floors tall
      const mainColor = towerColors[Math.floor(Math.random() * towerColors.length)];
      const accent = accentColors[Math.floor(Math.random() * accentColors.length)];
      const hasHelipad = heightLevel > 130 && Math.random() > 0.4;
      const hasGlassPool = !hasHelipad && Math.random() > 0.6;

      this.buildings.push({
        x: sb.x,
        y: sb.y,
        w: sb.w,
        h: sb.h,
        heightLevel,
        mainColor,
        accentColor: accent,
        type: 'skyscraper',
        hasHelipad,
        hasGlassPool,
        rooftopUnits: Math.floor(Math.random() * 4) + 2,
        neonColor: Math.random() > 0.4 ? accent : null,
        antenna: Math.random() > 0.5
      });
    }
  }

  populateNeonBlock(block) {
    // Neon commercial district: shopping centers, casinos, cyber clubs, billboards
    const numSub = Math.random() > 0.5 ? 2 : 1;
    const subBuildings = [];

    if (numSub === 2 && block.w > block.h) {
      const half = (block.w - 20) / 2;
      subBuildings.push({ x: block.x, y: block.y, w: half, h: block.h });
      subBuildings.push({ x: block.x + half + 20, y: block.y, w: half, h: block.h });
    } else {
      subBuildings.push(block);
    }

    const neonPalettes = [
      { main: '#18122B', neon: '#ff007f', title: 'CYBER CLUB' },
      { main: '#1A0B2E', neon: '#a855f7', title: 'SYNTH CASINO' },
      { main: '#0B192C', neon: '#00f0ff', title: 'NEXUS HOTEL' },
      { main: '#2B124C', neon: '#f43f5e', title: 'NEO ARCADE' },
      { main: '#1E1E24', neon: '#eab308', title: 'GOLDEN VELVET' }
    ];

    for (const sb of subBuildings) {
      const choice = neonPalettes[Math.floor(Math.random() * neonPalettes.length)];
      this.buildings.push({
        x: sb.x,
        y: sb.y,
        w: sb.w,
        h: sb.h,
        heightLevel: 40 + Math.floor(Math.random() * 60),
        mainColor: choice.main,
        accentColor: choice.neon,
        type: 'neon',
        title: choice.title,
        neonColor: choice.neon,
        billboard: true,
        rooftopUnits: 3
      });
    }
  }

  populateIndustrialBlock(block) {
    // Warehouses, shipping containers, oil tanks
    const mode = Math.random();
    if (mode < 0.45) {
      // Long corrugated warehouse
      this.buildings.push({
        x: block.x + 10,
        y: block.y + 10,
        w: block.w - 20,
        h: block.h - 20,
        heightLevel: 25,
        mainColor: '#334155',
        accentColor: '#94a3b8',
        type: 'warehouse',
        corrugated: true
      });
    } else if (mode < 0.75) {
      // Shipping container stacks (slalom racing obstacles!)
      const containerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
      const rows = Math.floor(block.h / 50);
      const cols = Math.floor(block.w / 80);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.35) {
            const col = containerColors[Math.floor(Math.random() * containerColors.length)];
            this.buildings.push({
              x: block.x + 15 + c * 80,
              y: block.y + 15 + r * 50,
              w: 70,
              h: 36,
              heightLevel: 15 + Math.floor(Math.random() * 2) * 12,
              mainColor: col,
              accentColor: '#000000',
              type: 'container'
            });
          }
        }
      }
    } else {
      // Cylindrical Oil / Fuel Storage Tanks
      const tankRadius = 45;
      const spacing = 110;
      for (let tx = block.x + 55; tx + tankRadius <= block.x + block.w; tx += spacing) {
        for (let ty = block.y + 55; ty + tankRadius <= block.y + block.h; ty += spacing) {
          this.buildings.push({
            x: tx - tankRadius,
            y: ty - tankRadius,
            w: tankRadius * 2,
            h: tankRadius * 2,
            heightLevel: 35,
            mainColor: '#64748b',
            accentColor: '#cbd5e1',
            type: 'tank',
            isCircular: true,
            radius: tankRadius
          });
        }
      }
    }
  }

  populateSuburbBlock(block) {
    // Suburban homes with pitch roofs, yards, driveways, swimming pools
    const houseW = 90;
    const houseH = 75;
    const roofColors = ['#b91c1c', '#c2410c', '#0369a1', '#374151', '#4d7c0f'];

    const cols = Math.floor(block.w / 120);
    const rows = Math.floor(block.h / 110);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const hx = block.x + 15 + c * 120;
        const hy = block.y + 15 + r * 110;
        const roof = roofColors[Math.floor(Math.random() * roofColors.length)];

        this.buildings.push({
          x: hx,
          y: hy,
          w: houseW,
          h: houseH,
          heightLevel: 20,
          mainColor: '#f1f5f9',
          accentColor: roof,
          type: 'house',
          hasPool: Math.random() > 0.65
        });

        // Add garden trees next to house
        if (Math.random() > 0.4) {
          this.trees.push({
            x: hx + houseW + 12,
            y: hy + 20,
            radius: 14 + Math.random() * 8
          });
        }
      }
    }
  }

  populateParkBlock(block) {
    // Park area with trees, flowering shrubs, benches, gazebo
    const numTrees = Math.floor((block.w * block.h) / 3000);
    for (let i = 0; i < numTrees; i++) {
      const tx = block.x + 20 + Math.random() * (block.w - 40);
      const ty = block.y + 20 + Math.random() * (block.h - 40);

      // Avoid lake
      if (tx >= 950 && tx <= 1520 && ty >= 1050 && ty <= 1520) continue;

      this.trees.push({
        x: tx,
        y: ty,
        radius: 16 + Math.random() * 14
      });
    }

    // Central Gazebo in park
    if (block.w > 200 && block.h > 200) {
      this.buildings.push({
        x: block.x + block.w / 2 - 35,
        y: block.y + block.h / 2 - 35,
        w: 70,
        h: 70,
        heightLevel: 18,
        mainColor: '#059669',
        accentColor: '#34d399',
        type: 'gazebo'
      });
    }
  }

  generatePropsAndDecorations() {
    // 1. Streetlights along roads
    for (const r of this.roads) {
      const isH = r.isHorizontal;
      const step = 200;
      const len = isH ? Math.abs(r.x2 - r.x1) : Math.abs(r.y2 - r.y1);
      const start = isH ? Math.min(r.x1, r.x2) : Math.min(r.y1, r.y2);
      const offset = r.width / 2 + 15;

      for (let d = 100; d < len; d += step) {
        if (isH) {
          const px = start + d;
          // North and south sidewalk
          this.props.push({ type: 'streetlight', x: px, y: r.y1 - offset, lightRadius: 180 });
          this.props.push({ type: 'streetlight', x: px, y: r.y1 + offset, lightRadius: 180 });
        } else {
          const py = start + d;
          // West and east sidewalk
          this.props.push({ type: 'streetlight', x: r.x1 - offset, y: py, lightRadius: 180 });
          this.props.push({ type: 'streetlight', x: r.x1 + offset, y: py, lightRadius: 180 });
        }
      }
    }

    // 2. Dynamic knockable props: Traffic Cones, Fire Hydrants, Trash Bins
    for (const r of this.roads) {
      if (Math.random() > 0.4) {
        // Road construction cones
        const isH = r.isHorizontal;
        const cx = isH ? (r.x1 + r.x2) / 2 + (Math.random() * 400 - 200) : r.x1 + (Math.random() > 0.5 ? 25 : -25);
        const cy = isH ? r.y1 + (Math.random() > 0.5 ? 25 : -25) : (r.y1 + r.y2) / 2 + (Math.random() * 400 - 200);

        for (let k = 0; k < 4; k++) {
          this.dynamicProps.push({
            id: 'cone_' + Math.random(),
            type: 'cone',
            x: cx + (isH ? k * 28 : 0),
            y: cy + (isH ? 0 : k * 28),
            vx: 0,
            vy: 0,
            radius: 8,
            active: true
          });
        }
      }

      // Fire hydrants on sidewalks
      if (Math.random() > 0.5) {
        const offset = r.width / 2 + 14;
        const isH = r.isHorizontal;
        const hx = isH ? (r.x1 + r.x2) / 2 : r.x1 + offset;
        const hy = isH ? r.y1 + offset : (r.y1 + r.y2) / 2;

        this.dynamicProps.push({
          id: 'hydrant_' + Math.random(),
          type: 'hydrant',
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          radius: 10,
          isBurst: false,
          active: true
        });
      }
    }
  }

  generateCollectiblesAndRamps() {
    // Stunt ramps (drive fast onto them to launch into air!)
    this.stuntRamps = [
      { x: 2600, y: 1550, angle: Math.PI / 2, width: 45, length: 50, boost: 1.5, name: 'Downtown Super Launch' },
      { x: 3600, y: 2650, angle: -Math.PI / 2, width: 45, length: 50, boost: 1.6, name: 'Plaza Rooftop Leap' },
      { x: 1600, y: 3750, angle: 0, width: 45, length: 50, boost: 1.5, name: 'Industrial Canal Jump' },
      { x: 4600, y: 2150, angle: Math.PI, width: 45, length: 50, boost: 1.7, name: 'Neon Boulevard Mega Leap' },
      { x: 5950, y: 3200, angle: -Math.PI / 2, width: 50, length: 55, boost: 1.8, name: 'Highway Stunt Ramp' },
      { x: 450, y: 4800, angle: Math.PI / 2, width: 50, length: 55, boost: 1.7, name: 'Harbor Pier Launch' }
    ];

    // Speed trap cameras on high-speed avenues
    this.speedTraps = [
      { x: 2600, y: 3200, targetSpeed: 100, radius: 90, name: 'Apex Central Radar' },
      { x: 4600, y: 3800, targetSpeed: 110, radius: 90, name: 'Neon Highway Trap' },
      { x: 3600, y: 1000, targetSpeed: 95, radius: 90, name: 'Suburban Boulevard Trap' },
      { x: 1600, y: 4800, targetSpeed: 105, radius: 90, name: 'Industrial Strip Trap' },
      { x: 3000, y: 6000, targetSpeed: 120, radius: 100, name: 'Outer Loop South Speed Trap' }
    ];

    // Collectibles: Cash bundles and Nitro tanks scattered throughout the city
    const locations = [
      // Downtown alleys & plazas
      { x: 2850, y: 1850, type: 'cash', val: 500 },
      { x: 3350, y: 2350, type: 'nitro', val: 100 },
      { x: 3850, y: 2900, type: 'cash', val: 750 },
      { x: 3100, y: 3500, type: 'cash', val: 300 },
      // Neon district
      { x: 4900, y: 2350, type: 'nitro', val: 100 },
      { x: 5500, y: 2900, type: 'cash', val: 1000 },
      { x: 4350, y: 3500, type: 'cash', val: 400 },
      { x: 5100, y: 4100, type: 'nitro', val: 100 },
      // Harbor
      { x: 1200, y: 4550, type: 'cash', val: 600 },
      { x: 800, y: 5100, type: 'nitro', val: 100 },
      { x: 1900, y: 5600, type: 'cash', val: 800 },
      { x: 2350, y: 4200, type: 'cash', val: 500 },
      // Suburbs
      { x: 3200, y: 700, type: 'cash', val: 350 },
      { x: 4200, y: 1300, type: 'cash', val: 450 },
      { x: 5000, y: 700, type: 'nitro', val: 100 },
      // Park
      { x: 1200, y: 1250, type: 'cash', val: 1500 }, // Island secret stash!
      { x: 1800, y: 1200, type: 'cash', val: 500 },
      { x: 1200, y: 1800, type: 'nitro', val: 100 }
    ];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      this.collectibles.push({
        id: 'col_' + i,
        x: loc.x,
        y: loc.y,
        type: loc.type,
        val: loc.val,
        radius: 18,
        collected: false,
        bobTimer: Math.random() * Math.PI * 2
      });
    }
  }

  buildSpatialHash() {
    // Insert buildings, obstacles, ramps, collectibles into grid
    for (const b of this.buildings) {
      const minCol = Math.max(0, Math.floor(b.x / CELL_SIZE));
      const maxCol = Math.min(GRID_CELLS - 1, Math.floor((b.x + b.w) / CELL_SIZE));
      const minRow = Math.max(0, Math.floor(b.y / CELL_SIZE));
      const maxRow = Math.min(GRID_CELLS - 1, Math.floor((b.y + b.h) / CELL_SIZE));

      for (let c = minCol; c <= maxCol; c++) {
        for (let r = minRow; r <= maxRow; r++) {
          this.spatialGrid[c][r].push({ type: 'building', data: b });
        }
      }
    }

    // Insert trees
    for (const t of this.trees) {
      const col = Math.floor(t.x / CELL_SIZE);
      const row = Math.floor(t.y / CELL_SIZE);
      if (col >= 0 && col < GRID_CELLS && row >= 0 && row < GRID_CELLS) {
        this.spatialGrid[col][row].push({ type: 'tree', data: t });
      }
    }

    // Insert dynamic props
    for (const dp of this.dynamicProps) {
      const col = Math.floor(dp.x / CELL_SIZE);
      const row = Math.floor(dp.y / CELL_SIZE);
      if (col >= 0 && col < GRID_CELLS && row >= 0 && row < GRID_CELLS) {
        this.spatialGrid[col][row].push({ type: 'dynamicProp', data: dp });
      }
    }
  }

  update(dt) {
    // 1. Advance traffic lights timers
    for (const tl of this.trafficLights) {
      tl.timer += dt;
      if (tl.timer > 8.0) {
        tl.timer = 0;
        tl.lightState = tl.lightState === 'GREEN_H' ? 'GREEN_V' : 'GREEN_H';
      }
    }

    // 2. Update dynamic knockable props (sliding after being hit)
    for (const dp of this.dynamicProps) {
      if (dp.vx !== 0 || dp.vy !== 0) {
        dp.x += dp.vx * dt;
        dp.y += dp.vy * dt;
        // Apply friction
        dp.vx *= 0.92;
        dp.vy *= 0.92;
        if (Math.abs(dp.vx) < 2) dp.vx = 0;
        if (Math.abs(dp.vy) < 2) dp.vy = 0;
      }
    }

    // 3. Update collectibles floating animation
    for (const c of this.collectibles) {
      c.bobTimer += dt * 3;
    }
  }

  getDistrictAt(x, y) {
    for (const d of this.districts) {
      if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) {
        return d;
      }
    }
    return { name: 'METROPOLIS SUBURBS', desc: 'Outer Metro Area', color: '#94a3b8' };
  }

  getNearbyObjects(x, y, radius) {
    const minCol = Math.max(0, Math.floor((x - radius) / CELL_SIZE));
    const maxCol = Math.min(GRID_CELLS - 1, Math.floor((x + radius) / CELL_SIZE));
    const minRow = Math.max(0, Math.floor((y - radius) / CELL_SIZE));
    const maxRow = Math.min(GRID_CELLS - 1, Math.floor((y + radius) / CELL_SIZE));

    const results = [];
    const seen = new Set();

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        const cell = this.spatialGrid[c][r];
        for (const item of cell) {
          if (!seen.has(item.data)) {
            seen.add(item.data);
            results.push(item);
          }
        }
      }
    }
    return results;
  }
}
