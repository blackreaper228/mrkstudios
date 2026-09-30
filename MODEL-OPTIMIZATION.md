# TV character with original A-Pose body

The body comes from A-Pose - Male Full Body 3D Scan by OverseerThuror (CC BY 4.0). Its original hoodie, neck surface, UVs and 8K photographic atlas are retained. No replacement sweater, fabricated neck or procedural collar is used. Lower body and upper head are cropped; the retained head segment sits inside the TV.

Torso / Neck / Head weights keep the shoulders fixed and smoothly bend the neck. The hidden head follows the TV socket, maintaining overlap during cursor movement. Original old_tv.glb is unchanged byte-for-byte.

Build: python scripts/build-apose-person.py. Requires .tools/person-source.blend and the bundled local Blender runtime. The optimized body has 120,200 triangles and occupies 21.3 MB, compared with approximately 97 MB for the original full scan. The full texture is deliberately retained for quality.

Offline studio renders verify the neutral pose and opposite maximum yaw/pitch poses. tv-person-preview.png is an offline render, not a browser screenshot. Attribution is in /credits/ and assets/person-rig.LICENSE.txt.
