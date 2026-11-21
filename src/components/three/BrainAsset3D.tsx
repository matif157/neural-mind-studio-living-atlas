import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * The conceptual sculpture is fetched only when a 3D presentation mounts.
 * Its materials are replaced with presentation-only cyan materials; geometry
 * and personal meaning are unchanged. It is never a brain scan or a map of
 * thoughts to anatomical locations.
 */
export default function BrainAsset3D({ running }: { running: boolean }) {
  const gltf = useLoader(GLTFLoader, '/models/conceptual-brain.glb');
  const brain = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.traverse((object) => {
      if (!(object as Mesh).isMesh) return;
      const mesh = object as Mesh;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = source.map(() => new MeshStandardMaterial({
        color: '#00e6ff',
        emissive: '#00d8f0',
        emissiveIntensity: 1.55,
        roughness: 0.3,
        metalness: 0.18,
        transparent: true,
        opacity: 0.86,
        side: DoubleSide,
        toneMapped: false,
      }));
    });
    return model;
  }, [gltf.scene]);
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current || !running) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.13) * 0.055;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.17) * 0.018;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.025;
  });
  return (
    <group ref={group} scale={1.08}>
      <primitive object={brain} dispose={null} />
      <mesh scale={[1.55, 1.05, 1.13]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color="#00c8e0" transparent opacity={0.06} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={[1.44, 0.98, 1.03]}>
        <sphereGeometry args={[1, 52, 36]} />
        <meshBasicMaterial color="#56dcec" wireframe transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
