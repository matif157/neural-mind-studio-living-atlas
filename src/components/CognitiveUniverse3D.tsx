import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Eye, EyeOff, Focus, Maximize2, ShieldAlert } from 'lucide-react';
import { PERSONAL_DIMENSIONS } from '@shared/dimensions';
import { useMindStore } from '../store/mindStore';
import { useConversationStore } from '../store/conversationStore';
import { useUiStore } from '../store/uiStore';
import {
  cameraPreset, displayLabel, explainRelationship, filterGraphFor3D,
  layout3D, nodePrivacy, type CameraPreset, type Point3,
} from '../lib/mind3d';
import type { MindNode } from '../types/mind';
import RelationshipReviewCard from './RelationshipReviewCard';
import type { Group as ThreeGroup, Mesh as ThreeMesh } from 'three';

type ThreeRuntime = {
  applyData: (visibleNodes: MindNode[], edges: ReturnType<typeof filterGraphFor3D>['edges'], positions: ReturnType<typeof layout3D>) => void;
  setCamera: (preset: CameraPreset) => void;
  focus: (id: string) => void;
  renderOnce: () => void;
  dispose: () => void;
};

export default function CognitiveUniverse3D() {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeRuntime | null>(null);
  const selectRef = useRef<(id: string | null) => void>(() => undefined);
  const selectedRef = useRef<string | null>(null);
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const setPos3 = useMindStore((state) => state.setPos3);
  const syncPos3To2D = useMindStore((state) => state.syncPos3To2D);
  const reducedMotion = useConversationStore((state) => state.settings.reducedMotion);
  const { dimensionFilter, secureView, query, setQuery, setDimensionFilter, toggleSecureView, selectedNodeId, setSelectedNode } = useUiStore();
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [camera, setCameraName] = useState<CameraPreset>('iso');
  const [runtimeError, setRuntimeError] = useState('');

  selectRef.current = setSelectedNode;
  selectedRef.current = selectedNodeId;

  const filtered = useMemo(
    () => filterGraphFor3D(nodes, edges, { dimension: dimensionFilter, query, secureView }),
    [nodes, edges, dimensionFilter, query, secureView],
  );
  const positions = useMemo(() => layout3D(filtered.nodes), [filtered.nodes]);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedRelationships = useMemo(
    () => edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).map((edge) => explainRelationship(edge, nodes, secureView)),
    [edges, nodes, selectedNodeId, secureView],
  );

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return undefined;

    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!context) {
      setWebglAvailable(false);
      return undefined;
    }

    let runtime: ThreeRuntime | null = null;
    let canvas: HTMLCanvasElement | null = null;
    void (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;

        const element = document.createElement('canvas');
        canvas = element;
        element.className = 'cog3d-canvas';
        element.setAttribute('aria-hidden', 'true');
        host.appendChild(element);

        const renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x050912, 0);
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050912, 0.012);
        const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
        const preset = cameraPreset('iso');
        cam.position.set(...preset.position);
        const controls = new OrbitControls(cam, element);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(...preset.target);
        controls.update();

        scene.add(new THREE.AmbientLight(0x9bb8ff, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(12, 18, 20);
        scene.add(key);
        const rim = new THREE.PointLight(0x7c5cff, 55, 80);
        rim.position.set(-16, -8, -12);
        scene.add(rim);

        const nodeGroup = new THREE.Group();
        const edgeGroup = new THREE.Group();
        scene.add(edgeGroup, nodeGroup);
        const sphere = new THREE.SphereGeometry(0.42, 20, 14);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const meshes: ThreeMesh[] = [];
        const disposable: Array<{ dispose: () => void }> = [];
        let positionsRef = layout3D([]);
        let frame = 0;

        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setSize(width, height, false);
          cam.aspect = width / height;
          cam.updateProjectionMatrix();
          renderer.render(scene, cam);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        const renderOnce = () => renderer.render(scene, cam);
        const animate = () => {
          frame = window.requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, cam);
        };
        if (!reducedMotion) animate();

        const onPointerDown = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, cam);
          const hit = raycaster.intersectObjects(meshes, false)[0];
          selectRef.current(hit ? (hit.object.userData.nodeId as string) : null);
          if (hit) {
            const id = hit.object.userData.nodeId as string;
            const point = positionsRef.get(id);
            if (point) {
              controls.target.set(point.x, point.y, point.z);
              controls.update();
              renderer.render(scene, cam);
            }
          }
        };
        element.addEventListener('pointerdown', onPointerDown);

        const clearGroup = (group: ThreeGroup) => {
          for (const child of [...group.children]) group.remove(child);
        };

        const applyData: ThreeRuntime['applyData'] = (visibleNodes, visibleEdges, positions) => {
          positionsRef = positions;
          clearGroup(nodeGroup);
          clearGroup(edgeGroup);
          meshes.length = 0;
          for (const material of disposable.splice(0)) material.dispose();

          for (const edge of visibleEdges) {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            if (!from || !to) continue;
            const mid = new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2 + 0.9, (from.z + to.z) / 2);
            const curve = new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(from.x, from.y, from.z), mid, new THREE.Vector3(to.x, to.y, to.z),
            );
            const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
            const suggested = edge.data?.review === 'suggested';
            const structural = edge.data?.structural === true;
            const material = suggested || structural
              ? new THREE.LineDashedMaterial({ color: suggested ? 0xf5b94c : 0x4c617c, dashSize: 0.28, gapSize: 0.2, transparent: true, opacity: 0.72 })
              : new THREE.LineBasicMaterial({ color: 0x78cbd5, transparent: true, opacity: 0.45 });
            const line = new THREE.Line(geometry, material);
            if (suggested || structural) line.computeLineDistances();
            line.userData.signalBearing = !suggested && !structural && edge.data?.signal !== false;
            edgeGroup.add(line);
            disposable.push(geometry, material);
          }

          for (const node of visibleNodes) {
            const point = positions.get(node.id);
            if (!point) continue;
            const privacy = nodePrivacy(node);
            const draft = node.data.status === 'draft';
            const material = new THREE.MeshStandardMaterial({
              color: point.color,
              emissive: point.color,
              emissiveIntensity: node.id === selectedRef.current ? 1.2 : 0.35,
              transparent: true,
              opacity: draft ? 0.45 : 1,
              roughness: 0.42,
              metalness: 0.12,
            });
            const mesh = new THREE.Mesh(sphere, material);
            mesh.position.set(point.x, point.y, point.z);
            mesh.userData.nodeId = node.id;
            mesh.scale.setScalar(privacy === 'restricted' ? 0.72 : 1);
            nodeGroup.add(mesh);
            meshes.push(mesh);
            disposable.push(material);
          }
          renderer.render(scene, cam);
        };

        const dispose = () => {
          window.cancelAnimationFrame(frame);
          element.removeEventListener('pointerdown', onPointerDown);
          observer.disconnect();
          controls.dispose();
          clearGroup(nodeGroup);
          clearGroup(edgeGroup);
          sphere.dispose();
          for (const item of disposable) item.dispose();
          renderer.dispose();
          element.remove();
        };

        runtime = { applyData, setCamera: (name) => {
          const next = cameraPreset(name);
          cam.position.set(...next.position);
          controls.target.set(...next.target);
          controls.update();
          renderer.render(scene, cam);
        }, focus: (id) => {
          const point = positionsRef.get(id);
          if (!point) return;
          controls.target.set(point.x, point.y, point.z);
          cam.position.set(point.x + 7, point.y + 5, point.z + 9);
          controls.update();
          renderer.render(scene, cam);
        }, renderOnce, dispose };
        runtimeRef.current = runtime;
        setWebglAvailable(true);
        runtime.applyData(filtered.nodes, filtered.edges, positions);
      } catch (error) {
        canvas?.remove();
        if (!disposed) {
          setWebglAvailable(false);
          setRuntimeError(error instanceof Error ? error.message : '3D renderer could not be started.');
        }
      }
    })();

    return () => {
      disposed = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      canvas?.remove();
    };
  }, [reducedMotion]);

  useEffect(() => {
    runtimeRef.current?.applyData(filtered.nodes, filtered.edges, positions);
  }, [filtered.nodes, filtered.edges, positions, selectedNodeId]);

  useEffect(() => {
    if (reducedMotion) runtimeRef.current?.renderOnce();
  }, [reducedMotion, filtered, positions]);

  const applyCamera = (name: CameraPreset) => {
    setCameraName(name);
    runtimeRef.current?.setCamera(name);
  };

  const selectedPoint = selectedNodeId ? positions.get(selectedNodeId) : undefined;
  const copyPosition = () => {
    if (!selectedNodeId || !selectedPoint) return;
    const point: Point3 = { x: selectedPoint.x, y: selectedPoint.y, z: selectedPoint.z };
    setPos3(selectedNodeId, point);
  };

  return (
    <div className="universe-shell" data-testid="cognitive-universe">
      <section className="universe-stage">
        <div className="universe-header">
          <div>
            <div className="panel-kicker">PERSONAL COGNITIVE UNIVERSE</div>
            <h2>Your dimensions, in relation</h2>
            <p>Educational conceptual map · not a brain scan · not a diagnosis</p>
          </div>
          <div className="universe-header-actions">
            <span>{filtered.nodes.length}/{nodes.length} nodes</span>
            <span>{filtered.signalEdges.length} signal links</span>
            <span>{filtered.suggestedEdges.length} suggestions</span>
          </div>
        </div>

        <div className="universe-toolbar" role="toolbar" aria-label="3D universe controls">
          <div className="dimension-chips" aria-label="Dimension filter">
            <button className={`chip-button ${dimensionFilter === 'all' ? 'active' : ''}`} onClick={() => setDimensionFilter('all')}>All</button>
            {PERSONAL_DIMENSIONS.map((dimension) => (
              <button key={dimension.id} className={`chip-button ${dimensionFilter === dimension.id ? 'active' : ''}`} onClick={() => setDimensionFilter(dimension.id)}>{dimension.short}</button>
            ))}
          </div>
          <div className="universe-tools">
            <input aria-label="Search 3D universe" placeholder="Find a node…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button className={`icon-button small ${secureView ? 'active' : ''}`} onClick={toggleSecureView} title={secureView ? 'Hide protected entries' : 'Reveal protected entries'} aria-label={secureView ? 'Hide protected entries' : 'Reveal protected entries'}>
              {secureView ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            {(['front', 'side', 'top', 'iso'] as CameraPreset[]).map((preset) => (
              <button key={preset} className={`view-chip ${camera === preset ? 'active' : ''}`} onClick={() => applyCamera(preset)}>{preset.toUpperCase()}</button>
            ))}
            <button className="icon-button small" title="Focus selected node" aria-label="Focus selected node" onClick={() => selectedNodeId && runtimeRef.current?.focus(selectedNodeId)}><Focus size={14} /></button>
            <button className="icon-button small" title="Fit whole universe" aria-label="Fit whole universe" onClick={() => applyCamera('iso')}><Maximize2 size={14} /></button>
          </div>
        </div>

        <div className="universe-canvas-host" ref={hostRef}>
          {webglAvailable === false && (
            <div className="cog3d-fallback" role="img" aria-label="Accessible list view of the personal cognitive universe">
              <ShieldAlert size={18} />
              <strong>3D rendering unavailable here — accessible list view active</strong>
              <span>{runtimeError || 'WebGL is not available. All content remains reachable in the 2D map and this list.'}</span>
            </div>
          )}
        </div>

        <div className="universe-legend">
          <span><i className="solid" /> Confirmed / signal-bearing</span>
          <span><i className="dashed" /> Suggested or structural (never propagates)</span>
          <span><i className="protected" /> Protected entry</span>
          <span>3D position is independent from 2D position</span>
        </div>
      </section>

      <aside className="universe-side">
        <div className="panel-kicker">FOCUS & REVIEW</div>
        {selectedNode ? (
          <>
            <div className="panel-heading">{displayLabel(selectedNode, secureView)}</div>
            <p className="panel-copy">{PERSONAL_DIMENSIONS.find((dimension) => dimension.id === (selectedNode.data.dimension ?? 'life-timeline'))?.description ?? 'A self-reported dimension.'}</p>
            <div className="focus-actions">
              <button onClick={() => selectedNodeId && runtimeRef.current?.focus(selectedNodeId)}><Crosshair size={13} /> Focus in 3D</button>
              <button onClick={copyPosition} disabled={!selectedPoint}><Maximize2 size={13} /> Keep 3D position</button>
              <button onClick={() => selectedNodeId && syncPos3To2D(selectedNodeId)} disabled={!selectedPoint}><Focus size={13} /> Explicitly sync to 2D</button>
            </div>
            <div className="connected-heading"><span>Reviewable relationships</span><strong>{selectedRelationships.length}</strong></div>
            <div className="relationship-review-list">
              {selectedRelationships.map((relationship, index) => (
                <RelationshipReviewCard key={`${relationship.source}-${relationship.destination}-${index}`} relationship={relationship} />
              ))}
              {!selectedRelationships.length && <p className="muted-note">No relationships recorded for this node yet.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="panel-heading">Select a node</div>
            <p className="panel-copy">Pick a node in 3D or in the 2D map. Selection stays synchronised between both views and the Inspector.</p>
          </>
        )}

        <details className="accessible-node-list">
          <summary>Accessible node list ({filtered.nodes.length})</summary>
          <ul>
            {filtered.nodes.map((node) => (
              <li key={node.id}>
                <button onClick={() => setSelectedNode(node.id)}>{displayLabel(node, secureView)}</button>
                <small>{node.data.kind} · {nodePrivacy(node)}</small>
              </li>
            ))}
          </ul>
        </details>
        {filtered.hiddenCount > 0 && !secureView && <div className="privacy-notice">{filtered.hiddenCount} protected entr{filtered.hiddenCount === 1 ? 'y is' : 'ies are'} hidden. Enable secure view to review.</div>}
      </aside>
    </div>
  );
}
