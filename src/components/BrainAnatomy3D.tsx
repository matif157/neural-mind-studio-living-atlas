import { useEffect, useRef, useState } from 'react';
import { Info, RotateCcw, X } from 'lucide-react';
import type { Mesh as ThreeMesh } from 'three';

const PARTS = [
  { id: 'hemispheres', label: 'Cerebral hemispheres', text: 'The two large hemispheres are shown with a procedural gyri-like surface for orientation only. No personal thought is mapped to any precise location.' },
  { id: 'fissure', label: 'Longitudinal fissure', text: 'The groove separating the hemispheres. It is an anatomical landmark in this educational model, not a conceptual pathway.' },
  { id: 'cerebellum', label: 'Cerebellum', text: 'A structure at the back and base of the brain. Its presence here is educational; the personal concept links in the Atlas do not represent biological circuits.' },
  { id: 'brainstem', label: 'Brainstem', text: 'A conduit between brain and spinal cord. Nothing in the app infers brainstem function from a user reflection.' },
];

type Preset = 'front' | 'side' | 'top' | 'iso';

export default function BrainAnatomy3D({ onClose }: { onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{ setCamera: (preset: Preset) => void; toggleRotation: () => void; dispose: () => void } | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [active, setActive] = useState('hemispheres');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return undefined;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) {
      setAvailable(false);
      return undefined;
    }

    let canvas: HTMLCanvasElement | null = null;
    void (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        if (disposed) return;

        const element = document.createElement('canvas');
        canvas = element;
        element.className = 'brain3d-canvas';
        element.setAttribute('aria-hidden', 'true');
        host.appendChild(element);

        const renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x050912, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        camera.position.set(0, 1.4, 6.2);
        const controls = new OrbitControls(camera, element);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, -0.1, 0);
        controls.update();

        scene.add(new THREE.AmbientLight(0xd7e4ff, 1.25));
        const key = new THREE.DirectionalLight(0xffffff, 2.1);
        key.position.set(4, 6, 7);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x8f7bff, 1.1);
        fill.position.set(-5, -2, -4);
        scene.add(fill);

        const model = new THREE.Group();
        scene.add(model);
        const loader = new GLTFLoader();
        loader.load('/models/brain/anatomical-brain.glb', (gltf) => {
          if (disposed) return;
          model.add(gltf.scene);
          setAvailable(true);
        }, undefined, () => {
          if (!disposed) {
            setAvailable(false);
            setMessage('The anatomical model file could not be loaded. The labelled educational description remains available.');
          }
        });

        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        let frame = 0;
        let rotating = false;
        const animate = () => {
          frame = window.requestAnimationFrame(animate);
          if (rotating) model.rotation.y += 0.0025;
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const setCamera = (preset: Preset) => {
          const presets: Record<Preset, [number, number, number]> = {
            front: [0, 0.8, 6.2], side: [6.2, 0.8, 0], top: [0, 6.4, 0.01], iso: [4.4, 3.2, 4.8],
          };
          camera.position.set(...presets[preset]);
          controls.target.set(0, -0.1, 0);
          controls.update();
          renderer.render(scene, camera);
        };

        runtimeRef.current = {
          setCamera,
          toggleRotation: () => { rotating = !rotating; },
          dispose: () => {
            window.cancelAnimationFrame(frame);
            observer.disconnect();
            controls.dispose();
            model.traverse((object) => {
              const mesh = object as ThreeMesh;
              if (mesh.geometry) mesh.geometry.dispose();
              if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const material of materials) material.dispose();
              }
            });
            renderer.dispose();
            element.remove();
          },
        };
      } catch (error) {
        canvas?.remove();
        if (!disposed) {
          setAvailable(false);
          setMessage(error instanceof Error ? error.message : '3D renderer could not be started.');
        }
      }
    })();

    return () => {
      disposed = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      canvas?.remove();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="brain3d-modal" role="dialog" aria-modal="true" aria-labelledby="brain3d-title">
        <header className="modal-header">
          <div>
            <div className="panel-kicker">EDUCATIONAL ANATOMY · DISTINCT VISUAL SYSTEM</div>
            <h2 id="brain3d-title">Anatomical brain model</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close anatomical brain model"><X size={18} /></button>
        </header>
        <div className="brain3d-content">
          <div className="brain3d-stage">
            <div className="brain3d-host" ref={hostRef}>
              {available === false && (
                <div className="cog3d-fallback" role="img" aria-label="Labelled anatomical brain description">
                  <Info size={18} />
                  <strong>Labelled anatomy view</strong>
                  <span>{message || 'Use the structure list to explore the educational model without WebGL.'}</span>
                </div>
              )}
            </div>
            <div className="brain3d-controls" role="toolbar" aria-label="Anatomical model controls">
              {(['front', 'side', 'top', 'iso'] as Preset[]).map((preset) => (
                <button key={preset} className="view-chip" onClick={() => runtimeRef.current?.setCamera(preset)}>{preset.toUpperCase()}</button>
              ))}
              <button className="icon-button small" onClick={() => runtimeRef.current?.toggleRotation()} aria-label="Toggle model rotation"><RotateCcw size={14} /></button>
            </div>
          </div>
          <aside className="brain3d-info">
            <div className="part-selector">
              {PARTS.map((part) => <button key={part.id} className={active === part.id ? 'is-active' : ''} onClick={() => setActive(part.id)}>{part.label}</button>)}
            </div>
            <div className="part-detail">
              <div className="panel-kicker">SELECTED STRUCTURE</div>
              <h3>{PARTS.find((part) => part.id === active)?.label}</h3>
              <p>{PARTS.find((part) => part.id === active)?.text}</p>
            </div>
            <div className="safety-banner compact"><Info size={14} /><span>Conceptual pathways in the Atlas are not biological pathways. This model is not a scan and makes no claim about any person's brain.</span></div>
          </aside>
        </div>
      </section>
    </div>
  );
}
