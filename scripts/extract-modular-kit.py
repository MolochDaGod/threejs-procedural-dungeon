"""Keep unique modular_dungeon prototypes. Drop Pillar001-style clones."""
import bpy
import os
import re

OUT = r"F:\GitHub\threejs-procedural-dungeon\public\models\props\modular-dungeon-kit.glb"
SRC = r"C:\Users\nugye\Documents\modular_dungeon.glb"
CLONE = re.compile(r"\d{3}")
KEEP_PREFIX = (
    "Wall_Piece", "Pillar", "Wall_Stones_", "Brick_",
    "Sconce", "Barrel", "Table_Small", "Chair_Dining", "Table_Dinner",
    "Chest_A_", "Chest_B_", "Door", "Floor", "Coffin_A", "Coffin_B",
    "Blood_Fountain", "Staircase", "Skull_", "Bone_", "BookCase_A",
    "Pulpit", "Floor_TrapDoor",
)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SRC)

kept = []
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    n = o.name.split(".")[0]
    base = n.split(" - ")[0]
    if CLONE.search(base):
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    if not any(base.startswith(p) for p in KEEP_PREFIX):
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    kept.append(o.name)

# Drop leftover empties
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)

print("KEPT", len(kept), kept)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_animations=False,
    export_skins=False,
    export_cameras=False,
    export_lights=False,
)

# Shrink torch further
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\nugye\Documents\ga_free_451_stylized_gothic_wall_torch.glb")
for img in bpy.data.images:
    if not img.size[0]:
        continue
    w, h = img.size[0], img.size[1]
    mx = 512
    if w > mx or h > mx:
        s = mx / float(max(w, h))
        img.scale(max(1, int(w * s)), max(1, int(h * s)))
bpy.ops.export_scene.gltf(
    filepath=r"F:\GitHub\threejs-procedural-dungeon\public\models\props\gothic-wall-torch.glb",
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_animations=False,
    export_skins=False,
)
print("DONE modular+torch")
