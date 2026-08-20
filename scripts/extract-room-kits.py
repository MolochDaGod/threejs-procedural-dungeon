"""Isolate named pieces from fused Documents GLBs. Headless Blender 4.2."""
import bpy
import os
import math
from mathutils import Vector

OUT = r"F:\GitHub\threejs-procedural-dungeon\public\models\props"
os.makedirs(OUT, exist_ok=True)

KEEP_MODULAR = {
    "Wall_Piece", "Pillar", "Wall_Stones_A", "Wall_Stones_B", "Wall_Stones_C",
    "Wall_Stones_D", "Wall_Stones_E", "Wall_Stones_F",
    "Brick_A", "Brick_B", "Brick_c", "Brick_D", "Brick_e",
    "Sconce", "Barrel", "Table_Small", "Chair_Dining", "Table_Dinner",
    "Chest_A_", "Chest_B_", "Door", "Floor", "Coffin_A", "Coffin_B",
    "Blood_Fountain", "Staircase", "Wall_Piece_Door", "Wall_Piece_Arch",
    "Floor_TrapDoor", "Skull_", "Bone_", "BookCase_A", "Pulpit",
}


def nuke():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures):
        for item in list(block):
            block.remove(item)


def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)


def export_glb(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_animations=False,
        export_skins=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )


def shrink_images(max_px=1024):
    for img in bpy.data.images:
        if not img.size[0]:
            continue
        w, h = img.size[0], img.size[1]
        if w <= max_px and h <= max_px:
            continue
        scale = max_px / float(max(w, h))
        img.scale(max(1, int(w * scale)), max(1, int(h * scale)))


def origin_bottom(obj):
    if obj.type != "MESH" or not obj.data.vertices:
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mw = obj.matrix_world
    ys = [(mw @ v.co).z for v in obj.data.vertices]
    mn = min(ys)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location.z -= (obj.matrix_world.translation.z - (obj.location.z - (obj.dimensions.z / 2.0)))
    obj.select_set(False)


def keep_named(keep):
    for o in list(bpy.data.objects):
        base = o.name.split(".")[0]
        if o.type == "EMPTY":
            continue
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        parent = o.parent.name.split(".")[0] if o.parent else ""
        ok = base in keep or parent in keep
        if not ok:
            for k in keep:
                if base == k or parent == k:
                    ok = True
                    break
        if not ok:
            bpy.data.objects.remove(o, do_unlink=True)


print("=== modular dungeon prototypes ===")
nuke()
import_glb(r"C:\Users\nugye\Documents\modular_dungeon.glb")
keep_named(KEEP_MODULAR)
# Drop numbered duplicates that slipped through (Pillar001 etc.)
for o in list(bpy.data.objects):
    n = o.name.split(".")[0]
    if any(ch.isdigit() for ch in n[-3:]):
        bpy.data.objects.remove(o, do_unlink=True)
print("kept", [o.name for o in bpy.data.objects if o.type == "MESH"][:80], "count", len([o for o in bpy.data.objects if o.type == "MESH"]))
export_glb(os.path.join(OUT, "modular-dungeon-kit.glb"))

print("=== gothic wall torch ===")
nuke()
import_glb(r"C:\Users\nugye\Documents\ga_free_451_stylized_gothic_wall_torch.glb")
shrink_images(1024)
export_glb(os.path.join(OUT, "gothic-wall-torch.glb"))

print("=== rainforest temple compress ===")
nuke()
import_glb(r"C:\Users\nugye\Documents\rainforst_tample.glb")
shrink_images(512)
export_glb(os.path.join(OUT, "rainforest-temple.glb"))

print("=== smelter 5 versions ===")
nuke()
import_glb(r"C:\Users\nugye\Documents\5_versions_of_stylized_smelter.glb")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
xs = []
for o in meshes:
    bpy.context.view_layer.update()
    xs.append((o.matrix_world.translation.x, o))
xs.sort(key=lambda t: t[0])
if not xs:
    raise SystemExit("no smelter meshes")
xmin, xmax = xs[0][0], xs[-1][0]
span = max(0.001, xmax - xmin)
bins = [[] for _ in range(5)]
for x, o in xs:
    i = min(4, int(((x - xmin) / span) * 5))
    bins[i].append(o)
# If clustering collapsed, split by index order
if sum(1 for b in bins if b) < 3:
    bins = [[] for _ in range(5)]
    for i, (_, o) in enumerate(xs):
        bins[i % 5].append(o)

joined = []
for i, group in enumerate(bins):
    if not group:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in group:
        o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    bpy.ops.object.join()
    active = bpy.context.view_layer.objects.active
    active.name = f"smelter_{i}"
    joined.append(active)

keep = {o.name for o in joined}
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name not in keep and not o.name.startswith("smelter_"):
        bpy.data.objects.remove(o, do_unlink=True)
print("smelters", [o.name for o in bpy.data.objects if o.type == "MESH"])
export_glb(os.path.join(OUT, "smelter-kit.glb"))
print("DONE")
