import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  BufferGeometry, CanvasTexture, CubicBezierCurve3, Float32BufferAttribute, Group, Mesh,
  Plane, Points, SRGBColorSpace, Vector3,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { MindEdge, MindNode } from '../../types/mind';
import { getMindNodeColor } from '../../types/mind';
import type { Vec3Tuple } from '../../utils/mind3dLayout';

export type Mind3DMode = 'mind' | 'brain' | 'neuron';

export interface SceneNode {
  node: MindNode;
  position: Vec3Tuple;
  masked: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: (node: MindNode) => void;
  onMove?: (node: MindNode, position: Vec3Tuple) => void;
}

export interface SceneEdge {
  edge: MindEdge;
  source: Vec3Tuple;
  target: Vec3Tuple;
  active: boolean;
  selected: boolean;
  dimmed: boolean;
  running: boolean;
  onSelect: (edge: MindEdge) => void;
}

function ControlsRig({ minDistance = 5.4, maxDistance = 15, target = [0, 0, 0] as Vec3Tuple }) {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl.domElement]);
  useEffect(() => {
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<[number, number, number]>).detail;
      if (!detail || detail.length !== 3) return;
      controls.target.set(detail[0], detail[1], detail[2]);
      controls.update();
    };
    window.addEventListener('mind3d:focus', onFocus);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.enablePan = true;
    controls.target.set(target[0], target[1], target[2]);
    controls.update();
    return () => { window.removeEventListener('mind3d:focus', onFocus); controls.dispose(); };
  }, [controls, minDistance, maxDistance, target]);
  useFrame(() => controls.update());
  return null;
}

function StarField() {
  const ref = useRef<Points>(null);
  const geometry = useMemo(() => {
    const count = 1150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let seed = 88117;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < count; i += 1) {
      const radius = 5.2 + random() * 8.0;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const tone = 0.48 + random() * 0.5;
      colors[i * 3] = 0.36 * tone;
      colors[i * 3 + 1] = 0.55 * tone;
      colors[i * 3 + 2] = 0.95 * tone;
    }
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(positions, 3));
    result.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return result;
  }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.003; });
  return <points ref={ref} geometry={geometry}><pointsMaterial size={0.018} vertexColors transparent opacity={0.7} sizeAttenuation depthWrite={false} /></points>;
}

function BrainAsset({ running }: { running: boolean }) {
  const gltf = useLoader(GLTFLoader, '/models/conceptual-brain.glb');
  const brain = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current || !running) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.13) * 0.055;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.17) * 0.018;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.025;
  });
  return (
    <group ref={group} scale={1.05}>
      <primitive object={brain} dispose={null} />
      <mesh scale={[1.44, 0.98, 1.03]}>
        <sphereGeometry args={[1, 52, 36]} />
        <meshBasicMaterial color="#7d9bff" wireframe transparent opacity={0.045} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OrbitArchitecture() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2.4, 0.15, 0.12]}>
        <torusGeometry args={[3.75, 0.006, 5, 180]} />
        <meshBasicMaterial color="#516eaf" transparent opacity={0.34} />
      </mesh>
      <mesh rotation={[1.18, -0.22, 0.38]}>
        <torusGeometry args={[4.25, 0.004, 5, 180]} />
        <meshBasicMaterial color="#8d75e8" transparent opacity={0.19} />
      </mesh>
      <mesh rotation={[0.62, 0.92, -0.24]}>
        <torusGeometry args={[4.8, 0.004, 5, 180]} />
        <meshBasicMaterial color="#53c9d4" transparent opacity={0.13} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#5979c8" wireframe transparent opacity={0.025} />
      </mesh>
    </group>
  );
}

function Dendrite({ color, rotation, length = 0.19 }: { color: string; rotation: [number, number, number]; length?: number }) {
  const curve = useMemo(() => new CubicBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0.075, 0.09, 0.025),
    new Vector3(length * 0.78, -0.025, 0.055),
    new Vector3(length, 0.055, 0.09),
  ), [length]);
  return <mesh rotation={rotation}><tubeGeometry args={[curve, 12, 0.006, 4, false]} /><meshBasicMaterial color={color} transparent opacity={0.64} /></mesh>;
}

function NodeLabel({ text, color, y = 0.32 }: { text: string; color: string; y?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'rgba(5, 10, 23, 0.92)';
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.beginPath();
      context.roundRect(10, 10, 1004, 140, 38);
      context.fill();
      context.stroke();
      context.font = '600 48px Inter, Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#F3F6FF';
      const safeText = text.length > 34 ? `${text.slice(0, 31)}…` : text;
      context.fillText(safeText, 512, 82, 940);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
    return map;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  const width = Math.max(0.88, Math.min(2.25, 0.48 + text.length * 0.035));
  return <sprite position={[0, y, 0]} scale={[width, 0.24, 1]}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
}

function NeuronNode({ node, position, masked, selected, dimmed, onSelect, onMove }: SceneNode) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const { camera } = useThree();
  const color = masked ? '#718096' : getMindNodeColor(node.data);
  const radius = selected ? 0.125 : 0.085 + (node.data.intensity ?? 0.5) * 0.025;

  useFrame((state, delta) => {
    if (!group.current || dragging.current) return;
    group.current.position.y = position[1] + (selected ? 0 : Math.sin(state.clock.elapsedTime * 0.8 + node.id.length) * 0.025);
    const target = selected ? 1.14 : hovered ? 1.08 : 1;
    group.current.scale.lerp(new Vector3(target, target, target), Math.min(1, delta * 5));
  });

  const startDrag = (event: ThreeEvent<PointerEvent>) => {
    if (masked || !onMove) return;
    event.stopPropagation();
    dragging.current = true;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    document.body.style.cursor = 'grabbing';
  };

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !group.current) return;
    event.stopPropagation();
    const normal = camera.getWorldDirection(new Vector3());
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(...position));
    const hit = new Vector3();
    if (event.ray.intersectPlane(plane, hit)) {
      group.current.position.set(hit.x, hit.y, hit.z);
    }
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    dragging.current = false;
    document.body.style.cursor = '';
    if (group.current && onMove) {
      const { x, y, z } = group.current.position;
      onMove(node, [x, y, z]);
    }
  };

  return (
    <group ref={group} position={position}>
      <mesh
        onClick={(event) => { event.stopPropagation(); onSelect(node); }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); if (!dragging.current) document.body.style.cursor = ''; }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={masked ? 0.12 : selected ? 1.15 : hovered ? 0.85 : 0.55} roughness={0.28} metalness={0.32} transparent opacity={dimmed ? 0.2 : 1} />
      </mesh>
      <mesh scale={selected ? 1.78 : 1.48}>
        <sphereGeometry args={[radius, 18, 18]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.13 : 0.065} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0.24, 0.1]}>
        <torusGeometry args={[radius * (selected ? 2.15 : 1.85), 0.006, 5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.1 : selected ? 0.8 : 0.38} />
      </mesh>
      <group scale={selected ? 1.18 : 1}>
        <Dendrite color={color} rotation={[0.4, 0.2, 0.1]} />
        <Dendrite color={color} rotation={[-0.7, 1.2, 0.9]} />
        <Dendrite color={color} rotation={[1.1, -0.8, 2.0]} />
      </group>
      {(selected || hovered) && !masked && <NodeLabel text={node.data.label} color={color} />}
      {selected && <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.28, 0.009, 6, 48]} /><meshBasicMaterial color={color} transparent opacity={0.82} /></mesh>}
    </group>
  );
}

function SynapseLink({ edge, source, target, active, selected, dimmed, running, onSelect }: SceneEdge) {
  const particle = useRef<Mesh>(null);
  const curve = useMemo(() => {
    const a = new Vector3(...source);
    const b = new Vector3(...target);
    const midpoint = a.clone().add(b).multiplyScalar(0.5);
    const lift = new Vector3(0, 0.15 + Math.min(0.45, a.distanceTo(b) * 0.07), 0.12);
    return new CubicBezierCurve3(a, a.clone().lerp(midpoint, 0.6).add(lift), b.clone().lerp(midpoint, 0.6).add(lift), b);
  }, [source, target]);
  const weight = Math.max(0.12, Math.min(1, edge.data?.weight ?? 0.55));
  const color = selected ? '#ffffff' : active ? '#b8caff' : '#6682b8';
  const opacity = dimmed ? 0.055 : selected ? 0.92 : active ? 0.72 : 0.22 + weight * 0.18;
  useFrame((state) => {
    if (!particle.current || !running || (!active && !selected)) return;
    const t = (state.clock.elapsedTime * 0.16 + (edge.id.length % 11) / 11) % 1;
    particle.current.position.copy(curve.getPointAt(t));
  });
  return (
    <group>
      <mesh onClick={(event) => { event.stopPropagation(); onSelect(edge); }}>
        <tubeGeometry args={[curve, 28, selected ? 0.012 : 0.005 + weight * 0.004, 5, false]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {running && (active || selected) && <mesh ref={particle}>
        <sphereGeometry args={[0.035 + weight * 0.018, 12, 12]} />
        <meshBasicMaterial color={selected ? '#ffffff' : '#82e7f2'} />
      </mesh>}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Educational neuron anatomy (System B)                              */
/* This is a biological teaching model. It is never a measurement of */
/* the user's brain activity and is never mapped to personal nodes.   */
/* ------------------------------------------------------------------ */

interface NeuronPartProps {
  id: string;
  label: string;
  selected: string | null;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

function NeuronPart({ id, label, selected, onSelect, children }: NeuronPartProps) {
  const [hovered, setHovered] = useState(false);
  const isSelected = selected === id;
  return (
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(id); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
    >
      {children}
      {(isSelected || hovered) && <NodeLabel text={label} color={isSelected ? '#8ef0ff' : '#9fb4d8'} y={0.62} />}
    </group>
  );
}

function SignalParticle({ running }: { running: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current || !running) return;
    const t = (state.clock.elapsedTime * 0.32) % 1;
    ref.current.position.set(-0.2 + t * 3.0, 0, 0);
    const glow = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
    ref.current.scale.setScalar(glow);
  });
  return <mesh ref={ref}><sphereGeometry args={[0.055, 14, 14]} /><meshBasicMaterial color="#8ef0ff" /></mesh>;
}

function NeuronAnatomy({ selected, onSelect, running }: { selected: string | null; onSelect: (id: string) => void; running: boolean }) {
  const axonCurve = useMemo(() => new CubicBezierCurve3(
    new Vector3(0.48, 0, 0),
    new Vector3(1.1, 0.05, 0),
    new Vector3(1.9, -0.04, 0),
    new Vector3(2.55, 0, 0),
  ), []);
  const dendriteRotations: Array<[number, number, number]> = [
    [0.5, 0.1, 0.3], [-0.6, 0.9, 1.2], [0.9, -0.7, 2.1], [-0.3, 1.7, -0.6], [1.4, 0.4, 1.7], [-1.1, -0.5, 0.8],
  ];
  return (
    <group position={[-0.9, 0.1, 0]} scale={1.55}>
      <NeuronPart id="soma" label="Soma · cell body" selected={selected} onSelect={onSelect}>
        <mesh><sphereGeometry args={[0.52, 40, 32]} /><meshStandardMaterial color="#7fa8e8" roughness={0.32} metalness={0.25} emissive="#2b4a86" emissiveIntensity={0.35} /></mesh>
        <mesh scale={1.08}><sphereGeometry args={[0.52, 26, 20]} /><meshBasicMaterial color="#8fb6ff" wireframe transparent opacity={0.12} /></mesh>
      </NeuronPart>
      <NeuronPart id="nucleus" label="Nucleus" selected={selected} onSelect={onSelect}>
        <mesh><sphereGeometry args={[0.24, 28, 22]} /><meshStandardMaterial color="#c9a6ff" roughness={0.4} emissive="#5a3f96" emissiveIntensity={0.5} /></mesh>
      </NeuronPart>
      <NeuronPart id="dendrite" label="Dendrites" selected={selected} onSelect={onSelect}>
        <group>
          {dendriteRotations.map((rotation, index) => (
            <group key={index} rotation={rotation}>
              <mesh><tubeGeometry args={[new CubicBezierCurve3(
                new Vector3(0.4, 0, 0),
                new Vector3(0.72, 0.08, 0.05),
                new Vector3(0.95, -0.02, 0.12),
                new Vector3(1.22, 0.1, 0.2),
              ), 22, 0.026, 6, false]} /><meshStandardMaterial color="#6fa2e0" roughness={0.45} emissive="#244a80" emissiveIntensity={0.3} /></mesh>
              <mesh position={[1.2, 0.12, 0.2]} rotation={[0, 0, -0.4]}><cylinderGeometry args={[0.005, 0.018, 0.22, 6]} /><meshStandardMaterial color="#8fbcff" /></mesh>
            </group>
          ))}
        </group>
      </NeuronPart>
      <NeuronPart id="axon" label="Axon" selected={selected} onSelect={onSelect}>
        <mesh><tubeGeometry args={[axonCurve, 40, 0.045, 8, false]} /><meshStandardMaterial color="#78b7c9" roughness={0.4} emissive="#1f5a68" emissiveIntensity={0.35} /></mesh>
      </NeuronPart>
      <NeuronPart id="myelin" label="Myelin sheath" selected={selected} onSelect={onSelect}>
        <group>
          {[0.72, 1.28, 1.84].map((x, index) => (
            <mesh key={index} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.085, 0.34, 8, 16]} />
              <meshStandardMaterial color="#e7dcc2" roughness={0.55} metalness={0.08} transparent opacity={0.92} />
            </mesh>
          ))}
        </group>
      </NeuronPart>
      <NeuronPart id="nodes-of-ranvier" label="Nodes of Ranvier" selected={selected} onSelect={onSelect}>
        <group>
          {[1.0, 1.56, 2.12].map((x, index) => (
            <mesh key={index} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.062, 0.014, 6, 20]} />
              <meshStandardMaterial color="#ffd08a" emissive="#8a5a12" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      </NeuronPart>
      <NeuronPart id="terminals" label="Axon terminals" selected={selected} onSelect={onSelect}>
        <group position={[2.62, 0, 0]}>
          {[[0.18, 0.12], [0.2, -0.1], [0.12, 0.02]].map(([x, y], index) => (
            <mesh key={index} position={[x, y, 0]} rotation={[0, 0, Math.atan2(y, x)]}>
              <coneGeometry args={[0.055, 0.16, 10]} />
              <meshStandardMaterial color="#7fd6c4" emissive="#1f6a5c" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      </NeuronPart>
      <NeuronPart id="vesicles" label="Synaptic vesicles" selected={selected} onSelect={onSelect}>
        <group position={[2.82, 0, 0]}>
          {[[0.04, 0.06, 0.03], [-0.02, -0.05, 0.04], [0.08, -0.02, -0.03], [0.0, 0.02, -0.05]].map((p, index) => (
            <mesh key={index} position={p as [number, number, number]}><sphereGeometry args={[0.026, 10, 10]} /><meshStandardMaterial color="#ffc9e6" emissive="#7a3159" emissiveIntensity={0.5} /></mesh>
          ))}
        </group>
      </NeuronPart>
      <NeuronPart id="synapse" label="Synaptic cleft" selected={selected} onSelect={onSelect}>
        <group position={[3.02, 0, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.9, 0.9]} /><meshBasicMaterial color="#5b7fc7" transparent opacity={0.12} side={2} /></mesh>
          <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, 0.06, 28]} /><meshStandardMaterial color="#7c8fb8" roughness={0.6} /></mesh>
        </group>
      </NeuronPart>
      <NeuronPart id="receptors" label="Postsynaptic receptors" selected={selected} onSelect={onSelect}>
        <group position={[3.14, 0, 0]}>
          {[[0.16, 0.16], [0.16, -0.14], [0.05, 0.0], [0.24, 0.02]].map(([y, z], index) => (
            <mesh key={index} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.045, 0.12, 10]} />
              <meshStandardMaterial color="#8ef0ff" emissive="#2a7d8f" emissiveIntensity={0.55} />
            </mesh>
          ))}
        </group>
      </NeuronPart>
      <SignalParticle running={running} />
    </group>
  );
}

function NeuronScene({ selectedPart, onSelectPart, running }: { selectedPart: string | null; onSelectPart: (id: string) => void; running: boolean }) {
  return (
    <>
      <ambientLight intensity={0.72} />
      <pointLight position={[4, 4, 6]} intensity={22} color="#b7ccff" distance={18} />
      <pointLight position={[-4, -3, 2]} intensity={10} color="#6fd8e8" distance={14} />
      <StarField />
      <NeuronAnatomy selected={selectedPart} onSelect={onSelectPart} running={running} />
      <ControlsRig minDistance={3.4} maxDistance={13} target={[1.1, 0, 0]} />
    </>
  );
}

export interface Mind3DSceneProps {
  nodes: SceneNode[];
  edges: SceneEdge[];
  running: boolean;
  mode: Mind3DMode;
  selectedNeuronPart: string | null;
  onSelectNeuronPart: (id: string) => void;
}

function SceneContents({ nodes, edges, running, mode, selectedNeuronPart, onSelectNeuronPart }: Mind3DSceneProps) {
  return (
    <>
      <color attach="background" args={['#050913']} />
      <fog attach="fog" args={['#050913', 9, 18]} />
      <ambientLight intensity={0.62} />
      <pointLight position={[4, 5, 6]} intensity={18} color="#a8bbff" distance={14} />
      <pointLight position={[-5, -2, -3]} intensity={10} color="#60c8d8" distance={12} />
      <pointLight position={[0, 4, -5]} intensity={8} color="#9577e8" distance={10} />
      {mode === 'neuron' ? (
        <NeuronScene selectedPart={selectedNeuronPart} onSelectPart={onSelectNeuronPart} running={running} />
      ) : (
        <>
          <StarField />
          <OrbitArchitecture />
          <Suspense fallback={null}><BrainAsset running={running} /></Suspense>
          {mode === 'mind' && <>
            {edges.map((item) => <SynapseLink key={item.edge.id} {...item} />)}
            {nodes.map((item) => <NeuronNode key={item.node.id} {...item} />)}
          </>}
          <ControlsRig />
        </>
      )}
    </>
  );
}

export default function Mind3DScene(props: Mind3DSceneProps) {
  return (
    <Canvas
      camera={{ position: props.mode === 'neuron' ? [0.6, 1.1, 6.4] : [0, 0.3, 9.6], fov: 43, near: 0.1, far: 60 }}
      dpr={[1, 1.55]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.setClearColor('#050913', 1); }}
      fallback={<div className="mind3d-fallback">Your browser could not initialize WebGL. Switch to the 2D mind editor.</div>}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
