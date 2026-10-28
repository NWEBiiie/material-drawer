# The Sample Room

A minimal, real-time 3D material library in a wooden cabinet. Solid meshes, lighting, cast shadows and an orthographic camera replace the earlier CSS panel scene. Four independent pull-outs share a material library. Only one collection opens at a time; the others remain still.

The right-hand icons follow the physical shelf order, from top to bottom:

- Foam tray with twelve solid material blocks, with material names etched into their upper faces. Hover or keyboard focus lifts a block and shows its name and finish; click or tap opens inspection.
- Ivory sample box with a raised lid and six slanted bare stone samples. Closely spaced materials and their side name cards sit deeply in cut foam slots. Each material has modeled thickness. Hover lifts the material and card together, with no acrylic enclosure.
- Sample binder in an ivory case. Three modeled rings hold four turnable pages, with six material swatches per page and popper snap mounts behind each swatch. The open landscape book rests on a fitted foam cradle, with two thick covers, a central metal spine and three rings. Pages turn over the spine and settle flat on the other cover, revealing the snap backs. Scroll, swipe, right-side arrows or arrow/Page keys turn pages. Hover lifts a swatch to reveal its mounting.
- The original acrylic collection, open by default. Twenty-four thick frosted acrylic holders enclose solid material cores. Scroll or use up/down, Home/End and Page Up/Down to browse. The whole open drawer moves along its runners while the focused sample stays centered; the cabinet and closed drawers stay still. Material names are etched into the upper corner of each acrylic holder.

Drag the scene to orbit. The bottom-left controls enable touch rotation, reset the axonometric view and change zoom. Scroll, swipe, arrow keys or the bottom-right controls browse materials or turn binder pages. Hover details stay hidden until needed. Click or tap a sample for inspection and saving to a browser-local board. Keyboard users can also focus the accessible sample list or press Enter on the canvas. Boards export as SVG with embedded material images.

## Local materials

Use the folder-plus icon at the upper right to add images, choose a folder including its subfolders, or drop image files onto the page. Filenames become sample names. The library selector switches between the included collection, all local materials and individual folders. Every collection uses the selected library, with larger libraries divided into bounded racks, trays or binder batches.

Supported inputs: JPG, PNG, WebP, AVIF, GIF and BMP. Animated images use a still frame. The library holds up to 120 images, at most 20 MB per source image. Images are resized to a maximum 1536-pixel edge and stored in IndexedDB in this browser; 3D surfaces use 512-pixel textures. Duplicate contents are skipped. Invalid or unsupported files are reported without preventing the other files from importing.

The browser opens the native file/folder picker. It cannot read arbitrary local paths or continuously watch a folder. Selecting a folder copies its supported images into the local library. Re-select it to add new images. No imported images or folder contents are sent to GitHub or any server. Browser storage is specific to the site and browser, may be unavailable in restricted/private modes, and is removed when site data is cleared. If saving fails, the current visit can still use the images. Remove an imported image with its × button.

## Running and hosting

Serve this directory over HTTP(S); no build step required. GitHub Pages publishes `main` / repository root. The entry points are `index.html`, `room.js`, `scene-3d.js`, `room-3d.css`, `materials.js` and `material-textures.js`. Three.js 0.180.0 is vendored locally in `three.module.min.js` and `three.core.min.js`; see `LICENSE-three.txt`. Runtime assets are self-contained, with no CDN or analytics requests. Older CSS scene files are retained as unused legacy sources.

WebGL2 is required for the 3D scene. When unavailable, a gallery still supports material inspection and importing. Reduced motion removes animated transitions. Included procedural surfaces are illustrative studies; import material photos for your own collection.
