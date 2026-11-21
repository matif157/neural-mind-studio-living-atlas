"""Validate the bundled GLB anatomy-reference asset without rendering it."""
from pathlib import Path
import trimesh

asset = Path(__file__).resolve().parents[1] / "public" / "models" / "conceptual-brain.glb"
scene = trimesh.load(asset, force="scene")
meshes = list(scene.geometry.values())
assert len(meshes) == 4, f"Expected 4 anatomical reference meshes, found {len(meshes)}"
assert all(len(mesh.vertices) > 100 for mesh in meshes), "One of the meshes is unexpectedly small"
assert all(mesh.is_winding_consistent for mesh in meshes), "Mesh winding is inconsistent"
assert all(mesh.is_watertight for mesh in meshes), "Every bundled reference mesh should be closed"
assert all(mesh.vertex_normals.shape == mesh.vertices.shape for mesh in meshes), "Missing vertex normals"
print(f"PASS: {asset.name} — {len(meshes)} meshes, {sum(len(m.vertices) for m in meshes):,} vertices, {sum(len(m.faces) for m in meshes):,} faces")
print("PASS: all meshes are closed, winding-consistent and have vertex normals")
