"use client";

import * as THREE from "three/webgpu";
import { ContextModule, type ThreeStartModules } from "@/core/ContextModule";
import { addComponent, setActive } from "@/core/methods";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { ThreeStart } from "@/core/ThreeStart";

// The landing scene is itself a three-start app — every concept the page
// narrates (components, modules, lifecycle, setActive) is literally what
// drives the visuals. The code snippets on the page mirror this file.

const BG = 0x070907;
const GREEN = 0x4ade80;
const GREEN_DIM = 0x1d3a2a;
const GRAY = 0x59615b;
const TRAIL = 0x86efac;

export const STORY_SECTIONS = 8; // hero, 6 chapters, outro

// ---------- deterministic noise ----------

function hash2(ix: number, iz: number) {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function vnoise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

function fbm(x: number, z: number) {
  let v = 0;
  let amp = 0.5;
  let fx = x;
  let fz = z;
  for (let i = 0; i < 4; i++) {
    v += vnoise(fx, fz) * amp;
    fx *= 2.03;
    fz *= 1.97;
    amp *= 0.5;
  }
  return v; // ~0..1
}

const PEAK_H = 27;
const HALF = 78;

function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  const cone = PEAK_H * Math.max(0, 1 - r / 62) ** 1.45;
  const swell = (fbm(x * 0.02 + 40, z * 0.02 - 25) - 0.5) * 6;
  const detail = (fbm(x * 0.07, z * 0.07) - 0.5) * 6.5;
  const rough = (fbm(x * 0.2 + 13.7, z * 0.2 + 7.1) - 0.5) * 2.4;
  const nearPeak = Math.max(0, 1 - r / 72);
  return cone + swell + (detail + rough) * (0.35 + 0.65 * nearPeak);
}

// ---------- modules (global systems on the context) ----------

class ScrollModule extends ContextModule {
  /** story position in sections, 0..STORY_SECTIONS — set by the page, smoothed here */
  target = 0;
  pos = 0;
  px = 0;
  py = 0;

  onUpdate() {
    this.pos = THREE.MathUtils.damp(
      this.pos,
      this.target,
      3,
      this.ctx.getDeltaTime(),
    );
  }
}

class WindModule extends ContextModule {
  strength = 0;
  target = 0;
  readonly direction = new THREE.Vector3(1, 0, 0.35).normalize();

  onUpdate() {
    this.strength = THREE.MathUtils.damp(
      this.strength,
      this.target,
      1.2,
      this.ctx.getDeltaTime(),
    );
  }
}

// ---------- helpers ----------

type ColorableMaterial = THREE.Material & { color: THREE.Color };

function setWireColor(obj: THREE.Object3D, hex: number) {
  obj.traverse((node) => {
    const mat = (node as THREE.Mesh).material as ColorableMaterial | undefined;
    if (mat?.color) mat.color.setHex(hex);
  });
}

// ---------- components (Object3DBehaviour) ----------

class CameraRig extends Object3DBehaviour {
  private readonly _pos = new THREE.Vector3();
  private readonly _look = new THREE.Vector3();

  constructor(
    private readonly scroll: ScrollModule,
    private readonly posCurve: THREE.CatmullRomCurve3,
    private readonly lookCurve: THREE.CatmullRomCurve3,
  ) {
    super();
  }

  onUpdate() {
    const u = THREE.MathUtils.clamp(
      // keyframe i lands at the middle of section i, not its top edge
      (this.scroll.pos - 0.5) / (STORY_SECTIONS - 1),
      0,
      1,
    );
    this.posCurve.getPoint(u, this._pos);
    this.lookCurve.getPoint(u, this._look);

    const t = this.ctx.getTime();
    this._pos.x += Math.sin(t * 0.12) * 1.4;
    this._pos.y += Math.sin(t * 0.085) * 0.7;
    this._look.x += this.scroll.px * 4.5;
    this._look.y -= this.scroll.py * 2.5;

    this.object.position.copy(this._pos);
    (this.object as THREE.PerspectiveCamera).lookAt(this._look);
  }
}

class Traveler extends Object3DBehaviour {
  private readonly _p = new THREE.Vector3();

  constructor(
    private readonly scroll: ScrollModule,
    private readonly curve: THREE.CatmullRomCurve3,
    private readonly trail: THREE.Line,
    private readonly trailPoints: number,
  ) {
    super();
  }

  onUpdate() {
    // starts walking after the hero, reaches the summit at the last chapter
    const t = THREE.MathUtils.clamp((this.scroll.pos - 0.5) / 5.5, 0, 1);
    this.curve.getPointAt(t, this._p);
    this.object.position.copy(this._p);
    this.object.rotation.y += this.ctx.getDeltaTime() * 0.8;
    this.trail.geometry.setDrawRange(0, Math.floor(this.trailPoints * t));
  }
}

class Materialize extends Object3DBehaviour {
  private _s = 0.0001;

  onAwake() {
    this.object.scale.setScalar(this._s);
  }

  onUpdate() {
    this._s = THREE.MathUtils.damp(this._s, 1, 2.4, this.ctx.getDeltaTime());
    this.object.scale.setScalar(this._s);
  }
}

class Orbit extends Object3DBehaviour {
  constructor(private readonly speed = 0.5) {
    super();
  }

  onUpdate() {
    this.object.rotation.y += this.speed * this.ctx.getDeltaTime();
  }
}

class Spin extends Object3DBehaviour {
  private readonly axis: THREE.Vector3;

  constructor(axis?: THREE.Vector3) {
    super();
    this.axis = (axis ?? new THREE.Vector3(0.4, 1, 0.25)).normalize();
  }

  onUpdate() {
    this.object.rotateOnAxis(this.axis, this.ctx.getDeltaTime() * 0.9);
  }

  onEnable() {
    setWireColor(this.object, GREEN);
  }

  onDisable() {
    setWireColor(this.object, GRAY);
  }
}

class Pulse extends Object3DBehaviour {
  private _tickLogged = false;

  constructor(private readonly log: (line: string) => void) {
    super();
  }

  onAwake() {
    this.log("onAwake()    once — right after addComponent");
  }

  onEnable() {
    this._tickLogged = false;
    setWireColor(this.object, GREEN);
    this.log("onEnable()   switched on");
  }

  onStart() {
    this.log("onStart()    once — first activation");
  }

  onUpdate() {
    if (!this._tickLogged) {
      this._tickLogged = true;
      this.log("onUpdate()   ticking on the render loop…");
    }
    const s = 1 + Math.sin(this.ctx.getTime() * 3.2) * 0.16;
    this.object.scale.setScalar(s);
  }

  onDisable() {
    setWireColor(this.object, GRAY);
    this.object.scale.setScalar(0.82);
    this.log("onDisable()  paused — off the render loop");
  }

  onDestroy() {
    this.log("onDestroy()  gone for good");
  }
}

class Snowfall extends Object3DBehaviour {
  constructor(
    private readonly wind: WindModule,
    private readonly half: number,
    private readonly top: number,
  ) {
    super();
  }

  onUpdate() {
    const points = this.object as THREE.Points;
    const mat = points.material as THREE.PointsMaterial;
    const w = this.wind;
    mat.opacity = Math.min(1, w.strength) * 0.75;
    points.visible = w.strength > 0.02;
    if (!points.visible) return;

    const dt = Math.min(this.ctx.getDeltaTime(), 0.05);
    const attr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const drift = w.strength * 24 * dt;
    const half2 = this.half * 2;

    for (let i = 0; i < arr.length; i += 3) {
      arr[i] +=
        w.direction.x * drift + Math.sin(arr[i + 1] * 0.35 + i) * dt * 1.6;
      arr[i + 1] -= (5 + (i % 7)) * dt * (0.4 + w.strength * 0.9);
      arr[i + 2] += w.direction.z * drift;
      if (arr[i + 1] < 0) arr[i + 1] += this.top;
      if (arr[i] > this.half) arr[i] -= half2;
      else if (arr[i] < -this.half) arr[i] += half2;
      if (arr[i + 2] > this.half) arr[i + 2] -= half2;
      else if (arr[i + 2] < -this.half) arr[i + 2] += half2;
    }
    attr.needsUpdate = true;
  }
}

class GridFade extends Object3DBehaviour {
  target = 0;

  onUpdate() {
    const mat = (this.object as THREE.GridHelper).material as THREE.Material;
    mat.opacity = THREE.MathUtils.damp(
      mat.opacity,
      this.target * 0.3,
      2,
      this.ctx.getDeltaTime(),
    );
  }
}

class SummitRings extends Object3DBehaviour {
  private readonly rings: THREE.Mesh[] = [];

  onAwake() {
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.05, 64),
        new THREE.MeshBasicMaterial({
          color: GREEN,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      this.object.add(ring);
      this.rings.push(ring);
    }
  }

  onUpdate() {
    const t = this.ctx.getTime();
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const k = (t * 0.4 + i / this.rings.length) % 1;
      ring.scale.setScalar(1 + k * 15);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.45;
    }
  }
}

// ---------- scene assembly ----------

function buildTerrain(): THREE.LineSegments {
  const rows = 62;
  const cols = 120;
  const positions: number[] = [];
  const colors: number[] = [];
  const tint = new THREE.Color(0.74, 0.8, 0.76);

  const vertexAt = (x: number, z: number) => {
    const h = heightAt(x, z);
    positions.push(x, h, z);
    const peakness = THREE.MathUtils.clamp(h / PEAK_H, 0, 1);
    const edge = THREE.MathUtils.clamp(
      1 - Math.max(Math.abs(x), Math.abs(z)) / HALF,
      0,
      1,
    );
    const b =
      (0.14 + 0.6 * peakness ** 1.3) *
      (0.35 + 0.65 * smooth(Math.min(1, edge * 3)));
    colors.push(tint.r * b, tint.g * b, tint.b * b);
  };

  // horizontal ridge lines (rows along x)
  for (let iz = 0; iz < rows; iz++) {
    const z = -HALF + (iz / (rows - 1)) * HALF * 2;
    for (let ix = 0; ix < cols - 1; ix++) {
      const x0 = -HALF + (ix / (cols - 1)) * HALF * 2;
      const x1 = -HALF + ((ix + 1) / (cols - 1)) * HALF * 2;
      vertexAt(x0, z);
      vertexAt(x1, z);
    }
  }
  // sparse cross lines for structure
  for (let ix = 0; ix < cols; ix += 8) {
    const x = -HALF + (ix / (cols - 1)) * HALF * 2;
    for (let iz = 0; iz < rows - 1; iz++) {
      const z0 = -HALF + (iz / (rows - 1)) * HALF * 2;
      const z1 = -HALF + ((iz + 1) / (rows - 1)) * HALF * 2;
      vertexAt(x, z0);
      vertexAt(x, z1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    }),
  );
}

function buildPathCurve(): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const turns = -1.55;
  // start dead-center in front of the hero camera
  const aStart = Math.PI * 0.5;
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = aStart + t * turns * Math.PI * 2;
    // r0 = 44 keeps the resting traveler centered and visible under the
    // hero copy (further out it drops below the hero camera's frame)
    const r = 44 * (1 - t) ** 1.12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.45, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

// ---------- public API ----------

export interface LandingSceneApi {
  starter: ThreeStart;
  /** continuous story position in sections: 0..STORY_SECTIONS */
  setScroll(pos: number): void;
  setPointer(x: number, y: number): void;
  /** section index became active (0 = hero … 7 = outro) */
  enterSection(index: number): void;
  /** local progress 0..1 inside the active section */
  setSectionLocal(index: number, t: number): void;
  onLifecycleLog: ((line: string) => void) | null;
  onActiveChange: ((isActive: boolean) => void) | null;
  dispose(): void;
}

// wind strength per section (hero…outro)
const WIND_BY_SECTION = [0, 0, 0.08, 0.12, 1, 0.25, 0.15, 0.1];

export function createLandingScene(container: HTMLDivElement): LandingSceneApi {
  const starter = new ThreeStart();
  const { ctx } = starter;
  const { scene, camera } = ctx;

  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 55, 210);
  camera.fov = 50;
  camera.near = 0.1;
  camera.far = 420;
  camera.updateProjectionMatrix();
  if (!camera.parent) scene.add(camera);

  const scroll = new ScrollModule();
  const wind = new WindModule();
  // The global ThreeStartRegister is already claimed by the snake example's
  // module map, so these two stay off the registry — behaviours receive them
  // via constructor args instead of `this.modules`.
  starter.addModules({ scroll, wind } as unknown as Partial<ThreeStartModules>);

  // terrain + floor grid
  scene.add(buildTerrain());

  const grid = new THREE.GridHelper(190, 38, GREEN_DIM, GREEN_DIM);
  grid.position.y = -6.5;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0;
  scene.add(grid);
  const gridFade = addComponent(grid, GridFade);

  // the route up the mountain + its progressively drawn trail
  const curve = buildPathCurve();
  const TRAIL_POINTS = 420;
  const trailGeo = new THREE.BufferGeometry().setFromPoints(
    curve.getSpacedPoints(TRAIL_POINTS - 1),
  );
  trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: TRAIL,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scene.add(trail);

  // the traveler
  const traveler = new THREE.Group();
  const travelerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85),
    new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true }),
  );
  const travelerShell = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.35),
    new THREE.MeshBasicMaterial({
      color: GREEN,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    }),
  );
  traveler.add(travelerCore, travelerShell);
  traveler.scale.setScalar(0.85);
  traveler.position.copy(curve.getPointAt(0));
  scene.add(traveler);
  addComponent(traveler, Traveler, scroll, curve, trail, TRAIL_POINTS);

  // snow (driven by WindModule)
  const SNOW_COUNT = 1400;
  const SNOW_TOP = 56;
  const snowPositions = new Float32Array(SNOW_COUNT * 3);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPositions[i * 3] = (hash2(i, 1) - 0.5) * HALF * 2;
    snowPositions[i * 3 + 1] = hash2(i, 2) * SNOW_TOP;
    snowPositions[i * 3 + 2] = (hash2(i, 3) - 0.5) * HALF * 2;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
  const snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({
      color: 0xc4dccc,
      size: 0.5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  snow.visible = false;
  scene.add(snow);
  addComponent(snow, Snowfall, wind, HALF, SNOW_TOP);

  // "expedition": the subtree that ch. 05 deactivates with setActive()
  const expedition = new THREE.Group();
  scene.add(expedition);

  const summitY = heightAt(0, 0);
  const beaconPos = curve.getPointAt(0.64).add(new THREE.Vector3(0, 2.4, 0));

  // camera path over the whole story (one keyframe per section)
  const startP = curve.getPointAt(0.06);
  const camPos = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 8, 90),
      new THREE.Vector3(startP.x + 16, startP.y + 8, startP.z + 30),
      new THREE.Vector3(46, summitY + 15, 42),
      new THREE.Vector3(beaconPos.x + 12, beaconPos.y + 6, beaconPos.z + 16),
      new THREE.Vector3(-48, summitY + 19, 44),
      new THREE.Vector3(-42, summitY + 7, -40),
      new THREE.Vector3(17, summitY + 10, 23),
      new THREE.Vector3(0, summitY + 27, 68),
    ],
    false,
    "centripetal",
  );
  const camLook = new THREE.CatmullRomCurve3(
    [
      // aim above the summit so the ridge sits in the lower half of the frame,
      // clear of the hero copy
      new THREE.Vector3(0, summitY * 1.25, 0),
      new THREE.Vector3(startP.x, startP.y + 2, startP.z),
      new THREE.Vector3(0, summitY + 3, 0),
      new THREE.Vector3(beaconPos.x, beaconPos.y + 1.5, beaconPos.z),
      new THREE.Vector3(0, summitY * 0.55, 0),
      new THREE.Vector3(0, summitY * 0.75, 0),
      new THREE.Vector3(0, summitY + 3, 0),
      new THREE.Vector3(0, summitY * 0.82, 0),
    ],
    false,
    "centripetal",
  );
  addComponent(camera, CameraRig, scroll, camPos, camLook);

  // ---------- lazily created story props ----------

  let sats: THREE.Group | null = null;
  let beacon: THREE.Mesh | null = null;
  let beaconComp: Pulse | null = null;
  let summit: THREE.Group | null = null;

  const api: LandingSceneApi = {
    starter,
    onLifecycleLog: null,
    onActiveChange: null,
    setScroll(pos) {
      scroll.target = pos;
    },
    setPointer(x, y) {
      scroll.px = x;
      scroll.py = y;
    },
    enterSection,
    setSectionLocal,
    dispose() {
      starter.dispose();
    },
  };

  const log = (line: string) => api.onLifecycleLog?.(line);

  function ensureSatellites() {
    if (sats) return;
    const group = new THREE.Group();
    sats = group;
    group.position.set(0, summitY + 7, 0);
    const geos = [
      new THREE.OctahedronGeometry(1.5),
      new THREE.IcosahedronGeometry(1.25),
      new THREE.TetrahedronGeometry(1.7),
    ];
    geos.forEach((geo, i) => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true }),
      );
      const a = (i / geos.length) * Math.PI * 2;
      mesh.position.set(
        Math.cos(a) * 11,
        Math.sin(a * 3) * 2,
        Math.sin(a) * 11,
      );
      group.add(mesh);
      addComponent(
        mesh,
        Spin,
        new THREE.Vector3(0.3 + i * 0.3, 1, 0.2 + i * 0.25),
      );
    });
    expedition.add(group);
    addComponent(group, Materialize);
    addComponent(group, Orbit, 0.55);
  }

  function ensureBeacon() {
    if (beacon) return;
    beacon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 0),
      new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true }),
    );
    beacon.position.copy(beaconPos);
    expedition.add(beacon);
    beaconComp = addComponent(beacon, Pulse, log);
  }

  function ensureSummit() {
    if (summit) return;
    summit = new THREE.Group();
    summit.position.set(0, summitY + 0.2, 0);
    const mastGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 7, 0),
    ]);
    summit.add(
      new THREE.Line(mastGeo, new THREE.LineBasicMaterial({ color: 0xe8e6df })),
    );
    const pennant = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.8, 4),
      new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true }),
    );
    pennant.position.set(0.8, 6.2, 0);
    pennant.rotation.z = -Math.PI / 2;
    summit.add(pennant);
    scene.add(summit);
    addComponent(summit, SummitRings);
    addComponent(summit, Materialize);
  }

  // ---------- story state ----------

  let frozen = false;

  function setFrozen(next: boolean) {
    if (frozen === next) return;
    frozen = next;
    setActive(expedition, !next);
    api.onActiveChange?.(!next);
  }

  function setBeaconEnabled(next: boolean) {
    if (!beaconComp || beaconComp.enabled === next) return;
    if (next) beaconComp.enable();
    else beaconComp.disable();
  }

  function enterSection(index: number) {
    gridFade.target = index >= 1 ? 1 : 0;
    if (index >= 2) ensureSatellites();
    if (index >= 3) ensureBeacon();
    if (index >= 6) ensureSummit();
    wind.target = WIND_BY_SECTION[index] ?? 0;
    if (index !== 5) setFrozen(false);
    if (index !== 3) setBeaconEnabled(true);
  }

  function setSectionLocal(index: number, t: number) {
    if (index === 3) setBeaconEnabled(!(t > 0.55 && t < 0.85));
    if (index === 5) setFrozen(t > 0.28 && t < 0.78);
  }

  // the satellites fly from the very first frame — the hero feels alive
  // before the story even begins (ch. 02 then narrates how they got there)
  ensureSatellites();

  starter.mount(container);
  starter.start();

  return api;
}
