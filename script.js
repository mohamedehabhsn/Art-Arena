"use strict";
/* =====================================================================
   ART ARENA — drawing studio, lessons and timed challenges
   ===================================================================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const HEX = /^#[0-9a-f]{6}$/i;
const NOIDB = Symbol("noidb");

const canvas = $("drawingCanvas"), ctx = canvas.getContext("2d", {willReadFrequently: true});
const overlay = $("overlayCanvas"), octx = overlay.getContext("2d");
const vp = $("viewport"), wrap = $("canvasWrap");

const SIZES = {landscape: [1200, 800], square: [1000, 1000], portrait: [800, 1200]};
const DIFF = {easy: 90, normal: 60, hard: 35};
// Phones/tablets have far less memory: keep fewer undo snapshots and smaller imports there.
const IS_TOUCH = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
const HISTORY_MAX = IS_TOUCH ? 12 : 30, MAX_CUSTOM = 12, MAX_IMPORT_DIM = IS_TOUCH ? 1600 : 2400;
const SPRAY_MS = IS_TOUCH ? 50 : 35, SPRAY_MAX_DOTS = IS_TOUCH ? 24 : 60;
const KEYS = {palette: "art_arena_palette_v2", scores: "art_arena_scores_v2", old: "art_arena_gallery_v5"};
const PRESETS = ["#17152b","#ffffff","#ef476f","#ff9f1c","#ffd166","#06d6a0","#118ab2","#8065e8","#f4a7bb","#8d99ae","#7f5539","#2b9348","#d00000","#6a040f","#00b4d8","#90e0ef","#b5179e","#f8961e"];
const DRAW_TOOLS = ["brush", "pencil", "marker", "eraser", "spray"];

function lsGet(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ---------------------------------------------------------------------
   Content: lessons, tool guides, prompts
   --------------------------------------------------------------------- */
const lessons = [
 {title:"Meet your canvas",icon:"🖼️",duration:"3 MIN",intro:"Get comfortable with the drawing space and the controls before you start creating.",steps:[["Find your canvas","The large white area is your drawing surface. On a phone, draw with your finger; a stylus gives you extra precision and pressure control."],["Choose a tool","The toolbar above the canvas contains your main tools. Tap a tool once to activate it, or press its keyboard letter (B for brush, E for eraser…)."],["Choose a color","Use the color picker or tap a swatch in Color Studio. Colors you use are remembered under RECENT."],["Undo a mistake","Use the curved arrows to undo and redo. You can also use Ctrl/Cmd + Z and Ctrl/Cmd + Y."]],tip:"Start with a loose sketch. You can refine lines, add color and details after you have the basic idea."},
 {title:"Brush, pencil & eraser",icon:"✎",duration:"5 MIN",intro:"Learn the tools you will use most often for sketching, line work and corrections.",steps:[["Brush","Select Brush, choose a color, then drag on the canvas. Use Size to make the stroke thicker or thinner (or press [ and ])."],["Pencil & marker","Pencil makes a lighter, thinner sketch line. Marker is wide and translucent — great for highlights and soft color."],["Eraser","Select Eraser and drag over marks you want to remove. Change Size for small corrections or large cleanups."],["Opacity & smoothing","Lower Opacity for transparent strokes. Increase Smoothing to calm shaky lines; lower it for quick, responsive marks."]],tip:"Sketch lightly with Pencil, draw your clean outlines with Brush, then erase the construction lines."},
 {title:"Build with shapes",icon:"◇",duration:"5 MIN",intro:"Simple shapes are the building blocks of almost every object. Use the Shapes menu to make clean geometry.",steps:[["Choose a shape","Open the Shapes dropdown and choose a rectangle, circle, triangle, star, heart, arrow or another shape."],["Drag to size it","Press where the shape should begin, then drag to the opposite corner. Release to finish. Hold Shift for perfect squares, circles and straight lines."],["Pick a style","Choose Outline, Filled, or Fill + darker outline in Brush Settings."],["Combine shapes","A robot can start as rectangles and circles. A house can start as a square and triangle. Add details after."]],tip:"Hold your first idea loosely: draw the big forms first, then add smaller shapes and details."},
 {title:"Color & fill",icon:"🎨",duration:"4 MIN",intro:"Make your artwork feel finished with a considered palette, solid areas and controlled opacity.",steps:[["Pick a palette","Tap a preset swatch or open the color picker to choose any color. Use Add to palette to keep a color handy."],["Fill tool","Choose Fill, then tap an enclosed area. Raise Fill tolerance if a faint halo is left near your lines."],["Eyedropper","Choose Pick (or hold Alt and click) to sample an existing color on your artwork."],["Create depth","Use a darker shade on one side and a lighter shade on the other. Lower opacity to blend soft accents."]],tip:"Try using three main colors: one dominant color, one supporting color and one accent color."},
 {title:"Professional assists",icon:"✧",duration:"4 MIN",intro:"Use the assists to work more precisely and keep your composition balanced.",steps:[["Mirror drawing","Turn on Mirror drawing to repeat your strokes across the vertical center line. Great for faces, masks and symmetrical designs."],["Four-way symmetry","Turn on Symmetry to repeat strokes in all four quadrants around the canvas center."],["Grid & center guide","Use the grid to align objects and the center guide to balance your composition. These guides do not appear in exported artwork."],["Zoom & pan","Pinch or Ctrl+scroll to zoom, hold Space (or use the Pan tool) to move around. Choose Fit to return to the normal view."]],tip:"Symmetry is a starting aid, not a rule. Turn it off when you want your artwork to feel more natural."},
 {title:"Create a simple flower",icon:"🌼",duration:"6 MIN",intro:"Follow this mini project to practise sketching, shapes, color and detail in one drawing.",steps:[["Draw the center","Choose Circle from Shapes, set it to Filled and draw a small yellow circle near the middle of your canvas."],["Add petals","Choose Ellipse and draw one petal above the center, then add petals around it. Turn on Symmetry to repeat them automatically."],["Add the stem","Choose Brush, pick green and draw a curved line down from the flower."],["Finish the leaves","Draw two small leaf shapes or use the brush to make pointed leaves. Add a second shade for detail."]],tip:"Do not worry about making every petal identical. Small differences give handmade art its character."},
 {title:"Composition & finishing",icon:"🧩",duration:"5 MIN",intro:"Arrange the parts of your drawing so the viewer knows where to look first.",steps:[["Start large","Place the main subject first. Avoid filling every corner immediately."],["Create contrast","Make important edges or details stand out with contrast in color, size or line weight."],["Add a background","Use a light color or a few simple shapes behind the subject. Keep it quieter than the focal point."],["Save and export","Save to your gallery to continue later. Export a PNG, JPG or WebP when you want an image file to share or print."]],tip:"Step back from the canvas every so often. If the main subject reads clearly at a small size, your composition is working."}
];

const toolGuides = [
 ["✎","Brush","Smooth, solid strokes. Adjust size, opacity and smoothing. Stylus pressure changes the line width."],
 ["／","Pencil","Light, thin sketch lines for construction marks before adding clean outlines."],
 ["▬","Marker","Wide, translucent strokes that build up soft color without dark overlaps."],
 ["▱","Eraser","Remove marks. Change size to erase tiny details or larger areas."],
 ["⁙","Spray","Scatter small dots for texture, stars, dust and grain effects. Hold still to build up density."],
 ["▨","Fill bucket","Tap a connected area to fill it. Tolerance controls how similar colors must be."],
 ["⌖","Eyedropper","Sample a color already on your canvas. Hold Alt and click with any brush as a shortcut."],
 ["T","Text","Add a title or label with your choice of font, size and bold."],
 ["◇","Shapes","Lines, circles, polygons, stars, hearts, arrows and more. Hold Shift to constrain."],
 ["✋","Pan","Move around a zoomed canvas. Hold Space with any tool for a quick pan."],
 ["↶","Undo / redo","Step backward or forward through up to 30 recent drawing states."],
 ["◫","Mirror","Repeat strokes and shapes on the other side of the vertical center line."],
 ["✣","Symmetry","Repeat everything in four quadrants for kaleidoscope-style designs."],
 ["▦","Grid","A temporary alignment grid. It is never included in exported artwork."],
 ["◎","Zoom","Pinch, Ctrl+scroll or use the zoom buttons for fine detail; Fit resets the view."]
];

// [name, category, svgReferenceType | "", emoji, hint]
const PROMPTS = [
 ["Cute cat","Animals","cat","🐱","Round head, two triangle ears, whiskers."],
 ["Majestic lion","Animals","","🦁","Big face circle with a fluffy mane around it."],
 ["Elephant","Animals","","🐘","Large body, big ear, long curved trunk."],
 ["Dolphin","Animals","","🐬","A curved body, pointed snout and crescent tail."],
 ["Owl","Animals","","🦉","Two big round eyes, small beak, feathery body."],
 ["Penguin","Animals","","🐧","Oval body, white belly, orange feet and beak."],
 ["Turtle","Animals","","🐢","A dome shell with a pattern, four little legs."],
 ["Friendly dinosaur","Animals","","🦖","Long tail, small arms, a row of back spikes."],
 ["Tropical fish","Animals","","🐠","Oval body, triangle tail, bright stripes."],
 ["Butterfly","Nature","","🦋","Mirror the wings! Try the Mirror assist."],
 ["Rose","Nature","flower","🌹","Spiral petals around the center, a thorny stem."],
 ["Sunflower","Nature","","🌻","A brown center ringed by long yellow petals."],
 ["Tall tree","Nature","","🌳","Thick trunk, a big cloud of leaves on top."],
 ["Waterfall","Nature","","🏞️","Rocky cliffs with white water pouring down."],
 ["Mountain landscape","Nature","mountain","⛰️","Overlapping triangles with snowy tips."],
 ["Rainbow","Nature","","🌈","Nested arches in rainbow order, clouds at each end."],
 ["Mushroom","Nature","","🍄","Dome cap with spots on a short, thick stem."],
 ["Sunset at sea","Nature","","🌅","Half sun on the horizon, wavy water below."],
 ["Cactus","Nature","","🌵","A tall green body with two arms and small spines."],
 ["Thunderstorm","Nature","","⛈️","Dark clouds and a zig-zag lightning bolt."],
 ["Magical castle","Fantasy","castle","🏰","Tall towers with flags, a big arched gate."],
 ["Treasure chest","Fantasy","","💰","A box with a curved lid, gold coins spilling out."],
 ["Unicorn","Fantasy","","🦄","Horse head with a spiral horn and flowing mane."],
 ["Magic potion","Fantasy","","🧪","Round flask, bubbling liquid, a cork on top."],
 ["Dragon","Fantasy","","🐉","Long body, wings, and a puff of fire."],
 ["Fairy","Fantasy","","🧚","Small figure with sparkly wings and a wand."],
 ["Wizard hat","Fantasy","","🧙","A tall pointed hat with stars and a wide brim."],
 ["Modern house","Buildings","","🏠","A square, a triangle roof, windows and a door."],
 ["Skyscraper","Buildings","","🏙️","Tall rectangles with grids of tiny windows."],
 ["Lighthouse","Buildings","","🗼","A tall striped tower with a light on top."],
 ["Bridge","Buildings","","🌉","Two towers, a deck and curved hanging cables."],
 ["Pizza","Food","pizza","🍕","A slice triangle with a crust and toppings."],
 ["Birthday cake","Food","","🎂","Layered cake, drippy icing and candles."],
 ["Ice cream","Food","","🍦","A waffle cone topped with round scoops."],
 ["Burger","Food","","🍔","Bun, lettuce, patty, cheese, bun."],
 ["Cupcake","Food","","🧁","A ridged wrapper with swirly frosting and a cherry."],
 ["Donut","Food","","🍩","A ring with icing and sprinkles."],
 ["Watermelon slice","Food","","🍉","A half-circle: green rind, red inside, black seeds."],
 ["Superhero","Characters","","🦸","A strong pose, a cape and a mask."],
 ["Friendly robot","Characters","robot","🤖","Boxy head and body, antenna, round eyes."],
 ["Funny monster","Characters","","👾","Odd shapes, many eyes, silly teeth."],
 ["Princess","Characters","","👸","A crown, long hair and a big dress."],
 ["Pirate","Characters","","🏴‍☠️","A tricorn hat, eye patch and a big grin."],
 ["Ninja","Characters","","🥷","A dark outfit with only the eyes showing."],
 ["Snowman","Characters","","⛄","Three stacked circles, carrot nose, scarf."],
 ["Rocket","Space","rocket","🚀","A pointed body, round window, fins and flames."],
 ["Planet Saturn","Space","planet","🪐","A big sphere with a tilted ring."],
 ["Astronaut","Space","","🧑‍🚀","Round helmet with a visor, a bulky suit."],
 ["Flying saucer","Space","","🛸","A shallow dome on a wide disc with lights."],
 ["Friendly alien","Space","","👽","A big head, large eyes, tiny body."],
 ["Moon and stars","Space","","🌙","A crescent moon with stars scattered around."],
 ["Racing car","Transport","car","🏎️","Low body, big wheels and a spoiler."],
 ["Airplane","Transport","","✈️","A long tube body with swept wings and a tail."],
 ["Sailboat","Transport","","⛵","A hull, a mast and triangle sails on waves."],
 ["Hot air balloon","Transport","","🎈","A big round balloon with a basket below."],
 ["Steam train","Transport","","🚂","Boiler, chimney with smoke, big wheels."],
 ["Bicycle","Transport","","🚲","Two circles for wheels connected by a frame."],
 ["Guitar","Objects","","🎸","Body curves, a long neck and tuning pegs."],
 ["Camera","Objects","","📷","A box with a big round lens and a flash."],
 ["Light bulb","Objects","","💡","A round glass top, a screw base, rays of light."],
 ["Umbrella","Objects","","☂️","A scalloped dome with a curved handle."],
 ["Alarm clock","Objects","","⏰","Round face, two hands, two bells on top."],
 ["Crown","Objects","","👑","A band with points topped with jewels."],
 ["Geometric pattern","Abstract","abstract","🔷","Repeat triangles, circles and squares."],
 ["Colorful mandala","Abstract","abstract","🌀","Turn on Symmetry and draw from the center."],
 ["Dream landscape","Abstract","mountain","🌌","A world that could never exist — go wild."],
 ["Your own invention","Imagination","abstract","✨","Anything you like. There are no rules."]
];
const CATEGORIES = [...new Set(PROMPTS.map(p => p[1]))];

/* ---------------------------------------------------------------------
   Reference illustrations (SVG)
   --------------------------------------------------------------------- */
function svgReference(type) {
 const common = 'stroke="#29243c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
 const drawings = {
 cat:`<path d="M80 90 L100 25 L145 65 Q200 35 255 65 L300 25 L315 105 Q350 200 250 250 Q150 280 85 205Z" fill="#f6b86d" ${common}/><circle cx="155" cy="145" r="9" fill="#29243c"/><circle cx="255" cy="145" r="9" fill="#29243c"/><path d="M190 180 Q205 195 220 180 M205 180 L205 205 M205 205 Q185 220 175 205 M205 205 Q225 220 235 205" fill="none" ${common}/><path d="M145 185 L70 170 M145 200 L65 205 M265 185 L335 170 M265 200 L345 205" fill="none" ${common}/>`,
 flower:`<path d="M205 170 Q175 235 205 340" fill="none" stroke="#2b9348" stroke-width="13"/><path d="M205 275 Q135 225 120 280 Q155 320 205 275 M205 305 Q275 250 295 300 Q260 345 205 305" fill="#8bd5a7" ${common}/><g fill="#ff9fba" ${common}><ellipse cx="205" cy="90" rx="40" ry="65"/><ellipse cx="205" cy="90" rx="40" ry="65" transform="rotate(60 205 145)"/><ellipse cx="205" cy="90" rx="40" ry="65" transform="rotate(120 205 145)"/><ellipse cx="205" cy="90" rx="40" ry="65" transform="rotate(180 205 145)"/><ellipse cx="205" cy="90" rx="40" ry="65" transform="rotate(240 205 145)"/><ellipse cx="205" cy="90" rx="40" ry="65" transform="rotate(300 205 145)"/></g><circle cx="205" cy="145" r="42" fill="#ffd166" ${common}/>`,
 castle:`<path d="M75 330 V135 H130 V90 H165 V135 H245 V90 H280 V135 H335 V330Z" fill="#b8a8f4" ${common}/><path d="M45 330 V205 H95 V330 M315 330 V205 H365 V330" fill="#e9a7b9" ${common}/><path d="M180 330 V245 Q205 205 230 245 V330" fill="#fff1d6" ${common}/><path d="M145 135 V190 M270 135 V190" stroke="#29243c" stroke-width="7"/><path d="M130 90 L130 45 L165 70 L165 90 M245 90 L245 45 L280 70 L280 90" fill="#ffb56b" ${common}/>`,
 robot:`<rect x="105" y="105" width="200" height="155" rx="28" fill="#9ce3d1" ${common}/><rect x="140" y="50" width="130" height="75" rx="20" fill="#b9a9f5" ${common}/><circle cx="175" cy="85" r="10" fill="#29243c"/><circle cx="235" cy="85" r="10" fill="#29243c"/><path d="M185 110 Q205 125 225 110" fill="none" ${common}/><path d="M205 50 V25 M190 25 H220 M105 165 H65 V235 H105 M305 165 H345 V235 H305 M155 260 V330 M255 260 V330" fill="none" ${common}/>`,
 rocket:`<path d="M205 35 Q300 110 260 260 L205 315 L150 260 Q110 110 205 35Z" fill="#ffb56b" ${common}/><circle cx="205" cy="160" r="30" fill="#b7d9f6" ${common}/><path d="M150 220 L90 280 L160 270 M260 220 L320 280 L250 270" fill="#b8a8f4" ${common}/><path d="M180 300 Q155 355 205 390 Q255 355 230 300" fill="#ef476f" ${common}/>`,
 planet:`<ellipse cx="205" cy="200" rx="170" ry="55" fill="none" stroke="#d49b63" stroke-width="22" transform="rotate(-18 205 200)"/><circle cx="205" cy="190" r="105" fill="#b9a9f5" ${common}/><path d="M130 160 Q180 130 220 155 T280 170 M145 220 Q195 245 260 215" fill="none" stroke="#8065e8" stroke-width="15" stroke-linecap="round"/>`,
 mountain:`<path d="M25 330 L140 120 L215 230 L280 90 L390 330Z" fill="#9fc8e9" ${common}/><path d="M105 185 L140 120 L175 175 L150 165 L138 180 L126 164Z M245 160 L280 90 L320 165 L290 148 L277 164 L265 150Z" fill="#fff" ${common}/><path d="M25 330 Q100 280 180 325 T390 320" fill="none" stroke="#2b9348" stroke-width="15"/>`,
 car:`<path d="M65 250 L95 175 Q110 150 145 150 H265 Q290 150 310 185 L350 250 V295 H55Z" fill="#ef7895" ${common}/><path d="M135 155 L155 100 H260 L295 175" fill="#b8d8ef" ${common}/><circle cx="120" cy="290" r="32" fill="#29243c"/><circle cx="290" cy="290" r="32" fill="#29243c"/><circle cx="120" cy="290" r="13" fill="#ddd"/><circle cx="290" cy="290" r="13" fill="#ddd"/>`,
 pizza:`<path d="M70 70 Q230 25 355 95 L220 360Z" fill="#ffd166" ${common}/><path d="M70 70 Q230 25 355 95" fill="none" stroke="#b96a43" stroke-width="22"/><g fill="#ef476f"><circle cx="190" cy="120" r="17"/><circle cx="270" cy="130" r="17"/><circle cx="205" cy="215" r="17"/><circle cx="285" cy="220" r="17"/></g><g fill="#2b9348"><ellipse cx="160" cy="170" rx="10" ry="18"/><ellipse cx="260" cy="285" rx="10" ry="18"/></g>`,
 abstract:`<circle cx="140" cy="145" r="78" fill="#ffb56b"/><path d="M185 60 L360 280 L100 315Z" fill="#8065e8" opacity=".9"/><rect x="215" y="75" width="125" height="125" rx="35" fill="#9ce3d1" transform="rotate(22 275 137)"/><path d="M45 260 Q120 170 190 260 T350 250" fill="none" stroke="#29243c" stroke-width="9" stroke-linecap="round"/>`
 };
 return `<svg viewBox="0 0 410 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustrated drawing reference"><rect x="8" y="8" width="394" height="394" rx="28" fill="#fff" opacity=".62"/>${drawings[type] || drawings.abstract}</svg>`;
}
function emojiReference(emoji) {
 return `<svg viewBox="0 0 410 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reference emoji"><rect x="8" y="8" width="394" height="394" rx="28" fill="#fff" opacity=".7"/><text x="205" y="255" font-size="190" text-anchor="middle" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${emoji}</text></svg>`;
}
const svgUrl = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const promptReference = p => svgUrl(p[2] ? svgReference(p[2]) : emojiReference(p[3]));

/* ---------------------------------------------------------------------
   State
   --------------------------------------------------------------------- */
let page = "home", mode = "free", sessionMode = "", tool = "brush", shape = "";
let color = "#8065e8", size = 8, opacity = 1, smoothing = .35, fillMode = "stroke", tolerance = 32;
let zoom = 1, panX = 0, panY = 0, baseW = 1, baseH = 1, spaceDown = false;
let undoStack = [], redoStack = [];
let stats = {actions: 0, colors: new Set(), shapes: new Set()};
let drawing = false, pts = [], lastMid = null, startP = null, curP = null, activeId = null, sprayTimer = null, lastPressure = 1, shiftHeld = false;
let panning = null, pinch = null; const pointers = new Map();
let dirty = false, canvasEpoch = 0, currentArtwork = null, draftTimer = null, dialogOpen = false;
let gallery = [], galleryFilter = "all", galleryUrls = [];
let customPalette = lsGet(KEYS.palette, []).filter(c => typeof c === "string" && HEX.test(c)).slice(0, MAX_CUSTOM);
let recent = [];
let referenceSrc = "", referenceBlob = false, referenceHint = "";
let game = {active: false, rounds: [], index: 0, total: 0, details: [], token: 0, finished: false, started: false, duration: 60, diff: "normal"};
let timer = null, deadline = 0, remaining = 0;
let lessonIndex = 0;

/* ---------------------------------------------------------------------
   Utilities
   --------------------------------------------------------------------- */
function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2600); }
function toBlob(c, type = "image/png", q) { return new Promise(res => c.toBlob(res, type, q)); }
function blobToDataURL(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); }); }
function loadImage(src) {
 return new Promise((res, rej) => {
  const isBlob = src instanceof Blob, url = isBlob ? URL.createObjectURL(src) : src, im = new Image();
  im.onload = () => { if (isBlob) URL.revokeObjectURL(url); res(im); };
  im.onerror = () => { if (isBlob) URL.revokeObjectURL(url); rej(new Error("Image failed to load")); };
  im.src = url;
 });
}
async function makeThumb(source, w, h) {
 const s = Math.min(1, 480 / w), c = document.createElement("canvas");
 c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
 const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(source, 0, 0, c.width, c.height);
 return toBlob(c, "image/jpeg", .82);
}
function downloadBlob(blob, name) {
 const url = URL.createObjectURL(blob), a = document.createElement("a");
 a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
 setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "artwork");
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function darken(h, amt) { return "#" + hexToRgb(h).map(v => Math.round(v * (1 - amt)).toString(16).padStart(2, "0")).join(""); }
function shuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

/* ---------------------------------------------------------------------
   Dialogs (replace prompt/confirm)
   --------------------------------------------------------------------- */
function dialog({title, message = "", input = null, confirm = "OK", cancel = "Cancel", alt = null, danger = false}) {
 return new Promise(resolve => {
  const el = $("dialog"), inp = $("dialogInput"), c = $("dialogConfirm"), a = $("dialogAlt"), x = $("dialogCancel");
  $("dialogTitle").textContent = title; $("dialogMessage").textContent = message;
  inp.classList.toggle("hidden", input === null); if (input !== null) inp.value = input;
  c.textContent = confirm; c.className = "button " + (danger ? "button-danger" : "button-primary");
  x.textContent = cancel; a.textContent = alt || ""; a.classList.toggle("hidden", !alt);
  el.classList.remove("hidden"); dialogOpen = true;
  setTimeout(() => { (input !== null ? inp : c).focus(); if (input !== null) inp.select(); }, 30);
  const done = v => { el.classList.add("hidden"); dialogOpen = false; c.onclick = a.onclick = x.onclick = el.onclick = null; el.removeEventListener("keydown", onKey); resolve(v); };
  const onKey = e => {
   if (e.key === "Escape") { e.preventDefault(); done(null); }
   else if (e.key === "Enter" && e.target.tagName !== "BUTTON") { e.preventDefault(); done({value: inp.value, alt: false}); }
  };
  c.onclick = () => done({value: inp.value, alt: false});
  a.onclick = () => done({value: inp.value, alt: true});
  x.onclick = () => done(null);
  el.onclick = e => { if (e.target === el) done(null); };
  el.addEventListener("keydown", onKey);
 });
}
function askText() {
 return new Promise(resolve => {
  const el = $("textDialog"), inp = $("textInput");
  inp.value = ""; $("textSize").value = clamp(Math.round(size * 4), 24, 160);
  el.classList.remove("hidden"); dialogOpen = true; setTimeout(() => inp.focus(), 30);
  const done = v => { el.classList.add("hidden"); dialogOpen = false; $("textConfirm").onclick = $("textCancel").onclick = el.onclick = null; el.removeEventListener("keydown", onKey); resolve(v); };
  const ok = () => done({text: inp.value, font: $("textFont").value, size: clamp(+$("textSize").value || 48, 10, 400), bold: $("textBold").checked});
  const onKey = e => { if (e.key === "Escape") { e.preventDefault(); done(null); } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ok(); } };
  $("textConfirm").onclick = ok; $("textCancel").onclick = () => done(null);
  el.onclick = e => { if (e.target === el) done(null); };
  el.addEventListener("keydown", onKey);
 });
}

/* ---------------------------------------------------------------------
   Storage: IndexedDB with in-memory fallback
   --------------------------------------------------------------------- */
const db = {
 idb: null, failed: false, mem: {gallery: new Map(), meta: new Map()},
 async open() {
  if (this.idb) return this.idb; if (this.failed) return null;
  try {
   this.idb = await new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("no indexedDB"));
    const r = indexedDB.open("art_arena_db", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("gallery", {keyPath: "id"}); r.result.createObjectStore("meta"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blocked"));
   });
   return this.idb;
  } catch { this.failed = true; setTimeout(() => toast("Storage unavailable — artworks won't persist after you close this tab."), 800); return null; }
 },
 async run(store, rw, fn) {
  const d = await this.open(); if (!d) return NOIDB;
  return new Promise((res, rej) => {
   const t = d.transaction(store, rw), rq = fn(t.objectStore(store));
   t.oncomplete = () => res(rq ? rq.result : undefined); t.onerror = t.onabort = () => rej(t.error);
  });
 },
 async all() { const r = await this.run("gallery", "readonly", s => s.getAll()); return r === NOIDB ? [...this.mem.gallery.values()] : r; },
 async put(i) { const r = await this.run("gallery", "readwrite", s => s.put(i)); if (r === NOIDB) this.mem.gallery.set(i.id, i); },
 async del(id) { const r = await this.run("gallery", "readwrite", s => s.delete(id)); if (r === NOIDB) this.mem.gallery.delete(id); },
 async getMeta(k) { const r = await this.run("meta", "readonly", s => s.get(k)); return r === NOIDB ? this.mem.meta.get(k) : r; },
 async setMeta(k, v) { const r = await this.run("meta", "readwrite", s => v == null ? s.delete(k) : s.put(v, k)); if (r === NOIDB) { v == null ? this.mem.meta.delete(k) : this.mem.meta.set(k, v); } }
};

/* ---------------------------------------------------------------------
   Navigation
   --------------------------------------------------------------------- */
function showPage(name) {
 const target = $(name + "Page"); if (!target) return;
 if (name !== "studio") { clearInterval(timer); timer = null; clearInterval(sprayTimer); if (game.active && name !== "results") { game.active = false; game.token++; } }
 document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
 target.classList.add("active"); page = name;
 document.body.classList.toggle("in-studio", name === "studio");
 document.querySelectorAll("[data-page-link]").forEach(b => b.classList.toggle("active", b.dataset.pageLink === name));
 document.querySelectorAll("[data-open-studio]").forEach(b => b.classList.toggle("active", name === "studio" && b.classList.contains("nav-link")));
 $("brushCursor").classList.remove("show"); closeSheet();
 if (name === "gallery") renderGallery();
 if (name === "play") updateBest();
 window.scrollTo(0, 0);
}
async function guardLeave() {
 if (page !== "studio") return true;
 if (game.active) {
  const r = await dialog({title: "Leave competition?", message: "Your current round will end and your progress will be lost.", confirm: "Leave", cancel: "Keep playing", danger: true});
  return !!r;
 }
 if (mode !== "free" && dirty) {
  const r = await dialog({title: "Leave without saving?", message: "You have unsaved changes in this drawing.", confirm: "Leave", cancel: "Stay", alt: "Save first", danger: true});
  if (!r) return false;
  if (r.alt) return await saveCurrent();
 }
 return true;
}
async function navigate(name) { if (!(await guardLeave())) return; showPage(name); }
async function enterStudio(m) { if (page === "studio" && mode === m && !game.active) return; if (!(await guardLeave())) return; openStudio(m); }
document.addEventListener("click", e => {
 const l = e.target.closest("[data-page-link]");
 if (l) { e.preventDefault(); navigate(l.dataset.pageLink); return; }
 const s = e.target.closest("[data-open-studio]");
 if (s) { e.preventDefault(); enterStudio(s.dataset.openStudio); }
});

/* ---------------------------------------------------------------------
   Training page
   --------------------------------------------------------------------- */
function renderLessons() {
 $("lessonList").innerHTML = lessons.map((l, i) => `<button class="lesson-item ${i === lessonIndex ? "active" : ""}" data-lesson-index="${i}"><span>${l.icon}</span>${escapeHtml(l.title)}</button>`).join("");
 $("lessonList").querySelectorAll("button").forEach(b => b.onclick = () => selectLesson(+b.dataset.lessonIndex));
}
function selectLesson(i) {
 lessonIndex = (i + lessons.length) % lessons.length; const l = lessons[lessonIndex];
 renderLessons();
 $("lessonNumber").textContent = `LESSON ${String(lessonIndex + 1).padStart(2, "0")}`;
 $("lessonDuration").textContent = l.duration; $("lessonTitle").textContent = l.title; $("lessonIntro").textContent = l.intro;
 $("lessonVisual").innerHTML = `<div class="lesson-visual-art">${l.icon} <span style="font-size:30px;letter-spacing:0">✦</span></div>`;
 $("lessonSteps").innerHTML = l.steps.map((s, i) => `<div class="lesson-step"><span class="step-number">${i + 1}</span><div><b>${escapeHtml(s[0])}</b><p>${escapeHtml(s[1])}</p></div></div>`).join("");
 $("lessonTip").textContent = l.tip;
}
$("previousLesson").onclick = () => selectLesson(lessonIndex - 1);
$("nextLesson").onclick = () => selectLesson(lessonIndex + 1);
$("practiceLesson").onclick = () => enterStudioLesson();
async function enterStudioLesson() { if (!(await guardLeave())) return; openStudio("training", {lesson: lessons[lessonIndex]}); }
function renderToolGuides() {
 $("toolGuideGrid").innerHTML = toolGuides.map(t => `<article class="tool-guide-card"><span class="tool-emoji">${t[0]}</span><h3>${escapeHtml(t[1])}</h3><p>${escapeHtml(t[2])}</p></article>`).join("");
}

/* ---------------------------------------------------------------------
   Canvas surface, view and history
   --------------------------------------------------------------------- */
function newSurface(w, h, img) {
 canvas.width = overlay.width = w; canvas.height = overlay.height = h;
 ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
 if (img) ctx.drawImage(img, 0, 0, w, h);
 octx.clearRect(0, 0, w, h); overlay.style.opacity = 1;
 canvasEpoch++; drawing = false; clearInterval(sprayTimer);
 resetStats(); resetHistory(); dirty = false; currentArtwork = null;
 zoom = 1; panX = panY = 0; layout(); syncSizeSelect();
}
function syncSizeSelect() {
 const key = Object.keys(SIZES).find(k => SIZES[k][0] === canvas.width && SIZES[k][1] === canvas.height);
 $("canvasSize").value = key || "custom";
}
function layout() {
 const vw = vp.clientWidth - 28, vh = vp.clientHeight - 28; if (vw <= 0 || vh <= 0) return;
 const s = Math.min(vw / canvas.width, vh / canvas.height);
 baseW = Math.max(50, Math.floor(canvas.width * s)); baseH = Math.max(50, Math.floor(canvas.height * s));
 wrap.style.width = baseW + "px"; wrap.style.height = baseH + "px";
 wrap.style.setProperty("--cell", (baseW / 24).toFixed(2) + "px");
 applyView();
}
function applyView() {
 const mx = (baseW * zoom + vp.clientWidth) / 2 - 80, my = (baseH * zoom + vp.clientHeight) / 2 - 80;
 panX = clamp(panX, -mx, mx); panY = clamp(panY, -my, my);
 wrap.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
 $("zoomLabel").textContent = Math.round(zoom * 100) + "%";
}
function resetView() { zoom = 1; panX = panY = 0; applyView(); }
function zoomAt(cx, cy, nz) {
 nz = clamp(nz, .25, 8); const r = vp.getBoundingClientRect();
 const dx = cx - (r.left + r.width / 2 + panX), dy = cy - (r.top + r.height / 2 + panY);
 panX += dx * (1 - nz / zoom); panY += dy * (1 - nz / zoom); zoom = nz; applyView();
}
function zoomCenter(f) { const r = vp.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, zoom * f); }
new ResizeObserver(() => layout()).observe(vp);
window.addEventListener("resize", layout);

function snap() { const c = document.createElement("canvas"); c.width = canvas.width; c.height = canvas.height; c.getContext("2d").drawImage(canvas, 0, 0); return c; }
function resetHistory() { undoStack = [snap()]; redoStack = []; updateHistoryButtons(); }
function pushHistory() {
 undoStack.push(snap()); if (undoStack.length > HISTORY_MAX) undoStack.shift(); redoStack = [];
 dirty = true; updateHistoryButtons(); scheduleDraft();
}
function restore(c) { ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(c, 0, 0); ctx.restore(); }
function updateHistoryButtons() { $("undoBtn").disabled = undoStack.length < 2; $("redoBtn").disabled = !redoStack.length; }
function undo() { if (drawing) return; if (undoStack.length < 2) return toast("Nothing to undo"); redoStack.push(undoStack.pop()); restore(undoStack.at(-1)); dirty = true; updateHistoryButtons(); scheduleDraft(); }
function redo() { if (drawing) return; if (!redoStack.length) return toast("Nothing to redo"); const c = redoStack.pop(); undoStack.push(c); restore(c); dirty = true; updateHistoryButtons(); scheduleDraft(); }
function resetStats() { stats = {actions: 0, colors: new Set(), shapes: new Set()}; updateStats(); }
function updateStats() { $("drawingStats").textContent = `${stats.actions} actions · ${stats.shapes.size} shapes · ${stats.colors.size} colors`; }

function scheduleDraft() {
 if (mode !== "free") return;
 clearTimeout(draftTimer);
 draftTimer = setTimeout(async () => {
  try { const blob = await toBlob(canvas); await db.setMeta("draft", {blob, w: canvas.width, h: canvas.height, date: Date.now()}); } catch {}
 }, 1200);
}

/* ---------------------------------------------------------------------
   Tools & settings
   --------------------------------------------------------------------- */
function setTool(t) { tool = t; shape = ""; $("shapeSelect").value = ""; syncToolUI(); }
function setShape(v) { shape = v; $("shapeSelect").value = v; tool = v ? "shape" : "brush"; syncToolUI(); }
function syncToolUI() {
 document.querySelectorAll("[data-tool]").forEach(b => b.classList.toggle("active", tool !== "shape" && b.dataset.tool === tool));
 $("shapeSelect").classList.toggle("active", tool === "shape");
 $("canvasStatus").textContent = (tool === "shape" ? shape + " shape" : tool + " selected").toUpperCase();
 updateCursor();
}
document.querySelectorAll("[data-tool]").forEach(b => b.onclick = () => { setTool(b.dataset.tool); closeSheet(); });
$("shapeSelect").onchange = e => setShape(e.target.value);

function setColor(c) {
 if (!HEX.test(c)) return; color = c.toLowerCase(); $("colorPicker").value = color; $("colorHex").textContent = color.toUpperCase();
 document.querySelectorAll(".swatches button").forEach(b => b.classList.toggle("selected", b.dataset.color === color));
}
function renderSwatches() {
 const mk = c => `<button style="--swatch:${c}" data-color="${c}" title="${c}" aria-label="Color ${c}"></button>`;
 $("swatches").innerHTML = [...PRESETS, ...customPalette].map(mk).join("");
 $("recentColors").innerHTML = recent.map(mk).join("");
 setColor(color);
}
function rememberColor(c) { if (recent[0] === c) return; recent = [c, ...recent.filter(x => x !== c)].slice(0, 12); $("recentColors").innerHTML = recent.map(x => `<button style="--swatch:${x}" data-color="${x}" title="${x}" aria-label="Color ${x}"></button>`).join(""); setColor(color); }
$("colorPicker").oninput = e => setColor(e.target.value);
$("studioPanel").addEventListener("click", e => { const b = e.target.closest(".swatches [data-color]"); if (b) setColor(b.dataset.color); });
$("addSwatch").onclick = () => {
 if (PRESETS.includes(color) || customPalette.includes(color)) return toast("Already in your palette");
 if (customPalette.length >= MAX_CUSTOM) customPalette.shift();
 customPalette.push(color); lsSet(KEYS.palette, customPalette); renderSwatches(); toast("Color added to palette");
};
$("resetPalette").onclick = () => { customPalette = []; lsSet(KEYS.palette, customPalette); renderSwatches(); toast("Palette reset"); };

function setSize(v) { size = clamp(Math.round(v), 1, 120); $("brushSize").value = size; $("sizeOutput").textContent = size + " px"; }
$("brushSize").oninput = e => setSize(+e.target.value);
$("opacity").oninput = e => { opacity = +e.target.value / 100; $("opacityOutput").textContent = e.target.value + "%"; };
$("smoothing").oninput = e => { smoothing = +e.target.value / 100; $("smoothingOutput").textContent = e.target.value + "%"; };
$("tolerance").oninput = e => { tolerance = +e.target.value; $("toleranceOutput").textContent = tolerance; };
$("fillMode").onchange = e => fillMode = e.target.value;
$("gridToggle").onchange = e => $("gridOverlay").classList.toggle("on", e.target.checked);
$("centerToggle").onchange = e => $("centerGuide").classList.toggle("hidden", !e.target.checked);
$("zoomIn").onclick = () => zoomCenter(1.25);
$("zoomOut").onclick = () => zoomCenter(.8);
$("resetZoom").onclick = resetView;

/* ---------------------------------------------------------------------
   Drawing engine
   --------------------------------------------------------------------- */
const effAlpha = () => opacity * (tool === "pencil" ? .9 : tool === "marker" ? .55 : 1);
function baseWidth() { return size * (tool === "pencil" ? .45 : tool === "marker" ? 1.6 : tool === "spray" ? 3.6 : 1); }
function symTransforms() {
 const W = canvas.width, H = canvas.height, sym = $("symmetryToggle").checked, mir = $("mirrorToggle").checked;
 const t = [{sx: 1, sy: 1, tx: 0, ty: 0}];
 if (mir || sym) t.push({sx: -1, sy: 1, tx: W, ty: 0});
 if (sym) t.push({sx: 1, sy: -1, tx: 0, ty: H}, {sx: -1, sy: -1, tx: W, ty: H});
 return t;
}
function withSym(c, fn) { for (const t of symTransforms()) { c.save(); c.translate(t.tx, t.ty); c.scale(t.sx, t.sy); fn(); c.restore(); } }
const targetCtx = () => tool === "eraser" ? ctx : octx;
function styleFor(c) {
 const pf = lastPressure;
 c.lineWidth = Math.max(1, baseWidth() * pf); c.lineCap = tool === "marker" ? "square" : "round"; c.lineJoin = "round";
 c.strokeStyle = c.fillStyle = tool === "eraser" ? "#fff" : color;
}
function drawSeg(a, ctrl, b) {
 const c = targetCtx(); styleFor(c);
 withSym(c, () => { c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y); c.stroke(); });
}
function drawDot(p) { const c = targetCtx(); styleFor(c); withSym(c, () => { c.beginPath(); c.arc(p.x, p.y, c.lineWidth / 2, 0, Math.PI * 2); c.fill(); }); }
function sprayAt(p) {
 octx.save(); octx.fillStyle = color; octx.globalAlpha = .65;
 withSym(octx, () => {
  const n = clamp(Math.round(size * 1.1), 8, SPRAY_MAX_DOTS);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * size * 1.8; octx.beginPath(); octx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, Math.random() * 1.4 + .6, 0, Math.PI * 2); octx.fill(); }
 });
 octx.restore();
}
function addPoint(raw) {
 const last = pts.at(-1), k = 1 - smoothing * .85;
 const p = {x: last.x + (raw.x - last.x) * k, y: last.y + (raw.y - last.y) * k};
 if (Math.hypot(p.x - last.x, p.y - last.y) < .6) return;
 const m = {x: (last.x + p.x) / 2, y: (last.y + p.y) / 2};
 drawSeg(lastMid, last, m); lastMid = m; pts.push(p);
}
function poly(c, arr) { c.moveTo(arr[0][0], arr[0][1]); for (let i = 1; i < arr.length; i++) c.lineTo(arr[i][0], arr[i][1]); c.closePath(); }
function drawShapeOn(c, type, a, b) {
 c.lineWidth = Math.max(1, size); c.lineCap = "round"; c.lineJoin = "round";
 c.fillStyle = color; c.strokeStyle = fillMode === "both" ? darken(color, .35) : color;
 const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y), cx = x0 + w / 2, cy = y0 + h / 2;
 const P = (u, v) => [x0 + w * u, y0 + h * v];
 c.beginPath();
 switch (type) {
  case "line": c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); return;
  case "arrow": {
   const ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.hypot(b.x - a.x, b.y - a.y), hl = Math.min(len * .45, Math.max(size * 3, 20));
   c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
   c.moveTo(b.x, b.y); c.lineTo(b.x - hl * Math.cos(ang - .45), b.y - hl * Math.sin(ang - .45));
   c.moveTo(b.x, b.y); c.lineTo(b.x - hl * Math.cos(ang + .45), b.y - hl * Math.sin(ang + .45));
   c.stroke(); return;
  }
  case "rectangle": c.rect(x0, y0, w, h); break;
  case "rounded": { const r = Math.min(w, h) * .2; if (c.roundRect) c.roundRect(x0, y0, w, h, r); else c.rect(x0, y0, w, h); break; }
  case "ellipse": c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); break;
  case "circle": c.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2); break;
  case "triangle": poly(c, [P(.5, 0), P(1, 1), P(0, 1)]); break;
  case "diamond": poly(c, [P(.5, 0), P(1, .5), P(.5, 1), P(0, .5)]); break;
  case "pentagon": case "hexagon": { const n = type === "pentagon" ? 5 : 6; poly(c, Array.from({length: n}, (_, i) => { const t = -Math.PI / 2 + i * 2 * Math.PI / n; return P(.5 + .5 * Math.cos(t), .5 + .5 * Math.sin(t)); })); break; }
  case "star": poly(c, Array.from({length: 10}, (_, i) => { const t = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .45 : 1; return P(.5 + .5 * r * Math.cos(t), .5 + .5 * r * Math.sin(t)); })); break;
  case "heart": {
   c.moveTo(...P(.5, .95)); c.bezierCurveTo(...P(.05, .62), ...P(-.05, .2), ...P(.28, .08));
   c.bezierCurveTo(...P(.42, .02), ...P(.5, .15), ...P(.5, .25));
   c.bezierCurveTo(...P(.5, .15), ...P(.58, .02), ...P(.72, .08));
   c.bezierCurveTo(...P(1.05, .2), ...P(.95, .62), ...P(.5, .95)); c.closePath(); break;
  }
  case "cloud":
   c.moveTo(...P(.2, .85)); c.bezierCurveTo(...P(-.05, .85), ...P(-.05, .5), ...P(.2, .5));
   c.bezierCurveTo(...P(.15, .15), ...P(.5, .05), ...P(.6, .3));
   c.bezierCurveTo(...P(.75, .1), ...P(1.05, .3), ...P(.9, .55));
   c.bezierCurveTo(...P(1.1, .7), ...P(1, .9), ...P(.8, .85)); c.closePath(); break;
  default: return;
 }
 if (fillMode !== "stroke") c.fill();
 if (fillMode !== "fill") c.stroke();
}
function constrain(a, b, shift) {
 if (!shift) return b;
 const dx = b.x - a.x, dy = b.y - a.y;
 if (shape === "line" || shape === "arrow") { const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, len = Math.hypot(dx, dy); return {x: a.x + len * Math.cos(ang), y: a.y + len * Math.sin(ang)}; }
 const m = Math.max(Math.abs(dx), Math.abs(dy)); return {x: a.x + (dx < 0 ? -m : m), y: a.y + (dy < 0 ? -m : m)};
}
function renderShapePreview() {
 octx.clearRect(0, 0, overlay.width, overlay.height);
 const b = constrain(startP, curP, shiftHeld);
 withSym(octx, () => drawShapeOn(octx, shape, startP, b));
}
function commitOverlay(alpha) {
 ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(overlay, 0, 0); ctx.restore();
 octx.clearRect(0, 0, overlay.width, overlay.height); overlay.style.opacity = 1;
}
function finishAction(addColor) { stats.actions++; if (addColor) { stats.colors.add(color); rememberColor(color); } pushHistory(); updateStats(); }
function cancelStroke() {
 if (!drawing) return; drawing = false; clearInterval(sprayTimer);
 octx.clearRect(0, 0, overlay.width, overlay.height); overlay.style.opacity = 1;
 if (tool === "eraser") restore(undoStack.at(-1));
}

/* --- fill / pick / text --- */
function floodFill(p) {
 const w = canvas.width, h = canvas.height, sx = Math.floor(p.x), sy = Math.floor(p.y);
 if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
 const im = ctx.getImageData(0, 0, w, h), d = im.data, i0 = (sy * w + sx) * 4;
 const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], tol = tolerance * 3, [fr, fg, fb] = hexToRgb(color), a = opacity;
 const seen = new Uint8Array(w * h);
 const ok = pi => { if (seen[pi]) return false; const k = pi * 4; return Math.abs(d[k] - tr) + Math.abs(d[k + 1] - tg) + Math.abs(d[k + 2] - tb) <= tol; };
 const stack = [sx, sy]; let changed = 0;
 while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (seen[y * w + x]) continue;
  let l = x; while (l >= 0 && ok(y * w + l)) l--; l++;
  let r = x; while (r < w && ok(y * w + r)) r++; r--;
  for (let i = l; i <= r; i++) {
   const pi = y * w + i, k = pi * 4; seen[pi] = 1; changed++;
   d[k] = Math.round(d[k] * (1 - a) + fr * a); d[k + 1] = Math.round(d[k + 1] * (1 - a) + fg * a); d[k + 2] = Math.round(d[k + 2] * (1 - a) + fb * a); d[k + 3] = 255;
  }
  for (const ny of [y - 1, y + 1]) {
   if (ny < 0 || ny >= h) continue; let inSpan = false;
   for (let i = l; i <= r; i++) { const o = ok(ny * w + i); if (o && !inSpan) { stack.push(i, ny); inSpan = true; } else if (!o) inSpan = false; }
  }
 }
 if (!changed) return;
 ctx.putImageData(im, 0, 0); finishAction(true); toast("Area filled");
}
function pickColor(p, switchTool) {
 const x = clamp(Math.floor(p.x), 0, canvas.width - 1), y = clamp(Math.floor(p.y), 0, canvas.height - 1), d = ctx.getImageData(x, y, 1, 1).data;
 setColor("#" + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, "0")).join(""));
 if (switchTool && tool === "eyedropper") setTool("brush");
}
async function placeText(p) {
 const epoch = canvasEpoch, r = await askText();
 if (!r || !r.text.trim() || epoch !== canvasEpoch) return;
 ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color; ctx.textBaseline = "top";
 ctx.font = `${r.bold ? "bold " : ""}${r.size}px ${r.font}`;
 r.text.split("\n").forEach((line, i) => ctx.fillText(line, p.x, p.y + i * r.size * 1.2));
 ctx.restore(); finishAction(true);
}

/* --- pointer handling --- */
function canvasPos(e) { const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height}; }
const pressureOf = e => e.pointerType === "pen" && e.pressure > 0 ? .25 + .75 * e.pressure : 1;
function beginAction(e) {
 const p = canvasPos(e);
 if (e.altKey && ["brush", "pencil", "marker", "spray"].includes(tool)) { pickColor(p, false); return; }
 if (tool === "eyedropper") { pickColor(p, true); return; }
 if (tool === "fill") {
  // Let the "Filling…" message paint first so slow phones don't look frozen.
  const epoch = canvasEpoch; toast("Filling…");
  requestAnimationFrame(() => setTimeout(() => { if (epoch === canvasEpoch && !(game.active && game.finished)) floodFill(p); }, 0));
  return;
 }
 if (tool === "text") { placeText(p); return; }
 if (tool === "shape" && !shape) return;
 drawing = true; activeId = e.pointerId; startP = curP = p; pts = [p]; lastMid = p; lastPressure = pressureOf(e); shiftHeld = e.shiftKey;
 try { vp.setPointerCapture(e.pointerId); } catch {}
 if (tool === "shape") { overlay.style.opacity = opacity; return; }
 overlay.style.opacity = effAlpha();
 if (tool === "spray") { sprayAt(p); clearInterval(sprayTimer); sprayTimer = setInterval(() => curP && sprayAt(curP), SPRAY_MS); return; }
 drawDot(p);
}
function endStroke() {
 if (!drawing) return; drawing = false; clearInterval(sprayTimer);
 if (tool === "shape") {
  const b = constrain(startP, curP, shiftHeld);
  if (Math.hypot(b.x - startP.x, b.y - startP.y) < 3) { octx.clearRect(0, 0, overlay.width, overlay.height); overlay.style.opacity = 1; return; }
  renderShapePreview(); commitOverlay(opacity); stats.shapes.add(shape); finishAction(true); return;
 }
 if (tool === "spray") { commitOverlay(effAlpha()); finishAction(true); return; }
 drawSeg(lastMid, pts.at(-1), curP);
 if (tool === "eraser") finishAction(false); else { commitOverlay(effAlpha()); finishAction(true); }
}
function startPan(e) { panning = {id: e.pointerId, x: e.clientX, y: e.clientY}; try { vp.setPointerCapture(e.pointerId); } catch {} updateCursor(); }
function startPinch() { const [a, b] = [...pointers.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2}; panning = null; }
function doPinch() {
 const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
 panX += cx - pinch.cx; panY += cy - pinch.cy; zoomAt(cx, cy, zoom * d / pinch.d); pinch = {d, cx, cy};
}
vp.addEventListener("pointerdown", e => {
 if (page !== "studio") return;
 if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
 pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
 try { vp.setPointerCapture(e.pointerId); } catch {}
 if (pointers.size === 2) { cancelStroke(); startPinch(); return; }
 if (pointers.size > 2) return;
 e.preventDefault();
 if ((e.pointerType === "mouse" && e.button === 1) || spaceDown || tool === "hand") { startPan(e); return; }
 if (game.active && (!game.started || game.finished)) return;
 beginAction(e);
});
vp.addEventListener("pointermove", e => {
 if (pointers.has(e.pointerId)) pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
 positionRing(e);
 if (pinch && pointers.size === 2) { doPinch(); return; }
 if (panning && e.pointerId === panning.id) { panX += e.clientX - panning.x; panY += e.clientY - panning.y; panning.x = e.clientX; panning.y = e.clientY; applyView(); return; }
 if (!drawing || e.pointerId !== activeId) return;
 e.preventDefault(); shiftHeld = e.shiftKey;
 const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
 for (const ev of (evs.length ? evs : [e])) {
  const p = canvasPos(ev); curP = p; lastPressure = pressureOf(ev);
  if (tool === "shape") continue;
  if (tool === "spray") sprayAt(p); else addPoint(p);
 }
 if (tool === "shape") renderShapePreview();
});
function pointerEnd(e) {
 pointers.delete(e.pointerId);
 if (pinch && pointers.size < 2) pinch = null;
 if (panning && e.pointerId === panning.id) { panning = null; updateCursor(); }
 if (drawing && e.pointerId === activeId) endStroke();
}
["pointerup", "pointercancel"].forEach(n => vp.addEventListener(n, pointerEnd));
vp.addEventListener("pointerleave", () => $("brushCursor").classList.remove("show"));
vp.addEventListener("contextmenu", e => e.preventDefault());
vp.addEventListener("wheel", e => {
 if (page !== "studio") return;
 if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(e.clientX, e.clientY, zoom * Math.exp(-e.deltaY * .01)); }
 else if (zoom > 1.01) { e.preventDefault(); panX -= e.deltaX; panY -= e.deltaY; applyView(); }
}, {passive: false});

/* --- cursor ring --- */
const ringTool = () => DRAW_TOOLS.includes(tool) && !spaceDown;
function updateCursor() {
 vp.style.cursor = (spaceDown || tool === "hand") ? (panning ? "grabbing" : "grab") : ringTool() ? "none" : tool === "text" ? "text" : tool === "eyedropper" ? "copy" : "crosshair";
 if (!ringTool()) $("brushCursor").classList.remove("show");
}
function positionRing(e) {
 const ring = $("brushCursor");
 if (!ringTool() || e.pointerType === "touch" || page !== "studio") { ring.classList.remove("show"); return; }
 const r = canvas.getBoundingClientRect(), d = Math.max(6, baseWidth() * r.width / canvas.width);
 ring.style.width = ring.style.height = d + "px"; ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; ring.classList.add("show");
}

/* ---------------------------------------------------------------------
   Reference image
   --------------------------------------------------------------------- */
function setReference(src, hint, isBlob, show) {
 if (referenceBlob && referenceSrc.startsWith("blob:")) URL.revokeObjectURL(referenceSrc);
 referenceSrc = src; referenceBlob = !!isBlob; referenceHint = hint || "";
 if (src) { $("referenceImage").src = src; $("referenceFoot").textContent = hint || "Use this as inspiration — make it your own."; }
 $("referenceCard").classList.toggle("hidden", !(src && show));
}
$("referenceToggle").onclick = () => {
 if (!referenceSrc) return toast(mode === "play" ? "No reference for this round" : "Upload an image to use as a reference");
 $("referenceCard").classList.toggle("hidden");
};
$("closeReference").onclick = () => $("referenceCard").classList.add("hidden");
// Make the reference card draggable (by its header) so it never blocks the area you want to draw in.
(function dragReference() {
 const card = $("referenceCard"), head = card.querySelector(".reference-card-head"), stage = $("drawingStage");
 let d = null;
 head.style.touchAction = "none"; head.style.cursor = "grab";
 head.addEventListener("pointerdown", e => {
  if (e.target.closest("button")) return;
  const cr = card.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  d = {id: e.pointerId, dx: e.clientX - cr.left, dy: e.clientY - cr.top, sr, w: cr.width, h: cr.height};
  head.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
 });
 head.addEventListener("pointermove", e => {
  if (!d || e.pointerId !== d.id) return;
  const x = clamp(e.clientX - d.dx - d.sr.left, 0, d.sr.width - d.w), y = clamp(e.clientY - d.dy - d.sr.top, 0, d.sr.height - d.h);
  card.style.left = x + "px"; card.style.top = y + "px"; card.style.right = "auto";
 });
 ["pointerup", "pointercancel"].forEach(n => head.addEventListener(n, () => { d = null; }));
})();
$("uploadReference").onclick = () => $("referenceFile").click();
$("referenceFile").onchange = e => {
 const f = e.target.files[0]; if (!f) return;
 if (!f.type.startsWith("image/")) { toast("Please choose an image file"); e.target.value = ""; return; }
 setReference(URL.createObjectURL(f), "Your reference image — use it as inspiration.", true, true); e.target.value = "";
};

/* ---------------------------------------------------------------------
   Studio modes
   --------------------------------------------------------------------- */
async function openStudio(m, opts = {}) {
 mode = m;
 if (m !== "play") { game.active = false; game.token++; clearInterval(timer); timer = null; }
 showPage("studio");
 $("studioMode").textContent = ({play: "✦ COMPETITIVE CHALLENGE", training: "✦ TRAINING STUDIO", edit: "✦ GALLERY EDITOR", free: "✦ FREE STUDIO"})[m];
 $("studioTitle").textContent = opts.title || (opts.lesson ? opts.lesson.title : m === "free" ? "Let's make art." : "Creative studio");
 $("studioPrompt").textContent = opts.desc || (opts.lesson ? opts.lesson.intro : "Choose a tool and start drawing. Your work is auto-saved.");
 $("timerPanel").classList.toggle("hidden", m !== "play"); $("finishRound").classList.toggle("hidden", m !== "play");
 $("roundLabel").textContent = ""; $("canvasSize").disabled = m === "play"; $("newBtn").disabled = m === "play";
 $("saveBtn").classList.toggle("hidden", m === "play");
 const hint = $("lessonHint");
 if (opts.lesson) { $("lessonHintList").innerHTML = opts.lesson.steps.map(s => `<li><b>${escapeHtml(s[0])}.</b> ${escapeHtml(s[1])}</li>`).join(""); hint.classList.remove("hidden"); hint.open = true; } else hint.classList.add("hidden");
 if (m !== "play") { setReference("", "", false, false); $("readyOverlay").classList.add("hidden"); }
 layout();

 if (m === "free") {
  if (sessionMode === "free" && !opts.fresh) { /* keep canvas in memory */ }
  else {
   let restored = false;
   try {
    const d = opts.fresh ? null : await db.getMeta("draft");
    if (d && d.blob) { const img = await loadImage(d.blob); if (mode === "free") { newSurface(d.w, d.h, img); restored = true; toast("Restored your last free-draw session"); } }
   } catch {}
   if (!restored && mode === "free") newSurface(...SIZES.landscape);
  }
 } else if (m === "edit") {
  const img = opts.image; let w = img.width, h = img.height;
  const s = Math.min(1, MAX_IMPORT_DIM / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
  newSurface(w, h, img); currentArtwork = opts.artwork || null;
 } else if (m === "play") {
  newSurface(...SIZES.landscape);
 } else newSurface(...SIZES.landscape);
 sessionMode = m;
 syncToolUI(); updateHistoryButtons();
}
$("exitStudio").onclick = async () => {
 if (!(await guardLeave())) return;
 const dest = mode === "training" ? "training" : mode === "play" ? "play" : mode === "edit" ? "gallery" : "home";
 showPage(dest);
};
$("clearBtn").onclick = async () => {
 const r = await dialog({title: "Clear your canvas?", message: "This will erase your current drawing. You can undo after clearing.", confirm: "Clear canvas", cancel: "Keep drawing", danger: true});
 if (!r) return;
 cancelStroke(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
 if (mode === "play") resetStats(); pushHistory(); toast("Canvas cleared");
};
async function newCanvas() {
 if (game.active) return;
 if (dirty) { const r = await dialog({title: "Start a new canvas?", message: "Your current drawing will be replaced. Save it first if you want to keep it.", confirm: "New canvas", cancel: "Cancel", danger: true}); if (!r) return; }
 await db.setMeta("draft", null); newSurface(canvas.width, canvas.height); sessionMode = mode; toast("New canvas ready");
}
$("newBtn").onclick = newCanvas;
$("canvasSize").onchange = async e => {
 const key = e.target.value; if (!SIZES[key]) { syncSizeSelect(); return; }
 if (dirty) { const r = await dialog({title: "Change canvas size?", message: "Changing the size starts a new blank canvas.", confirm: "Change size", cancel: "Cancel", danger: true}); if (!r) { syncSizeSelect(); return; } }
 await db.setMeta("draft", null); newSurface(...SIZES[key]); sessionMode = mode;
};

/* --- save / export --- */
async function saveArtwork({title, score = 0, kind = "free", id = null}) {
 const [blob, thumb] = await Promise.all([toBlob(canvas), makeThumb(canvas, canvas.width, canvas.height)]);
 const item = {id: id || uid(), title, blob, thumb, score, kind, w: canvas.width, h: canvas.height, date: new Date().toISOString()};
 await db.put(item); gallery = [item, ...gallery.filter(g => g.id !== item.id)]; sortGallery(); $("galleryCount").textContent = gallery.length;
 return item;
}
async function saveCurrent() {
 if (game.active) return false;
 const ed = currentArtwork;
 const r = await dialog({title: ed ? "Update artwork" : "Save artwork", message: "Give your artwork a name.", input: ed ? ed.title : "My artwork", confirm: ed ? "Update" : "Save", alt: ed ? "Save as new" : null});
 if (!r) return false;
 const title = r.value.trim().slice(0, 60) || "My artwork", overwrite = ed && !r.alt;
 try {
  const item = await saveArtwork({title, id: overwrite ? ed.id : null, kind: overwrite ? ed.kind : "free", score: overwrite ? ed.score : 0});
  currentArtwork = {id: item.id, title: item.title, kind: item.kind, score: item.score}; dirty = false; toast("Artwork saved to your gallery"); return true;
 } catch { toast("Could not save — try exporting a PNG instead."); return false; }
}
$("saveBtn").onclick = saveCurrent;
$("downloadBtn").onclick = async () => {
 const fmt = $("exportFormat").value, type = "image/" + fmt, blob = await toBlob(canvas, type, .92);
 if (!blob) return toast("This browser can't export that format");
 downloadBlob(blob, slug(currentArtwork ? currentArtwork.title : $("studioTitle").textContent) + "." + (fmt === "jpeg" ? "jpg" : fmt));
};

/* ---------------------------------------------------------------------
   Challenge game
   --------------------------------------------------------------------- */
function populateCategories() { $("categorySelect").insertAdjacentHTML("beforeend", CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")); }
const scoreKey = () => `${$("difficulty").value}-${$("roundCount").value}`;
function updateBest() { const best = lsGet(KEYS.scores, {})[scoreKey()]; $("bestScore").textContent = best ? `🏆 Your best for these settings: ${best} points` : "No score yet for these settings — set the bar!"; }
["difficulty", "roundCount"].forEach(id => $(id).addEventListener("change", updateBest));
function showExample() { const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; $("setupIllustration").innerHTML = p[2] ? svgReference(p[2]) : emojiReference(p[3]); $("previewName").textContent = p[0]; }

$("startGame").onclick = async () => {
 if (!(await guardLeave())) return;
 const n = +$("roundCount").value, cat = $("categorySelect").value;
 let pool = PROMPTS.filter(p => cat === "all" || p[1] === cat);
 if (pool.length < n) { pool = PROMPTS; toast("Not enough prompts in that category — using all categories"); }
 const diff = $("difficulty").value;
 game = {active: true, rounds: shuffle(pool).slice(0, n), index: 0, total: 0, details: [], token: game.token + 1, finished: false, started: false, duration: DIFF[diff], diff};
 beginRound();
};
function beginRound() {
 if (!game.active) return;
 if (game.index >= game.rounds.length) return endGame();
 const p = game.rounds[game.index]; game.token++; game.finished = false; game.started = false; remaining = game.duration;
 clearInterval(timer); timer = null;
 openStudio("play", {title: `Round ${game.index + 1} of ${game.rounds.length}`, desc: `Draw: ${p[0]} · ${p[1]}`});
 game.active = true; // openStudio("play") keeps it, set explicitly for clarity
 $("roundLabel").textContent = `ROUND ${game.index + 1}/${game.rounds.length}`;
 setReference(promptReference(p), `Hint: ${p[4]}`, false, false);
 $("readyRound").textContent = `ROUND ${game.index + 1} OF ${game.rounds.length} · ${game.duration}s`;
 $("readyEmoji").textContent = p[3]; $("readyName").textContent = p[0]; $("readyHint").textContent = p[4];
 $("readyOverlay").classList.remove("hidden"); updateTimer();
 setTimeout(() => $("readyStart").focus(), 50);
}
$("readyStart").onclick = () => {
 if (!game.active || game.started) return;
 game.started = true; $("readyOverlay").classList.add("hidden");
 if ($("autoReference").checked) $("referenceCard").classList.remove("hidden");
 deadline = Date.now() + game.duration * 1000; clearInterval(timer); timer = setInterval(tick, 250); tick();
};
function tick() {
 if (!game.active || !game.started || game.finished) return;
 remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); updateTimer();
 if (remaining <= 0) finishRound();
}
function updateTimer() { const m = Math.floor(remaining / 60), s = remaining % 60; $("timerValue").textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; $("timerPanel").classList.toggle("warning", game.started && remaining <= 10); }
$("finishRound").onclick = () => finishRound();
function scoreRound() {
 const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let n = 0;
 for (let i = 0; i < d.length; i += 4) if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) n++;
 const coverage = n / (canvas.width * canvas.height), active = stats.actions > 0 && coverage > .001;
 const parts = {
  participation: active ? 30 : 0,
  coverage: Math.round(Math.min(coverage / .2, 1) * 60),
  activity: Math.round(Math.min(stats.actions / 20, 1) * 50),
  colors: Math.round(Math.min(stats.colors.size / 8, 1) * 40),
  shapes: Math.round(Math.min(stats.shapes.size / 5, 1) * 40),
  time: active ? Math.round(remaining / game.duration * 30) : 0
 };
 return {total: Object.values(parts).reduce((a, b) => a + b, 0), parts};
}
async function finishRound() {
 if (!game.active || !game.started || game.finished) return;
 game.finished = true; clearInterval(timer); timer = null; endStroke();
 remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
 const p = game.rounds[game.index], token = game.token, score = scoreRound();
 game.total += score.total;
 const t = document.createElement("canvas"); t.width = 180; t.height = Math.round(180 * canvas.height / canvas.width);
 const tc = t.getContext("2d"); tc.drawImage(canvas, 0, 0, t.width, t.height);
 game.details.push({prompt: p[0], score: score.total, parts: score.parts, thumb: t.toDataURL("image/jpeg", .7)});
 saveArtwork({title: p[0], score: score.total, kind: "challenge"}).catch(() => {});
 toast(`Round complete · ${score.total} points`);
 setTimeout(() => { if (!game.active || game.token !== token) return; game.index++; beginRound(); }, 1400);
}
function endGame() {
 game.active = false; clearInterval(timer); timer = null;
 const scores = lsGet(KEYS.scores, {}), key = `${game.diff}-${game.rounds.length}`, prev = scores[key] || 0, isBest = game.total > prev;
 if (isBest) { scores[key] = game.total; lsSet(KEYS.scores, scores); }
 showPage("results"); $("finalScore").textContent = game.total;
 $("resultsBest").textContent = isBest ? (prev ? `🏆 New personal best! (previous: ${prev})` : "🏆 First score recorded — that's your new best!") : `Your best for these settings: ${prev}`;
 const avg = game.details.length ? Math.round(game.total / game.details.length) : 0;
 $("scoreBreakdown").innerHTML = `<h3>YOUR ROUND RESULTS</h3>` + game.details.map((r, i) => {
  const q = r.parts;
  return `<div class="score-line"><img src="${r.thumb}" alt="Your drawing for round ${i + 1}"><span class="score-text"><b>Round ${i + 1}: ${escapeHtml(r.prompt)}</b><small>coverage ${q.coverage} · activity ${q.activity} · colors ${q.colors} · shapes ${q.shapes} · time ${q.time}</small></span><strong>${r.score} pts</strong></div>`;
 }).join("") + `<div class="score-line"><span class="score-text"><b>Average per round</b></span><strong>${avg} pts</strong></div><p class="score-note">Scores reflect drawing activity, coverage, variety and remaining time — not an AI judgement of artistic quality. Your round drawings were saved to the gallery.</p>`;
}
$("playAgain").onclick = () => showPage("play");

/* ---------------------------------------------------------------------
   Gallery
   --------------------------------------------------------------------- */
function sortGallery() { gallery.sort((a, b) => b.date.localeCompare(a.date)); }
async function loadGallery() { try { gallery = await db.all(); } catch { gallery = []; } sortGallery(); $("galleryCount").textContent = gallery.length; }
async function migrateOld() {
 try {
  const raw = localStorage.getItem(KEYS.old); if (!raw) return;
  const arr = JSON.parse(raw); if (!Array.isArray(arr)) return;
  for (const a of arr) {
   if (!a || typeof a.image !== "string" || !a.image.startsWith("data:image/")) continue;
   const blob = await (await fetch(a.image)).blob(), im = await loadImage(blob), thumb = await makeThumb(im, im.width, im.height);
   await db.put({id: String(a.id || uid()), title: String(a.title || "Artwork").slice(0, 60), blob, thumb, score: +a.score || 0, kind: a.score ? "challenge" : "free", w: im.width, h: im.height, date: a.date || new Date().toISOString()});
  }
  localStorage.removeItem(KEYS.old); await loadGallery(); toast("Imported your earlier gallery");
 } catch {}
}
async function renderGallery() {
 galleryUrls.forEach(u => URL.revokeObjectURL(u)); galleryUrls = [];
 const items = gallery.filter(g => galleryFilter === "all" || g.kind === galleryFilter), grid = $("galleryGrid");
 $("galleryCount").textContent = gallery.length;
 document.querySelectorAll("#galleryFilters .chip").forEach(c => c.classList.toggle("active", c.dataset.filter === galleryFilter));
 let usage = ""; try { const e = await navigator.storage?.estimate?.(); if (e && e.usage) usage = ` · ${(e.usage / 1048576).toFixed(1)} MB used`; } catch {}
 $("gallerySummary").textContent = `${items.length} saved artwork${items.length === 1 ? "" : "s"} · saved in this browser${usage}`;
 grid.innerHTML = "";
 if (!items.length) { grid.innerHTML = `<div class="empty-gallery"><div style="font-size:42px">🎨</div><strong>${gallery.length ? "Nothing in this filter yet" : "Your gallery is waiting!"}</strong><p>Make something in the studio and save it here.</p></div>`; return; }
 for (const item of items) {
  const url = URL.createObjectURL(item.thumb || item.blob); galleryUrls.push(url);
  const card = document.createElement("article"); card.className = "gallery-card";
  const img = document.createElement("img"); img.src = url; img.alt = item.title; img.loading = "lazy"; img.onclick = () => openLightbox(item);
  const info = document.createElement("div"); info.className = "gallery-info";
  const title = document.createElement("strong"); title.textContent = item.title;
  const meta = document.createElement("p"); meta.textContent = `${item.kind === "challenge" ? item.score + " points · " : ""}${new Date(item.date).toLocaleDateString()}`;
  const actions = document.createElement("div"); actions.className = "gallery-actions";
  const mk = (cls, label, fn) => { const b = document.createElement("button"); b.className = cls; b.textContent = label; b.onclick = fn; return b; };
  actions.append(mk("secondary-btn", "Open in studio", () => openArtwork(item)), mk("secondary-btn", "Export PNG", () => downloadBlob(item.blob, slug(item.title) + ".png")), mk("secondary-btn", "Rename", () => renameArtwork(item)), mk("danger-btn", "Delete", () => deleteArtwork(item)));
  info.append(title, meta, actions); card.append(img, info); grid.append(card);
 }
}
$("galleryFilters").onclick = e => { const c = e.target.closest("[data-filter]"); if (!c) return; galleryFilter = c.dataset.filter; renderGallery(); };
async function openArtwork(item) {
 try { const img = await loadImage(item.blob); await openStudio("edit", {title: item.title, desc: "Continue editing your saved artwork. Save to update it.", image: img, artwork: {id: item.id, title: item.title, kind: item.kind, score: item.score}}); }
 catch { toast("Could not open that artwork"); }
}
async function renameArtwork(item) {
 const r = await dialog({title: "Rename artwork", input: item.title, confirm: "Rename"}); if (!r) return;
 item.title = r.value.trim().slice(0, 60) || item.title; await db.put(item); renderGallery();
}
async function deleteArtwork(item) {
 const r = await dialog({title: "Delete this artwork?", message: `"${item.title}" will be removed from this browser.`, confirm: "Delete", danger: true}); if (!r) return;
 await db.del(item.id); gallery = gallery.filter(g => g.id !== item.id); renderGallery(); toast("Artwork deleted");
}
let lightboxUrl = "";
function openLightbox(item) { if (lightboxUrl) URL.revokeObjectURL(lightboxUrl); lightboxUrl = URL.createObjectURL(item.blob); $("lightboxImg").src = lightboxUrl; $("lightboxImg").alt = item.title; $("lightboxTitle").textContent = item.title; $("lightbox").classList.remove("hidden"); }
function closeLightbox() { $("lightbox").classList.add("hidden"); }
$("lightboxClose").onclick = closeLightbox; $("lightbox").onclick = e => { if (e.target === $("lightbox")) closeLightbox(); };
$("exportGallery").onclick = async () => {
 if (!gallery.length) return toast("Nothing to export yet");
 const artworks = [];
 for (const g of gallery) artworks.push({id: g.id, title: g.title, score: g.score, kind: g.kind, date: g.date, image: await blobToDataURL(g.blob)});
 downloadBlob(new Blob([JSON.stringify({format: "ART_ARENA_BACKUP", version: 2, artworks})], {type: "application/json"}), "art-arena-backup.json");
};
$("importGallery").onchange = async e => {
 const f = e.target.files[0]; if (!f) return;
 try {
  const x = JSON.parse(await f.text()); if (x.format !== "ART_ARENA_BACKUP" || !Array.isArray(x.artworks)) throw 0;
  const have = new Set(gallery.map(g => g.id)); let n = 0;
  for (const a of x.artworks) {
   if (!a || typeof a.title !== "string" || typeof a.image !== "string" || !a.image.startsWith("data:image/")) continue;
   const id = typeof a.id === "string" && a.id ? a.id : uid(); if (have.has(id)) continue;
   const blob = await (await fetch(a.image)).blob(), im = await loadImage(blob), thumb = await makeThumb(im, im.width, im.height);
   await db.put({id, title: a.title.slice(0, 60), blob, thumb, score: +a.score || 0, kind: a.kind === "challenge" ? "challenge" : "free", w: im.width, h: im.height, date: typeof a.date === "string" ? a.date : new Date().toISOString()}); have.add(id); n++;
  }
  await loadGallery(); renderGallery(); toast(`${n} artwork(s) imported`);
 } catch { toast("That backup file is not valid"); }
 e.target.value = "";
};

/* ---------------------------------------------------------------------
   Mobile sheet, shortcuts, misc
   --------------------------------------------------------------------- */
function openSheet() { $("studioPanel").classList.add("sheet-open"); $("sheetBackdrop").classList.add("show"); }
function closeSheet() { $("studioPanel").classList.remove("sheet-open"); $("sheetBackdrop").classList.remove("show"); }
$("mobileMoreButton").onclick = () => $("studioPanel").classList.contains("sheet-open") ? closeSheet() : openSheet();
$("mobileColorButton").onclick = () => { openSheet(); $("studioPanel").scrollTop = 0; };
$("mobileUndo").onclick = undo; $("sheetBackdrop").onclick = closeSheet;
$("undoBtn").onclick = undo; $("redoBtn").onclick = redo;
$("helpBtn").onclick = () => $("shortcutsDialog").classList.remove("hidden");
$("closeShortcuts").onclick = () => $("shortcutsDialog").classList.add("hidden");
$("shortcutsDialog").onclick = e => { if (e.target === $("shortcutsDialog")) $("shortcutsDialog").classList.add("hidden"); };

document.addEventListener("keydown", e => {
 if (e.key === "Escape") {
  if (!$("lightbox").classList.contains("hidden")) { closeLightbox(); return; }
  if (!$("shortcutsDialog").classList.contains("hidden")) { $("shortcutsDialog").classList.add("hidden"); return; }
 }
 if (dialogOpen) return;
 const t = e.target;
 if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && ["text", "number", "search"].includes(t.type))) return;
 if (page !== "studio") return;
 const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
 if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
 if (mod && k === "y") { e.preventDefault(); redo(); return; }
 if (mod && k === "s") { e.preventDefault(); saveCurrent(); return; }
 if (mod && k === "0") { e.preventDefault(); resetView(); return; }
 if (mod || e.altKey) return;
 if (k === " ") { e.preventDefault(); if (!spaceDown) { spaceDown = true; updateCursor(); } return; }
 const tools = {b: "brush", p: "pencil", m: "marker", e: "eraser", s: "spray", g: "fill", i: "eyedropper", t: "text", h: "hand"}, shapes = {l: "line", r: "rectangle", o: "ellipse"};
 if (tools[k]) { e.preventDefault(); setTool(tools[k]); }
 else if (shapes[k]) { e.preventDefault(); setShape(shapes[k]); }
 else if (k === "[") setSize(size - (size > 20 ? 5 : size > 8 ? 2 : 1));
 else if (k === "]") setSize(size + (size >= 20 ? 5 : size >= 8 ? 2 : 1));
 else if (k === "+" || k === "=") zoomCenter(1.25);
 else if (k === "-" || k === "_") zoomCenter(.8);
 else if (k === "?") $("shortcutsDialog").classList.remove("hidden");
 else if (k === "escape") { closeSheet(); $("referenceCard").classList.add("hidden"); }
});
document.addEventListener("keyup", e => { if (e.key === " " && spaceDown) { spaceDown = false; updateCursor(); } });
window.addEventListener("blur", () => { if (spaceDown) { spaceDown = false; updateCursor(); } });
window.addEventListener("beforeunload", e => { if ((dirty && mode !== "free") || game.active) { e.preventDefault(); e.returnValue = ""; } });

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
(function init() {
 $("statPrompts").textContent = Math.floor(PROMPTS.length / 10) * 10 + "+";
 $("statTools").textContent = Math.floor((9 + $("shapeSelect").options.length - 1) / 10) * 10 + "+";
 selectLesson(0); renderToolGuides(); populateCategories(); showExample(); updateBest();
 renderSwatches(); setColor(color); setSize(size); syncToolUI(); updateHistoryButtons();
 newSurface(...SIZES.landscape);
 showPage("home");
 loadGallery().then(migrateOld);
 // Offline / installable support (only over http(s); silently skipped otherwise).
 if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
