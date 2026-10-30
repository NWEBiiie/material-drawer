# The Sample Room

The homepage displays the **Binder**, **Slanted case**, and **Pocket box** on a compact two-tier open rack with 18 mm shelves and slim 14 mm supports. The **Wave drawer** sits directly on the floor in its own cabinet alongside, with clear pull-out space. The free CC0 [Man model by Quaternius](https://poly.pizza/m/HMnuH5geEG), scaled to 1.75 m, can be hidden with the person icon to restore the close view. All four retain the same physical scale in metres; models are not individually resized to fill compartments. Click a model or its label to zoom toward it and open its interactive study. Each study has a back-to-shelf button and four persistent model switches. Archive opens the previous cabinet at `archive.html`, including its local material editing tools and saved collections.

Each current study has eighteen square material cuts at their original thickness. Samples detach, flip to their information cards, and return to their saved mounting positions. The binder retains four corner snaps. Every sample is connected to a modeled retractable reel, with continuous cable extension during pickup and return. Inspection frames the sample, cable, and reel together, revealing the recessed reel at its actual attachment position. The wave drawer includes the phased camshaft, roller followers, return springs, and cutaway controls.

Reel reference: [RUIWOR RW5101](https://www.ruiwor.com/rw5101-round-mini-anti-lost-recoiler-eyelet-terminal-with-ring-terminal-inner-hole-3mm-4mm-5mm-for-option-product/), Ø25.2 × 8.3 mm housing (27.2 mm including the outlet), 0.6 mm cable, 550 mm travel. This was the smallest suitable housing with published dimensions found in the comparison. See `tether-source.json`. Housing surface details, recesses and adapter brackets are design proposals, not manufacturer CAD; the return force takes up cable slack rather than hoisting the sample.

Blender models, animated GLBs, and source packages are available through each study's information button. `build-tethers.py` adds hardware to the existing study models; the optional arguments after the checkout path select `binder`, `case`, `wave`, or `pockets`. The viewer uses the exported outlet and eyelet nodes to animate the cables. Dimensions and animations are retained by `compact-glb.cjs`, which only shares duplicate binary buffers.

## Archived cabinet

A minimal, real-time 3D material library in a wooden cabinet. Solid meshes, lighting, cast shadows and an orthographic camera replace the earlier CSS panel scene. Four independent pull-outs have their own sample counts and texture assignments. Only one collection opens at a time; the others remain still.

The right-hand icons follow the physical shelf order, from top to bottom:

- Foam tray with twelve solid material blocks, with material names etched into their upper faces. Hover or keyboard focus lifts a block and shows its name and finish; click or tap opens inspection.
- Ivory sample box with a raised lid and six slanted bare samples by default. Each sample and its thinner side name card have separate fitted grooves cut at the same angle through the foam. Hover slides both together along that angle, preserving their rotation and clearance. The number of fitted grooves follows the chosen sample count, up to ten.
- Sample binder in an ivory case. Three modeled rings hold four turnable pages, with six material swatches per page and popper snap mounts behind each swatch. The open landscape book rests on a fitted foam cradle, with two thick covers, a central metal spine and three rings. Pages turn over the spine and settle flat on the other cover, revealing the snap backs. Scroll, swipe, right-side arrows or arrow/Page keys turn pages. Hover lifts a swatch to reveal its mounting.
- The original acrylic collection, open by default. Twenty-four thick frosted acrylic holders enclose solid material cores. Scroll or use up/down, Home/End and Page Up/Down to browse. The whole open drawer moves along its runners while the focused sample stays centered; the cabinet and closed drawers stay still. Material names are etched into the upper corner of each acrylic holder.

Drag the scene to orbit. The bottom-left controls enable touch rotation, reset the axonometric view and change zoom. Scroll, swipe, arrow keys or the bottom-right controls browse materials or turn binder pages. Hover details stay hidden until needed. Click or tap a sample for inspection and saving to a browser-local board. Keyboard users can also focus the accessible sample list or press Enter on the canvas. Boards export as SVG with embedded material images.

## Local materials

Use the folder-plus icon at the upper right to edit a cabinet. Choose the cabinet and set its sample count: 1–24 acrylic holders, 1–30 binder swatches (up to five pages), 1–10 slanted panels, or 1–12 foam blocks. Counts are independent, and reducing a count preserves hidden texture assignments if you increase it again.

New samples start with a neutral textured surface. Click any sample in the 3D view or cabinet grid, then click its preview or **Replace image** to choose a local image. This replaces only that slot; filenames become sample names. The same dialog can reuse an imported image or restore the default texture. Canceling a picker or choosing an unreadable file preserves the previous texture.

**Fill from images**, **Choose folder**, or dropping files fills only the selected cabinet and sets its count to the number of unique supported images, within that cabinet's capacity. Extra images remain in the local library. The library selector and **Fill cabinet** also let you use the included collection, all imported images, or an individual imported folder. Dropping an image while a sample dialog is open replaces that sample instead.

Cabinet counts and assignments are saved in localStorage; imported images are saved in IndexedDB. Existing users who previously selected a local collection keep those materials on the first upgrade. Each cabinet can then be edited independently.

Supported inputs: JPG, PNG, WebP, AVIF, GIF and BMP. Animated images use a still frame. The library holds up to 120 images, at most 20 MB per source image. Images are resized to a maximum 1536-pixel edge and stored in IndexedDB in this browser; 3D surfaces use 512-pixel textures. Duplicate contents are skipped. Invalid or unsupported files are reported without preventing the other files from importing.

The browser opens the native file/folder picker. It cannot read arbitrary local paths or continuously watch a folder. Selecting a folder copies its supported images into the local library. Re-select it to add new images. No imported images or folder contents are sent to GitHub or any server. Browser storage is specific to the site and browser, may be unavailable in restricted/private modes, and is removed when site data is cleared. If saving fails, the current visit can still use the images. Remove an imported image with its × button.

## Running and hosting

Serve this directory over HTTP(S); no build step required. GitHub Pages publishes `main` / repository root. `index.html` is the shelf overview; studies are `binder.html`, `case.html`, and `mini.html?view=wave` or `mini.html?view=pockets`. The previous cabinet starts at `archive.html` and uses `room.js`, `scene-3d.js`, `cabinet-library.js`, `room-3d.css`, `materials.js` and `material-textures.js`. Three.js 0.180.0 is vendored locally in `three.module.min.js` and `three.core.min.js`; see `LICENSE-three.txt`. Runtime assets are self-contained, with no CDN or analytics requests. Older CSS scene files are retained as unused legacy sources.

WebGL2 is required for the 3D scene. When unavailable, a gallery still supports material inspection and importing. Reduced motion removes animated transitions. Included procedural surfaces are illustrative studies; import material photos for your own collection.
