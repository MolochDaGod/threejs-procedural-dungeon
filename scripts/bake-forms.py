"""Bake iguana (FantasyPack1) + stylized bear GLBs, one skin per race. PBR + normal."""
import bpy
import os
from mathutils import Vector

SRC = r"C:\Users\nugye\Desktop\FRESH GRUDGE\Assets\FantasyPack1\iguana"
OUT = r"F:\GitHub\threejs-procedural-dungeon\public\models\forms"
TEX = os.path.join(SRC, "textures")
FBX = os.path.join(SRC, "iguana.fbx")

RACE_ALBEDO = {
    "human": "Iguana_green.png",
    "barbarian": "Iguana_pink.png",
    "elf": "Iguana_pink.png",
    "dwarf": "Iguana_green.png",
    "orc": "Iguana_green.png",
    "undead": "Iguana_blue.png",
}
RACE_TINT = {
    "human": (0.45, 0.62, 0.32),
    "barbarian": (0.72, 0.28, 0.18),
    "elf": (0.85, 0.45, 0.62),
    "dwarf": (0.32, 0.48, 0.22),
    "orc": (0.28, 0.55, 0.20),
    "undead": (0.35, 0.48, 0.62),
}
NRML = os.path.join(TEX, "Iguana_nrml.png")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def principled(albedo_path, tint, name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(albedo_path)
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 0.55
    mix.inputs[2].default_value = (*tint, 1)
    nt.links.new(tex.outputs["Color"], mix.inputs[1])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    if os.path.isfile(NRML):
        ntex = nt.nodes.new("ShaderNodeTexImage")
        ntex.image = bpy.data.images.load(NRML)
        ntex.image.colorspace_settings.name = "Non-Color"
        nrm = nt.nodes.new("ShaderNodeNormalMap")
        nrm.inputs["Strength"].default_value = 1.15
        nt.links.new(ntex.outputs["Color"], nrm.inputs["Color"])
        nt.links.new(nrm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    return mat


def normalize_height(obj, meters=1.65):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mn = Vector((min(v.co.x for v in obj.data.vertices), min(v.co.y for v in obj.data.vertices), min(v.co.z for v in obj.data.vertices)))
    mx = Vector((max(v.co.x for v in obj.data.vertices), max(v.co.y for v in obj.data.vertices), max(v.co.z for v in obj.data.vertices)))
    h = max(mx.z - mn.z, 0.01)
    s = meters / h
    obj.scale = (s, s, s)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # feet on z=0
    zs = [v.co.z for v in obj.data.vertices]
    dz = -min(zs)
    for v in obj.data.vertices:
        v.co.z += dz


def export_glb(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_skins=True,
        export_animations=True,
        export_yup=True,
    )


def bake_iguana():
    bpy.ops.import_scene.fbx(filepath=FBX, automatic_bone_orientation=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("no iguana mesh")
    root = meshes[0]
    for race, albedo in RACE_ALBEDO.items():
        reset()
        bpy.ops.import_scene.fbx(filepath=FBX, automatic_bone_orientation=True)
        meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        mat = principled(os.path.join(TEX, albedo), RACE_TINT[race], f"ig_{race}")
        for m in meshes:
            m.data.materials.clear()
            m.data.materials.append(mat)
            normalize_height(m, 1.65)
        export_glb(os.path.join(OUT, "iguana", f"{race}.glb"))
        print("iguana", race)


def make_bear(tint):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.42, location=(0, 0, 0.55))
    body = bpy.context.object
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.26, location=(0.38, 0, 0.72))
    head = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.09, depth=0.38, location=(0.22, 0.16, 0.22))
    l1 = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.09, depth=0.38, location=(0.22, -0.16, 0.22))
    l2 = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.09, depth=0.38, location=(-0.22, 0.16, 0.22))
    l3 = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.09, depth=0.38, location=(-0.22, -0.16, 0.22))
    l4 = bpy.context.object
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.08, location=(-0.42, 0, 0.62))
    tail = bpy.context.object
    parts = [body, head, l1, l2, l3, l4, tail]
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    bear = bpy.context.object
    bpy.ops.object.modifier_add(type="SUBSURF")
    bear.modifiers["Subdivision"].levels = 1
    bpy.ops.object.modifier_apply(modifier="Subdivision")
    bpy.ops.object.shade_smooth()
    albedo = os.path.join(TEX, "Iguana_green.png")
    mat = principled(albedo, tint, "bear_mat")
    bear.data.materials.append(mat)
    normalize_height(bear, 1.7)
    return bear


def bake_bear():
    for race, tint in RACE_TINT.items():
        reset()
        make_bear(tint)
        export_glb(os.path.join(OUT, "bear", f"{race}.glb"))
        print("bear", race)


if __name__ == "__main__":
    bake_iguana()
    bake_bear()
    print("DONE")
