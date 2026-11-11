"use client";

import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
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
    focus: "Cognition, sleep, balance, and neurological symptoms.",
    effects:
      "Microgravity shifts body fluids toward the head, which may contribute to head pressure and changes in balance or sensorimotor adaptation. Radiation is another spaceflight exposure relevant to the nervous system.",
    monitor: "Crew-reported headache, balance, sleep, and cognitive changes; mission medical evaluations.",
    prevention:
      "Follow mission radiation-protection procedures, maintain sleep and exercise routines, and report new or persistent symptoms to the medical team.",
  },
  {
    id: "eyes",
    name: "Eyes",
    short: "VISION",
    focus: "Visual acuity and eye-related symptoms.",
    effects:
      "Fluid shifts toward the head during spaceflight can affect structures around the eye and may be associated with vision changes. Radiation exposure is also relevant to long-duration missions.",
    monitor: "Vision changes and scheduled eye examinations or imaging as directed by flight medical staff.",
    prevention:
      "Use prescribed countermeasures and protective equipment, follow radiation guidance, and promptly report changes in vision.",
  },
  {
    id: "heart",
    name: "Heart",
    short: "CARDIOVASCULAR",
    focus: "Cardiovascular function and exercise response.",
    effects:
      "In microgravity, the heart and blood vessels adapt to a different fluid distribution and reduced need to work against gravity. These changes can contribute to cardiovascular deconditioning.",
    monitor: "Crew symptoms, exercise response, and cardiovascular measures selected by the medical team.",
    prevention:
      "Use the mission exercise program consistently and follow individualized medical guidance, particularly during transitions into and out of microgravity.",
  },
  {
    id: "lungs",
    name: "Lungs",
    short: "RESPIRATORY",
    focus: "Breathing, respiratory symptoms, and cabin air quality.",
    effects:
      "Microgravity changes how air and blood distribute within the lungs. Spacecraft cabin conditions, including airborne particles and ventilation, also matter for respiratory health.",
    monitor: "Breathing symptoms and spacecraft environmental and air-quality monitoring.",
    prevention:
      "Maintain cabin air-quality procedures, use approved respiratory protection when required, and report new breathing symptoms.",
  },
  {
    id: "bones",
    name: "Bones",
    short: "SKELETAL",
    focus: "Bone structure and bone-related changes over time.",
    effects:
      "Without normal weight-bearing forces in microgravity, bones can lose mineral content over time, particularly in areas that normally support body weight.",
    monitor: "Bone-density assessments and other measures selected by the flight medical team.",
    prevention:
      "Follow prescribed resistance and aerobic exercise, nutrition, and medical countermeasure plans.",
  },
  {
    id: "muscles",
    name: "Muscles",
    short: "MUSCULOSKELETAL",
    focus: "Strength, endurance, and functional movement.",
    effects:
      "Reduced loading in microgravity can lead to muscle atrophy and reduced strength or endurance, especially when regular exercise is not maintained.",
    monitor: "Exercise performance, strength, endurance, and functional movement as directed by the medical team.",
    prevention:
      "Use the mission exercise equipment and prescribed training schedule, and follow recovery and nutrition guidance.",
  },
] as const;

type RegionId = (typeof regions)[number]["id"];

const hotspotPositions: Record<RegionId, { height: number; width: number }> = {
  brain: { height: 0.91, width: 0 },
  eyes: { height: 0.83, width: 0.1 },
  heart: { height: 0.68, width: -0.07 },
  lungs: { height: 0.65, width: 0.13 },
  bones: { height: 0.36, width: -0.22 },
  muscles: { height: 0.53, width: 0.25 },
};

function makeHotspotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the astronaut hotspot texture.");

  context.beginPath();
  context.arc(32, 32, 22, 0, Math.PI * 2);
  context.strokeStyle = "#b8f5ff";
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.arc(32, 32, 7, 0, Math.PI * 2);
  context.fillStyle = "#00d4ff";
  context.shadowColor = "#00d4ff";
  context.shadowBlur = 12;
  context.fill();

  return canvas;
}

export default function AstronautExplorer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectedRegionRef = useRef<RegionId>("brain");
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("brain");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
  }, [selectedRegion]);

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
    renderer.domElement.setAttribute("aria-label", "Interactive 3D astronaut. Drag to rotate; use the wheel to zoom.");
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
      if (!dragging || !modelGroup) return;
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
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
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
      const hit = raycaster.intersectObjects(markers, false)[0];
      if (hit) setSelectedRegion(markerByUuid.get(hit.object.uuid) ?? "brain");
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = Math.max(5.2, Math.min(13, camera.position.z + event.deltaY * 0.006));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
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
          const material = new SpriteMaterial({
            map: hotspotTexture,
            color: region.id === selectedRegionRef.current ? "#00d4ff" : "#168bff",
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const marker = new Sprite(material);
          marker.position.set(
            position.width * size.x,
            -center.y + size.y * position.height,
            bounds.max.z - center.z + maximumDimension * 0.025,
          );
          marker.scale.setScalar(0.31 / scale);
          marker.renderOrder = 10;
          marker.userData.regionId = region.id;
          markers.push(marker);
          markerByUuid.set(marker.uuid, region.id);
          modelGroup.add(marker);
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
        (marker.material as SpriteMaterial).color.set(active ? "#00d4ff" : "#168bff");
        marker.scale.setScalar((active ? 0.4 : 0.3) / (modelGroup?.scale.x || 1));
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
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const activeRegion = regions.find((region) => region.id === selectedRegion) ?? regions[0];

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
                onClick={() => setSelectedRegion(region.id)}
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
            <span>MICROGRAVITY / RADIATION / ISOLATION</span>
          </div>
        </section>

        <aside className="explorer-panel explorer-info-panel" aria-live="polite">
          <div className="explorer-panel-heading">
            <span>02 / SELECTED SYSTEM</span>
            <span className="system-live"><i /> ACTIVE</span>
          </div>
          <p className="region-index">BODY REGION / {String(regions.findIndex((region) => region.id === selectedRegion) + 1).padStart(2, "0")}</p>
          <h2>{activeRegion.name}</h2>
          <p className="region-focus">{activeRegion.focus}</p>
          <div className="region-readout">
            <span>INDICATORS TO MONITOR</span>
            <p>{activeRegion.monitor}</p>
          </div>
          <div className="region-status">
            <span className="region-status-mark" aria-hidden="true">+</span>
            <span>EDUCATIONAL INFORMATION<br /><small>NOT A MEDICAL ASSESSMENT</small></span>
          </div>
        </aside>

        <section className="explorer-panel explorer-guidance-panel">
          <div className="explorer-panel-heading">
            <span>03 / SPACEFLIGHT EFFECTS & PREVENTION</span>
            <span>REGION: {activeRegion.name.toUpperCase()}</span>
          </div>
          <div className="guidance-columns">
            <article>
              <span className="guidance-index">A / ENVIRONMENT</span>
              <h3>Spaceflight effects</h3>
              <p>{activeRegion.effects}</p>
            </article>
            <article>
              <span className="guidance-index">B / COUNTERMEASURES</span>
              <h3>Preventive measures</h3>
              <p>{activeRegion.prevention}</p>
            </article>
          </div>
        </section>
      </div>

      <footer className="explorer-attribution">
        This work is based on <a href="https://sketchfab.com/3d-models/astronaut-287589e324b942b8be57dbd6c539b2ab" target="_blank" rel="noreferrer">“Astronaut”</a> by <a href="https://sketchfab.com/Javi_DaviYT" target="_blank" rel="noreferrer">Javi_DaviYT</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      </footer>
    </main>
  );
}
