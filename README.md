# Scaleboard

An isometric diagram studio for system design and network diagrams. Instead of flat boxes and
lines, you place pastel 3D blocks on a grid, connect them, and watch packets travel between them.
Then you step through the design like a talk.

It runs entirely in the browser. There is no server and no account, and diagrams are saved on your
own machine.

## What you can do

- **Build** from a searchable library of 96 components in ten groups: people and devices,
  networking, compute, data and storage, messaging, security, operations, AI, business, and
  flowchart shapes. Drag one onto the board or click it.
- **Make your own.** Any block can show any of 91 icons, and there are plain boxes, cylinders,
  plates and tiles for anything the library does not have.
- **Tidy up.** **File → Tidy layout** arranges every block in rows that follow the arrows.
- **Connect** blocks by pulling the blue handle from one to another. Connections route themselves
  along the grid, avoid other blocks, and can carry animated packets (request, response, data,
  event, error) at three speeds.
- **Annotate** with name tags, load meters, state (normal, overloaded, down, faded), zones for
  subnets or regions, and free-standing notes.
- **Send a packet** between any two blocks and watch it hop along the shortest route and come back.
- **Tell a story in steps.** Every block and connection can appear at one step and leave at
  another. Give each step a title and notes, then press **Present** to walk through it.
- **Write it as text.** Every diagram can be written in a small language (`server api "API"`,
  `api -> db`) with automatic layout. **File → Diagram code** shows the board as text and applies
  text you paste in. See [LANGUAGE.md](LANGUAGE.md).
- **Let an AI draw it.** `LANGUAGE.md` is written so an AI model can read it and produce diagrams.
  The code dialog has a button that copies the guide, ready to paste into a chat.
- **Import what it wrote.** **File → Import file** (or drag the file onto the board) reads a `.sb`
  or `.txt` diagram, a saved AI reply, or a saved `.json`. If the diagram has mistakes, they are
  listed by line with a **Copy problems** button to send back to the AI.
- **Share** from the Share menu:
  - **View-only link**: the diagram travels inside the link and opens with the editing tools off.
  - **Animated web page**: one `.html` file with the diagram, its steps and moving packets. It
    opens in any browser, needs no internet, and contains no editor.
  - **PDF**: one landscape page per step, with the step's title and notes.
  - **PNG** and **SVG** pictures of the current step.
- **Save** the diagram as a `.json` or `.sb` file to keep editing later. Work in progress is also
  saved automatically in the browser.
- Light and dark themes, undo and redo, copy and paste, and eight example diagrams (web app,
  office and branch networks, job pipeline, CI/CD to Kubernetes, AI assistant, IoT telemetry, and
  a flowchart).

## The diagram language in ten lines

```text
diagram "Simple web app"

users visitors "Visitors"
lb front "Load Balancer"
server web1 "Web 1"
server web2 "Web 2"
database db "Database"

visitors -> front
front -> web1, web2
web1, web2 -> db data
```

No positions are needed: blocks are laid out from the direction of the arrows. The full reference,
with every kind of block, steps, zones and worked examples, is in [LANGUAGE.md](LANGUAGE.md).

## Sharing, and what "view-only" means

A view-only link looks like `https://your-site/#v=…`. Everything after the `#` is the diagram
itself, compressed. Nothing is uploaded, and there is no server to keep it on.

- The link opens wherever Scaleboard is hosted. While you run it with `npm run dev` that is your
  own computer, so to send links to other people, host the built site first (see below). The
  animated web page needs no hosting: just send the file.
- The link is a snapshot. Change the board and you need a new link.
- View-only switches the editing tools off for the person who opens it, and it never touches their
  own saved work or yours. It is not encryption: the diagram's content is in the link, so treat a
  link like the diagram itself and only send it to people who may see it.

To host it on GitHub Pages: run `npm run build` and publish the `dist/` folder, or set up a Pages
workflow that does the same on every push.

## Run it

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

To make a static copy you can host anywhere:

```bash
npm run build     # writes the site to dist/
npm run preview   # serves dist/ locally to check it
npm test          # checks the diagram language, including every example in LANGUAGE.md
npm run docs      # rebuilds the component and icon tables in LANGUAGE.md from the catalog
```

The build uses relative paths, so `dist/` works from any folder, including a GitHub Pages project
site.

## Keys

| Key | Does |
| --- | --- |
| `V` | Select and move |
| `C` | Connect: drag from one block to another |
| `P` | Send a packet: click the sender, then the receiver |
| `Del` | Delete the selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Ctrl+D` | Duplicate |
| `Ctrl+C` / `Ctrl+V` | Copy / paste |
| `Ctrl+A` | Select everything |
| `Shift`+drag on empty space | Select everything in an area |
| Arrow keys | Nudge the selection one grid square |
| `[` / `]` | Previous / next step |
| `F` | Fit the diagram to the screen |
| Mouse wheel | Zoom |
| Drag empty space, or hold `Space` and drag | Pan |
| `Shift`+click | Add to or remove from the selection |
| Double-click a block | Rename it |

While presenting: `→` or `Space` for the next step, `←` to go back, `Esc` to leave.

## Layout tip

The board is viewed from the front-right, so a block hides whatever passes behind it. Diagrams read
best when each tier sits in a row and traffic flows "up" the board (towards the top right). The
built-in examples are laid out this way. If a connection takes an awkward path, select it and press
**Route** to try the alternatives.

## How the code is organised

Plain JavaScript modules and SVG, built with [Vite](https://vite.dev). No framework.

| File | Job |
| --- | --- |
| `src/iso.js` | Isometric projection and rounded-corner paths |
| `src/catalog.js` | The component library, colours, packet types. Add a component here: one line |
| `src/shapes.js` | Draws each component: blocks, cylinders, laptops, walls |
| `src/icons.js` | Line icons shown on top of blocks |
| `src/router.js` | Picks a path for each connection |
| `src/render.js` | Draws the scene and animates packets |
| `src/state.js` | The diagram, undo history, autosave, file validation |
| `src/ops.js` | Edits: add, connect, delete, duplicate, steps |
| `src/interact.js` | Mouse, touch and keyboard on the canvas |
| `src/ui.js` | Library, properties panel, steps bar, top bar, presenting |
| `src/lang.js` | The diagram language: reads text into a diagram, writes it back, lays it out |
| `src/exporter.js` | PNG, SVG, PDF, animated web page and file export |
| `src/viewer.js`, `src/viewer-runtime.js` | The page and the small player inside an exported web page |
| `src/share.js` | Packs a diagram into a view-only link and unpacks it |
| `src/templates.js` | The example diagrams |
| `src/scene-css.js` | Canvas styles, shared with exported files |

### File formats

A diagram can be saved as diagram code (`.sb`, see [LANGUAGE.md](LANGUAGE.md)) or as JSON, which is
what the editor uses internally:

```json
{
  "app": "scaleboard",
  "name": "My system",
  "steps": [{ "title": "Overview", "text": "" }],
  "nodes": [{ "id": "n1", "kind": "server", "x": 0, "y": 0, "label": "API", "step": 1 }],
  "edges": [{ "id": "e1", "from": "n1", "to": "n2", "arrows": "end", "flow": "normal", "packet": "request" }],
  "zones": [{ "id": "z1", "x": -3, "y": -3, "w": 9, "h": 7, "label": "VPC", "tone": "sky" }]
}
```

`x` and `y` are grid squares. `step` is the first step an item appears in and `until` (optional) is
the last.

## Credits

The visual style is inspired by Dilum Sanjaya's interactive
[System Design course](https://designed-to-scale.vercel.app/). All code and artwork here are
written from scratch. Type is [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (SIL Open Font
License).
