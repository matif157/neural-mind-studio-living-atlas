"""Build a procedural educational anatomical brain GLB with Blender.

This asset is a stylised teaching model, not a scan, not patient-specific, and
not a map of any personal thought. Run:
  blender --background --python scripts/build_brain_asset.py
"""
import os
import bpy


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.textures):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(name, color, roughness=0.72, subsurface=0.12):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    subsurface_input = bsdf.inputs.get('Subsurface Weight')
    if subsurface_input is not None:
        subsurface_input.default_value = subsurface
    return material


def make_noise(name, noise_scale, depth=4):
    texture = bpy.data.textures.new(name, type='CLOUDS')
    texture.noise_scale = noise_scale
    texture.noise_depth = depth
    texture.contrast = 1.25
    return texture


def add_blob(name, location, scale, material, displacements):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for index, (strength, noise_scale) in enumerate(displacements):
        modifier = obj.modifiers.new(f'{name}-gyri-{index}', 'DISPLACE')
        modifier.texture = make_noise(f'{name}-noise-{index}', noise_scale)
        modifier.strength = strength
        modifier.mid_level = 0.5
        modifier.texture_coords = 'LOCAL'
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(material)
    return obj


def add_brainstem(name, location, scale, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=2, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(material)
    return obj


def build():
    clear_scene()
    cortex = make_material('Cortical tissue', (0.74, 0.48, 0.48), subsurface=0.16)
    cerebellum_mat = make_material('Cerebellar tissue', (0.63, 0.36, 0.39), subsurface=0.1)
    stem_mat = make_material('Brainstem tissue', (0.79, 0.60, 0.55), subsurface=0.1)
    fissure_mat = make_material('Longitudinal fissure', (0.24, 0.16, 0.20), roughness=0.9, subsurface=0.0)

    displacements = [(0.22, 2.8), (0.075, 8.5)]
    left = add_blob('Left hemisphere', (0.58, 0.08, 0.18), (0.92, 1.34, 0.92), cortex, displacements)
    right = add_blob('Right hemisphere', (-0.58, 0.08, 0.18), (0.92, 1.34, 0.92), cortex, displacements)
    left.rotation_euler[1] = 0.04
    right.rotation_euler[1] = -0.04

    add_blob('Cerebellum', (0.0, -1.02, -0.58), (0.86, 0.58, 0.52), cerebellum_mat, [(0.13, 4.5), (0.04, 12.0)])
    add_brainstem('Brainstem', (0.0, -0.22, -1.06), (0.22, 0.24, 0.72), stem_mat)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, 0.12, 0.28))
    fissure = bpy.context.object
    fissure.name = 'Longitudinal fissure'
    fissure.scale = (0.055, 1.46, 0.82)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    fissure.data.materials.append(fissure_mat)

    # A small teaching label anchor; no personal data is embedded in the asset.
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 1.45))
    bpy.context.object.name = 'EDUCATIONAL_MODEL_ANCHOR'

    output = os.path.join('public', 'models', 'brain')
    os.makedirs(output, exist_ok=True)
    filepath = os.path.join(output, 'anatomical-brain.glb')
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
    )
    print(f'Wrote {filepath}')


if __name__ == '__main__':
    build()
