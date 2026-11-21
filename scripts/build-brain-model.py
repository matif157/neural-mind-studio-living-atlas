"""Build an original stylized educational brain sculpture as a GLB asset.

This is an illustrative anatomical reference, not a clinical model. The app's
thought/emotion/memory nodes remain a separate conceptual graph and are never
mapped to anatomical brain regions.
"""
from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

OUT = Path(__file__).resolve().parents[1] / "public" / "models" / "conceptual-brain.glb"


def pbr(color, metallic=0.08, roughness=0.66):
    return PBRMaterial(
        name="NeuralMindSoftPBR",
        baseColorFactor=[int(color[0]), int(color[1]), int(color[2]), 255],
        metallicFactor=metallic,
        roughnessFactor=roughness,
        doubleSided=True,
    )


def cortical_hemisphere(side: int, seed: int) -> trimesh.Trimesh:
    """Closed ellipsoidal hemisphere reference with irregular gyri-like relief."""
    sphere = trimesh.creation.icosphere(subdivisions=6, radius=1.0)
    direction = sphere.vertices.copy()
    dx, dy, dz = direction[:, 0], direction[:, 1], direction[:, 2]
    longitude = np.arctan2(dz, dx)
    latitude = np.arcsin(np.clip(dy, -1.0, 1.0))

    # Curving multi-scale ridges avoid a regular grid-like or checkerboard surface.
    field_a = np.sin(12.4 * latitude + 2.0 * np.sin(5.6 * longitude + seed * 0.4))
    field_b = np.sin(15.2 * longitude - 2.8 * np.sin(4.6 * latitude + seed))
    field_c = np.cos(21.0 * latitude - 6.4 * longitude + seed * 0.7)
    field_d = np.sin(27.0 * longitude + 8.5 * latitude + 1.3 * np.sin(3.2 * longitude))
    folded = 0.52 * field_a + 0.29 * field_b + 0.13 * field_c + 0.06 * field_d
    relief = 1.0 + 0.043 * np.tanh(1.35 * folded)

    # Broad anatomical shaping: frontal and temporal fullness, modest posterior taper.
    frontal = 0.035 * np.exp(-((dz - 0.78) / 0.30) ** 2) * (0.45 + 0.55 * (1.0 - dy * dy))
    temporal = 0.035 * np.exp(-((dy + 0.36) / 0.30) ** 2) * np.exp(-((dz - 0.05) / 0.75) ** 2)
    taper = 1.0 - 0.035 * np.clip(-dz, 0, 1)
    relief = relief + frontal + temporal - (1.0 - taper)

    # Two separate closed lobes leave a visible longitudinal fissure at the midline.
    sx = 0.72 * relief
    sy = 0.94 * relief
    sz = 1.06 * relief
    vertices = np.column_stack((
        side * 0.785 + dx * sx,
        dy * sy + 0.025,
        dz * sz,
    ))
    mesh = trimesh.Trimesh(vertices=vertices, faces=sphere.faces.copy(), process=True)
    mesh.fix_normals()
    mesh.visual = trimesh.visual.TextureVisuals(material=pbr((120, 139, 218) if side < 0 else (151, 130, 225), 0.10, 0.62))
    return mesh


def lobulated_cerebellum() -> trimesh.Trimesh:
    sphere = trimesh.creation.icosphere(subdivisions=5, radius=1.0)
    d = sphere.vertices.copy()
    lon = np.arctan2(d[:, 2], d[:, 0])
    lat = np.arcsin(np.clip(d[:, 1], -1.0, 1.0))
    folia = np.sin(19.0 * lat + 2.4 * np.sin(5.0 * lon)) * 0.7 + np.sin(13.0 * lon + 4.0 * lat) * 0.3
    radial = 1.0 + 0.035 * np.tanh(folia * 1.4)
    vertices = d * radial[:, None] * np.array([0.55, 0.39, 0.44])[None, :]
    vertices += np.array([0.0, -0.70, -0.73])[None, :]
    mesh = trimesh.Trimesh(vertices=vertices, faces=sphere.faces.copy(), process=True)
    mesh.fix_normals()
    mesh.visual = trimesh.visual.TextureVisuals(material=pbr((83, 164, 173), 0.06, 0.72))
    return mesh


def curved_tube(points, radii, color):
    points = np.asarray(points, dtype=float)
    tangents = np.gradient(points, axis=0)
    tangents /= np.linalg.norm(tangents, axis=1, keepdims=True) + 1e-9
    vertices = []
    sides = 24
    for point, tangent, radius in zip(points, tangents, radii):
        reference = np.array([1.0, 0.0, 0.0])
        if abs(np.dot(reference, tangent)) > 0.9:
            reference = np.array([0.0, 0.0, 1.0])
        u = np.cross(tangent, reference); u /= np.linalg.norm(u) + 1e-9
        v = np.cross(tangent, u); v /= np.linalg.norm(v) + 1e-9
        for index in range(sides):
            angle = 2.0 * np.pi * index / sides
            vertices.append(point + radius * (np.cos(angle) * u + np.sin(angle) * v))
    faces = []
    for row in range(len(points) - 1):
        for col in range(sides):
            a = row * sides + col
            b = row * sides + (col + 1) % sides
            c = (row + 1) * sides + (col + 1) % sides
            d = (row + 1) * sides + col
            faces.extend(((a, d, b), (b, d, c)))
    start_center = len(vertices)
    end_center = start_center + 1
    vertices.extend([points[0].tolist(), points[-1].tolist()])
    first_ring = 0
    last_ring = (len(points) - 1) * sides
    for col in range(sides):
        nxt = (col + 1) % sides
        faces.append((start_center, first_ring + nxt, first_ring + col))
        faces.append((end_center, last_ring + col, last_ring + nxt))
    mesh = trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=True)
    mesh.fix_normals()
    mesh.visual = trimesh.visual.TextureVisuals(material=pbr(color, 0.04, 0.72))
    return mesh


scene = trimesh.Scene()
scene.add_geometry(cortical_hemisphere(-1, 2), node_name="left_cerebral_hemisphere")
scene.add_geometry(cortical_hemisphere(1, 5), node_name="right_cerebral_hemisphere")
scene.add_geometry(lobulated_cerebellum(), node_name="cerebellum_reference")
scene.add_geometry(curved_tube(
    [(0.0, -0.44, -0.58), (0.0, -0.62, -0.65), (0.0, -0.84, -0.72), (0.0, -1.08, -0.77), (0.0, -1.35, -0.82)],
    [0.19, 0.17, 0.145, 0.12, 0.095],
    (112, 139, 202),
), node_name="brainstem_reference")

OUT.parent.mkdir(parents=True, exist_ok=True)
scene.export(OUT, file_type="glb")
print(f"Created {OUT} ({OUT.stat().st_size:,} bytes)")
for name, mesh in scene.geometry.items():
    print(f"{name}: vertices={len(mesh.vertices)}, faces={len(mesh.faces)}, watertight={mesh.is_watertight}, winding={mesh.is_winding_consistent}")
