import * as THREE from "three/webgpu";
import { addComponent, Object3DBehaviour, ThreeStart } from "@/core";

// Components attach at any depth of the scene graph. The same Orbit class
// drives planets around the sun and a moon around a planet — three-start
// bootstraps every object it finds, wherever it sits in the hierarchy.

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
camera.position.set(0, 6.5, 9);
camera.lookAt(0, 0, 0);

class Orbit extends Object3DBehaviour {
  constructor(private readonly speed: number) {
    super();
  }

  onUpdate() {
    this.object.rotation.y += this.speed * this.ctx.getDeltaTime();
  }
}

const wire = (color: number) =>
  new THREE.MeshBasicMaterial({ color, wireframe: true });

const orbitPath = (radius: number) => {
  // full 0..2π arc — first and last points coincide, so a plain Line closes
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      new THREE.Path()
        .absarc(0, 0, radius, 0, Math.PI * 2, false)
        .getSpacedPoints(90),
    ),
    new THREE.LineBasicMaterial({ color: 0x1d3a2a }),
  );
  line.rotation.x = -Math.PI / 2;
  return line;
};

// sun
const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), wire(0x4ade80));
scene.add(sun);
addComponent(sun, Orbit, 0.15);

// planets: a pivot orbits the sun, the mesh sits at the pivot's radius
const PLANETS = [
  { radius: 2.6, size: 0.32, speed: 0.7 },
  { radius: 4.1, size: 0.45, speed: 0.42 },
  { radius: 5.7, size: 0.38, speed: 0.26 },
];

for (const { radius, size, speed } of PLANETS) {
  scene.add(orbitPath(radius));

  const pivot = new THREE.Object3D();
  scene.add(pivot);
  addComponent(pivot, Orbit, speed);

  const planet = new THREE.Mesh(
    new THREE.OctahedronGeometry(size, 1),
    wire(0xd8e0d8),
  );
  planet.position.x = radius;
  pivot.add(planet);
  addComponent(planet, Orbit, 1.4);

  // one moon for the middle planet — same component, one level deeper
  if (size === 0.45) {
    const moonPivot = new THREE.Object3D();
    planet.add(moonPivot);
    addComponent(moonPivot, Orbit, 2.2);

    const moon = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.14),
      wire(0x4ade80),
    );
    moon.position.x = 0.9;
    moonPivot.add(moon);
  }
}

export default starter;
