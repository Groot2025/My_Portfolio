import * as THREE from "three";
import { GLTFLoader } from "./vendor/three/examples/jsm/loaders/GLTFLoader.js";

const viewer = document.querySelector(".drone-viewer");

if (viewer) {
  const canvas = viewer.querySelector("canvas");
  const modelPath = viewer.dataset.model;
  const showcase = viewer.closest(".showcase");
  const features = showcase ? [...showcase.querySelectorAll(".feature")] : [];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 5, 7);
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x2c2015, 1.7));

  camera.position.set(0, 1.1, 5.8);

  const rig = new THREE.Group();
  scene.add(rig);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROTATION_RANGE = Math.PI * 2 * 2.5;

  let baseRotation = 0;
  let userRotation = 0;
  let isDragging = false;
  let lastX = 0;

  const resize = () => {
    const rect = viewer.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };

  new ResizeObserver(resize).observe(viewer);
  resize();

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxAxis = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxAxis;

      model.position.sub(center);
      model.scale.setScalar(scale);
      model.rotation.x = -0.22;
      model.rotation.z = 0.08;
      rig.add(model);
      viewer.classList.add("is-loaded");
    },
    undefined,
    () => {
      viewer.classList.add("load-failed");
    }
  );

  viewer.addEventListener("pointerdown", (event) => {
    isDragging = true;
    lastX = event.clientX;
    viewer.setPointerCapture(event.pointerId);
  });

  viewer.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    userRotation += (event.clientX - lastX) * 0.01;
    lastX = event.clientX;
  });

  viewer.addEventListener("pointerup", () => {
    isDragging = false;
  });

  const updateProgress = () => {
    if (!showcase) return 0;
    const rect = showcase.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? THREE.MathUtils.clamp(-rect.top / total, 0, 1) : 0;

    if (!isDragging && !reduceMotion) {
      baseRotation = progress * ROTATION_RANGE;
    }

    if (features.length) {
      const index = Math.min(
        Math.floor(progress * features.length),
        features.length - 1
      );
      features.forEach((feature, i) => {
        feature.classList.toggle("is-active", i === index);
      });
    }

    return progress;
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const animate = () => {
    updateProgress();
    rig.rotation.y = baseRotation + userRotation;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
}
