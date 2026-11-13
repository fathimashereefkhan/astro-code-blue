"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AmbientLight,
  ACESFilmicToneMapping,
  Box3,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const regions = [
  {
    id: "brain",
    name: "Brain",
    short: "NEUROLOGICAL",
    purpose: "Cognition and neurological function.",
    effects:
      "Radiation may affect the central nervous system, cognition and motor function. Sleep loss can reduce attention and reaction speed.",
    indicators: "Reaction time, sustained attention, visual and verbal working memory, mood.",
    research: "WinSCAT takes approximately 11–15 minutes and is scheduled every 30 days during flight.",
    guidance: "Maintain sleep schedules, exercise and psychological well-being.",
    relatedHazards: ["Space radiation"],
  },
  {
    id: "eyes",
    name: "Eyes",
    short: "VISION",
    purpose: "Vision and visual health.",
    effects:
      "Fluid shifts toward the head may cause changes in vision and optic disc swelling (SANS).",
    indicators: "Visual acuity, Amsler grid, OCT and ocular ultrasound.",
    research: "Optic disc edema was reported in 66% of ISS crew in the cited research.",
    guidance: "Report blurred or distorted vision to the flight surgeon.",
    relatedHazards: ["Gravity fields"],
  },
  {
    id: "heart",
    name: "Heart",
    short: "CARDIOVASCULAR",
    purpose: "Cardiovascular circulation.",
    effects:
      "Gravity changes and fluid shifts affect cardiovascular adaptation. Gravity transitions can cause lightheadedness or fainting.",
    indicators: "Cardiovascular assessment and internal jugular vein ultrasound.",
    research: "Stagnant or reverse neck-vein flow was observed in 6 of 11 crew members in one study.",
    guidance:
      "Monitor symptoms and report concerning changes to the flight surgeon. No specific cardiovascular alert threshold is provided in the research document.",
    relatedHazards: ["Gravity fields"],
  },
  {
    id: "lungs",
    name: "Lungs",
    short: "RESPIRATORY",
    purpose: "Respiratory system and gas exchange.",
    effects:
      "Cabin CO2 accumulation can contribute to headaches, poor sleep, blurred vision, fatigue and nausea.",
    indicators: "Cabin CO2 measurements and headache symptoms.",
    research: "1-hour and 24-hour CO2 averages at or below 3 mmHg.",
    guidance: "Alert crew and ground support when levels exceed the reference; repair or switch cabin scrubbers.",
    relatedHazards: ["Hostile/closed environments"],
  },
  {
    id: "bones",
    name: "Bones",
    short: "BONE HEALTH",
    purpose: "Skeletal support and strength.",
    effects:
      "Weight-bearing bones lose mineral density in microgravity.",
    indicators: "DXA bone density, T-score, blood and urine markers.",
    research: "Weight-bearing bones can lose 1–1.5% of mineral density per month.",
    guidance: "Resistive exercise, adequate nutrition and vitamin D monitoring.",
    relatedHazards: ["Gravity fields"],
  },
  {
    id: "muscles",
    name: "Muscles",
    short: "MUSCLE HEALTH",
    purpose: "Movement and musculoskeletal fitness.",
    effects:
      "Reduced gravity affects musculoskeletal fitness.",
    indicators: "Exercise activity and musculoskeletal fitness.",
    research: "Reduced musculoskeletal fitness is identified as an HRP risk. The research document does not provide a specific muscle measurement or alert threshold.",
    guidance: "Regular resistive and aerobic exercise.",
    relatedHazards: ["Gravity fields"],
  },
  {
    id: "kidneys",
    name: "Kidneys",
    short: "FLUID BALANCE",
    purpose: "Fluid balance and waste removal.",
    effects:
      "Dehydration and calcium loss can increase kidney-stone risk.",
    indicators: "Hydration and relevant blood and urine markers.",
    research: "The document identifies kidney-stone risk but does not provide a numerical in-flight alert threshold.",
    guidance: "Maintain appropriate fluid and nutrient intake.",
    relatedHazards: [],
  },
  {
    id: "inner-ear",
    name: "Inner Ear",
    short: "BALANCE",
    purpose: "Balance and spatial orientation.",
    effects:
      "Gravity transitions can cause space motion sickness, dizziness, lightheadedness and fainting.",
    indicators: "Balance and motion-sickness assessment.",
    research: "Detailed test procedures and numerical alert thresholds are not provided in the research document.",
    guidance: "Record symptoms and report concerning dizziness or fainting.",
    relatedHazards: ["Gravity fields"],
  },
] as const;

type RegionId = (typeof regions)[number]["id"];
type InfoSectionId = "effects" | "indicators" | "research" | "guidance" | "hazards";

const hotspotPositions: Record<RegionId, { height: number; width: number }> = {
  brain: { height: 0.98, width: 0 },
  eyes: { height: 0.92, width: -0.08 },
  heart: { height: 0.76, width: 0.11 },
  lungs: { height: 0.72, width: -0.12 },
  bones: { height: 0.36, width: -0.12 },
  muscles: { height: 0.81, width: -0.39 },
  kidneys: { height: 0.63, width: 0.04 },
  "inner-ear": { height: 0.905, width: 0.13 },
};

const labelOffsets: Record<RegionId, { x: number; y: number }> = {
  brain: { x: 0.56, y: 0.12 },
  eyes: { x: -0.62, y: 0.12 },
  heart: { x: 0.58, y: 0.08 },
  lungs: { x: -0.62, y: -0.08 },
  bones: { x: -0.64, y: -0.04 },
  muscles: { x: 0, y: 0.34 },
  kidneys: { x: 0.66, y: -0.02 },
  "inner-ear": { x: 0.62, y: 0.02 },
};

function makeHotspotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the astronaut hotspot texture.");

  context.beginPath();
  context.arc(32, 32, 22, 0, Math.PI * 2);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.arc(32, 32, 17, 0, Math.PI * 2);
  context.fillStyle = "#f52222";
  context.shadowColor = "#f52222";
  context.shadowBlur = 12;
  context.fill();

  return canvas;
}

function makeLabelTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create an astronaut hotspot label.");

  context.font = "600 24px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const width = Math.min(context.measureText(label).width + 34, canvas.width - 12);
  const left = (canvas.width - width) / 2;
  const top = 10;

  context.beginPath();
  context.roundRect(left, top, width, canvas.height - top * 2, 8);
  context.fillStyle = "rgba(102, 108, 116, 0.92)";
  context.fill();
  context.strokeStyle = "rgba(235, 243, 250, 0.66)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.fillText(label, canvas.width / 2, canvas.height / 2 + 1);

  return canvas;
}

function RegionIllustration({ regionId }: { regionId: RegionId }) {
  let organShape: ReactNode = null;
  switch (regionId) {
    case "brain":
      organShape = (
        <>
          <path d="M58 34c-7-8-19-4-19 6-9 1-12 13-5 18-6 8 0 18 9 18 2 10 14 12 20 5V38c-1-2-3-3-5-4Z" />
          <path d="M62 34c7-8 19-4 19 6 9 1 12 13 5 18 6 8 0 18-9 18-2 10-14 12-20 5V38c1-2 3-3 5-4Z" />
          <path d="M48 43c7 0 9 6 7 11m-14 9c6-3 11 0 12 6m19-26c-7 0-9 6-7 11m14 9c-6-3-11 0-12 6" />
        </>
      );
      break;
    case "eyes":
      organShape = (
        <>
          <path d="M27 60c9-15 21-23 33-23s24 8 33 23c-9 15-21 23-33 23S36 75 27 60Z" />
          <circle cx="60" cy="60" r="15" />
          <circle cx="60" cy="60" r="6" fill="#67eaff" />
        </>
      );
      break;
    case "heart":
      organShape = (
        <>
          <path d="M60 88 34 64C13 43 41 25 58 45c16-21 47-3 28 19L60 88Z" />
          <path d="M57 45c-5-10-2-19 5-25m1 27c7-9 15-12 23-8m-33 20 12 1 7 12 8-18 10 1" />
        </>
      );
      break;
    case "lungs":
      organShape = (
        <>
          <path d="M58 34v26m4-26v26m-4-13-12 10m16-10 12 10" />
          <path d="M45 51c-9 3-18 19-17 32 1 9 13 11 21 4 5-5 8-15 8-27m18-9c9 3 18 19 17 32-1 9-13 11-21 4-5-5-8-15-8-27" />
        </>
      );
      break;
    case "bones":
      organShape = (
        <>
          <path d="M42 37c-6-7-17 1-11 8l33 34c-5 7 5 15 11 8 7 5 15-4 9-10l-34-34c6-7-4-15-10-9Z" />
          <path d="m43 52 24 24" />
        </>
      );
      break;
    case "muscles":
      organShape = (
        <>
          <path d="M39 76c-8-3-11-12-7-19l7-10 4-13 10 3 2 13c7 2 13-2 17-9l7 5c8 7 9 20 2 28-8 9-26 13-42 2Z" />
          <path d="m44 48 10 2m4 8c8 3 15 1 21-5m-35 22c8 4 19 5 29 1" />
        </>
      );
      break;
    case "kidneys":
      organShape = (
        <>
          <path d="M43 36c-12-4-21 8-18 22 3 13 12 21 22 17 7-3 9-13 4-19-4-5-2-15-8-20Zm34 0c12-4 21 8 18 22-3 13-12 21-22 17-7-3-9-13-4-19 4-5 2-15 8-20Z" />
          <path d="M47 72v13m26-13v13m-26-13 13 8 13-8" />
        </>
      );
      break;
    case "inner-ear":
      organShape = (
        <>
          <path d="M51 62c-7-6-6-18 2-23 9-6 22 1 21 12-1 8-8 11-10 18-1 3-1 7 0 10" />
          <path d="M55 63c-3-5-2-11 3-14 5-2 11 1 11 6 0 5-6 7-7 12-1 4 1 8 4 10" />
          <path d="M52 48c-9-7-11-17-6-23 5-5 13-2 14 5m13 8c7-9 15-10 19-4 4 6 0 13-8 16m-34 7c-11 0-18 6-17 13 1 7 9 9 17 5" />
        </>
      );
  }

  return (
    <div className="organ-illustration">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${regions.find((region) => region.id === regionId)?.name ?? "Body part"} illustration`}
      >
        <defs>
          <radialGradient id="organ-illustration-glow">
            <stop offset="0%" stopColor="#0d4c73" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#06172d" stopOpacity="0.08" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="48" fill="url(#organ-illustration-glow)" stroke="#168bff" strokeOpacity="0.4" />
        <circle cx="60" cy="60" r="38" fill="none" stroke="#00d4ff" strokeOpacity="0.2" strokeDasharray="2 5" />
        <g
          fill="rgba(0, 212, 255, 0.1)"
          stroke="#62e7ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        >
          {organShape}
        </g>
      </svg>
    </div>
  );
}

export default function AstronautExplorer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectedRegionRef = useRef<RegionId>("brain");
  const scanTimeoutRef = useRef<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("brain");
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [expandedSection, setExpandedSection] = useState<InfoSectionId | null>("effects");
  const [scanSequence, setScanSequence] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const selectRegion = useCallback((regionId: RegionId) => {
    setSelectedRegion(regionId);
    setIsInfoPanelOpen(true);
    setExpandedSection("effects");
    setScanSequence((sequence) => sequence + 1);
    setIsScanning(true);
    if (scanTimeoutRef.current !== null) window.clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = window.setTimeout(() => setIsScanning(false), 1250);
  }, []);

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
  }, [selectedRegion]);

  useEffect(() => () => {
    if (scanTimeoutRef.current !== null) window.clearTimeout(scanTimeoutRef.current);
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      const errorFrame = window.requestAnimationFrame(() => {
        setLoadError("This browser could not start a WebGL viewer. Try a browser with WebGL enabled.");
        setLoadState("error");
      });
      return () => window.cancelAnimationFrame(errorFrame);
    }

    let disposed = false;
    let frameId = 0;
    let dragging = false;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let modelGroup: Group | undefined;
    const markers: Sprite[] = [];
    const labels: Sprite[] = [];
    const labelLines: Line[] = [];
    const markerByUuid = new Map<string, RegionId>();
    const scene = new Scene();
    scene.background = null;
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 8.4);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "astronaut-canvas";
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D astronaut. Click a hotspot to select a body region, drag to rotate, and use the wheel to zoom.",
    );
    viewer.appendChild(renderer.domElement);

    scene.add(new AmbientLight("#9cb8d8", 1.2));
    scene.add(new HemisphereLight("#c9f5ff", "#07101f", 1.7));

    const keyLight = new DirectionalLight("#ffffff", 3.1);
    keyLight.position.set(-4, 6, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 30;
    scene.add(keyLight);

    const rimLight = new DirectionalLight("#00bfff", 2.2);
    rimLight.position.set(4, 2, -4);
    scene.add(rimLight);

    const floor = new Mesh(
      new PlaneGeometry(200, 200),
      new MeshStandardMaterial({ color: "#050b14", roughness: 0.92, metalness: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    floor.receiveShadow = true;
    scene.add(floor);

    const resize = () => {
      const { width, height } = viewer.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewer);
    window.addEventListener("resize", resize);
    resize();

    const canvas = renderer.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      canvas.classList.add("is-dragging");
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!modelGroup) return;
      if (!dragging) {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        canvas.style.cursor =
          raycaster.intersectObjects([...markers, ...labels], false).length > 0 ? "pointer" : "grab";
        return;
      }
      modelGroup.rotation.y += (event.clientX - previousPointerX) * 0.008;
      modelGroup.rotation.x = Math.max(
        -0.45,
        Math.min(0.45, modelGroup.rotation.x + (event.clientY - previousPointerY) * 0.005),
      );
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      canvas.classList.remove("is-dragging");
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onPointerLeave = () => {
      if (!dragging) canvas.style.cursor = "grab";
    };
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const onClick = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...markers, ...labels], false)[0];
      if (hit) selectRegion(markerByUuid.get(hit.object.uuid) ?? "brain");
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = Math.max(5.2, Math.min(13, camera.position.z + event.deltaY * 0.006));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const loader = new GLTFLoader();
    loader.load(
      "/assests/astronaut/scene.gltf",
      (gltf) => {
        if (disposed) {
          gltf.scene.traverse((object) => {
            if (object instanceof Mesh) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => {
                Object.values(material).forEach((value) => {
                  if (value instanceof Texture) value.dispose();
                });
                material.dispose();
              });
            }
          });
          return;
        }

        gltf.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        const maximumDimension = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maximumDimension) || maximumDimension <= 0) {
          setLoadError("The astronaut model has no measurable geometry.");
          setLoadState("error");
          return;
        }

        const scale = 4.55 / maximumDimension;
        modelGroup = new Group();
        gltf.scene.position.sub(center);
        gltf.scene.traverse((object) => {
          if (object instanceof Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        modelGroup.add(gltf.scene);
        modelGroup.scale.setScalar(scale);
        scene.add(modelGroup);

        const hotspotTexture = new CanvasTexture(makeHotspotTexture());
        for (const region of regions) {
          const position = hotspotPositions[region.id];
          const active = region.id === selectedRegionRef.current;
          const markerMaterial = new SpriteMaterial({
            map: hotspotTexture,
            color: active ? "#ff655e" : "#d51f1f",
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const marker = new Sprite(markerMaterial);
          const markerPosition = new Vector3(
            position.width * size.x,
            -center.y + size.y * position.height,
            bounds.max.z - center.z + maximumDimension * 0.025,
          );
          marker.position.copy(markerPosition);
          marker.scale.setScalar((active ? 0.27 : 0.21) / scale);
          marker.renderOrder = 10;
          marker.userData.regionId = region.id;
          markers.push(marker);
          markerByUuid.set(marker.uuid, region.id);
          modelGroup.add(marker);

          const offset = labelOffsets[region.id];
          const labelTexture = new CanvasTexture(makeLabelTexture(region.name));
          labelTexture.colorSpace = SRGBColorSpace;
          const labelMaterial = new SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const label = new Sprite(labelMaterial);
          label.position.set(
            markerPosition.x + offset.x,
            markerPosition.y + offset.y,
            markerPosition.z + 0.08,
          );
          label.scale.set(0.9 / scale, 0.24 / scale, 1);
          label.renderOrder = 11;
          label.userData.regionId = region.id;
          labels.push(label);
          markerByUuid.set(label.uuid, region.id);
          modelGroup.add(label);

          const lineGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0, 0, 0),
            new Vector3(offset.x, offset.y, 0.04),
          ]);
          const lineMaterial = new LineBasicMaterial({
            color: active ? "#ffaaa5" : "#d3d9e0",
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false,
          });
          const line = new Line(lineGeometry, lineMaterial);
          line.position.copy(markerPosition);
          line.userData.regionId = region.id;
          line.renderOrder = 9;
          labelLines.push(line);
          modelGroup.add(line);
        }

        setLoadState("ready");
      },
      undefined,
      () => {
        if (disposed) return;
        setLoadError("The astronaut model or one of its textures could not be loaded.");
        setLoadState("error");
      },
    );

    const animate = () => {
      if (disposed) return;
      frameId = window.requestAnimationFrame(animate);
      if (modelGroup && !dragging) modelGroup.rotation.y += 0.0016;
      for (const marker of markers) {
        const active = marker.userData.regionId === selectedRegionRef.current;
        (marker.material as SpriteMaterial).color.set(active ? "#ff655e" : "#d51f1f");
        marker.scale.setScalar((active ? 0.29 : 0.22) / (modelGroup?.scale.x || 1));
      }
      for (const label of labels) {
        const active = label.userData.regionId === selectedRegionRef.current;
        const material = label.material as SpriteMaterial;
        material.opacity = active ? 1 : 0.82;
        material.color.set(active ? "#00d4ff" : "#ffffff");
        label.scale.set(
          (active ? 1 : 0.9) / (modelGroup?.scale.x || 1),
          (active ? 0.28 : 0.24) / (modelGroup?.scale.x || 1),
          1,
        );
      }
      for (const line of labelLines) {
        const active = line.userData.regionId === selectedRegionRef.current;
        const material = line.material as LineBasicMaterial;
        material.color.set(active ? "#ffaaa5" : "#d3d9e0");
        material.opacity = active ? 1 : 0.72;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof Texture) value.dispose();
            });
            material.dispose();
          });
        } else if (object instanceof Sprite) {
          const material = object.material;
          if (material.map) material.map.dispose();
          material.dispose();
        } else if (object instanceof Line) {
          object.geometry.dispose();
          const material = object.material;
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectRegion]);

  const activeRegion = regions.find((region) => region.id === selectedRegion) ?? regions[0];
  const infoSections: { id: Exclude<InfoSectionId, "hazards">; title: string; content: string }[] = [
    { id: "effects", title: "SPACEFLIGHT EFFECTS", content: activeRegion.effects },
    { id: "indicators", title: "HEALTH INDICATORS", content: activeRegion.indicators },
    { id: "research", title: "NASA RESEARCH", content: activeRegion.research },
    { id: "guidance", title: "PREVENTIVE GUIDANCE", content: activeRegion.guidance },
  ];

  return (
    <main className="content explorer-page">
      <header className="explorer-heading">
        <div>
          <p className="explorer-eyebrow"><span /> CREW SYSTEMS / ANATOMY SCAN</p>
          <h1>3D Body Explorer</h1>
          <p>Explore how spaceflight environments interact with the human body.</p>
        </div>
        <span className="explorer-demo-tag">EDUCATIONAL VIEW / NO DIAGNOSTICS</span>
      </header>

      <div className="explorer-grid">
        <aside className="explorer-panel explorer-region-panel" aria-label="Body regions">
          <div className="explorer-panel-heading">
            <span>01 / BODY MAP</span>
            <span>SELECT REGION</span>
          </div>
          <div className="explorer-region-list">
            {regions.map((region, index) => (
              <button
                className={`explorer-region-button${selectedRegion === region.id ? " active" : ""}`}
                key={region.id}
                type="button"
                onClick={() => selectRegion(region.id)}
                aria-pressed={selectedRegion === region.id}
              >
                <span className="explorer-region-number">0{index + 1}</span>
                <span className="explorer-region-label">
                  <strong>{region.name}</strong>
                  <small>{region.short}</small>
                </span>
                <span className="explorer-region-state" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="explorer-panel-footnote">SELECT A REGION OR ITS MARKER ON THE MODEL</p>
        </aside>

        <section className="explorer-panel astronaut-view-panel" aria-label="Interactive astronaut viewer">
          <div className="viewer-topline">
            <span><i /> LIVE MODEL</span>
            <span>DRAG TO ROTATE <b>·</b> SCROLL TO ZOOM</span>
          </div>
          <div className="astronaut-viewer" ref={viewerRef}>
            <div className="viewer-grid-floor" aria-hidden="true" />
            <div className={`viewer-load-state ${loadState}`} role={loadState === "error" ? "alert" : "status"}>
              {loadState === "loading" && <><span className="viewer-loader" />LOADING ASTRONAUT MODEL</>}
              {loadState === "error" && loadError}
            </div>
            <span className="viewer-coordinate viewer-coordinate-top">ACB / EXPLORER-01</span>
            <span className="viewer-coordinate viewer-coordinate-bottom">MODEL: GLTF / TEXTURED</span>
            <span className="viewer-crosshair viewer-crosshair-left" aria-hidden="true">+</span>
            <span className="viewer-crosshair viewer-crosshair-right" aria-hidden="true">+</span>
          </div>
          <div className="viewer-bottomline">
            <span>REGION LOCK <strong>{activeRegion.name.toUpperCase()}</strong></span>
            <span>
              {activeRegion.relatedHazards.length > 0
                ? activeRegion.relatedHazards.join(" / ").toUpperCase()
                : "NO HAZARD LINK STATED"}
            </span>
          </div>
        </section>

        {isInfoPanelOpen && (
          <aside
            className={`explorer-panel explorer-info-panel holographic-panel${isScanning ? " is-scanning" : ""}`}
            aria-label={`${activeRegion.name} information`}
            aria-live="polite"
          >
            <span className="bio-scan-line" key={scanSequence} aria-hidden="true" />
            <div className="explorer-panel-heading holographic-heading">
              <span>02 / BODY SYSTEM</span>
              <div className="hologram-header-actions">
                <span className="system-live bio-scan-active"><i /> BIO-SCAN ACTIVE</span>
                <button
                  className="hologram-close"
                  type="button"
                  onClick={() => setIsInfoPanelOpen(false)}
                  aria-label="Close body information panel"
                >
                  ×
                </button>
              </div>
            </div>
            <p className="region-index">BODY REGION / {String(regions.findIndex((region) => region.id === selectedRegion) + 1).padStart(2, "0")}</p>
            <h2>{activeRegion.name}</h2>
            <RegionIllustration regionId={activeRegion.id} />
            <div className="hologram-function">
              <span>BODY FUNCTION</span>
              <p>{activeRegion.purpose}</p>
            </div>
            <div className="hologram-capsules">
              {infoSections.map((section) => {
                const expanded = expandedSection === section.id;
                const contentId = `bio-info-${selectedRegion}-${section.id}`;
                return (
                  <section className="info-capsule" key={section.id}>
                    <h3>
                      <button
                        className="info-capsule-toggle"
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={contentId}
                        onClick={() => setExpandedSection(expanded ? null : section.id)}
                      >
                        <span>{section.title}</span>
                        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                    </h3>
                    <p className="info-capsule-content" id={contentId} hidden={!expanded}>
                      {section.content}
                    </p>
                  </section>
                );
              })}
              <section className="info-capsule" key="hazards">
                <h3>
                  <button
                    className="info-capsule-toggle"
                    type="button"
                    aria-expanded={expandedSection === "hazards"}
                    aria-controls={`bio-info-${selectedRegion}-hazards`}
                    onClick={() => setExpandedSection(expandedSection === "hazards" ? null : "hazards")}
                  >
                    <span>RELATED HAZARDS</span>
                    <span aria-hidden="true">{expandedSection === "hazards" ? "−" : "+"}</span>
                  </button>
                </h3>
                <div
                  className="info-capsule-content hazard-tags"
                  id={`bio-info-${selectedRegion}-hazards`}
                  hidden={expandedSection !== "hazards"}
                >
                  {activeRegion.relatedHazards.length > 0
                    ? activeRegion.relatedHazards.map((hazard) => (
                        <span className="hazard-chip" key={hazard}>{hazard}</span>
                      ))
                    : <p>No related hazard is specified in the supplied research.</p>}
                </div>
              </section>
            </div>
            <div className="region-status">
              <span className="region-status-mark" aria-hidden="true">+</span>
              <span>EDUCATIONAL INFORMATION<br /><small>NOT A MEDICAL ASSESSMENT</small></span>
            </div>
          </aside>
        )}
      </div>

      <footer className="explorer-attribution">
        This work is based on <a href="https://sketchfab.com/3d-models/astronaut-287589e324b942b8be57dbd6c539b2ab" target="_blank" rel="noreferrer">“Astronaut”</a> by <a href="https://sketchfab.com/Javi_DaviYT" target="_blank" rel="noreferrer">Javi_DaviYT</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      </footer>
    </main>
  );
}
