import { BOARD, PIECES, SIZE, solve } from "./solver.js";

const COOLDOWN = 60; // seconds to wait between hints
const MONTHS = BOARD.slice(0, 2).flat().filter(Boolean); // 'Jan' … 'Dec'

// Board drawing, in SVG units (see the viewBox in index.html)
const CELL = 100;
const GAP = 8;
const STEP = CELL + GAP;
const WIDTH = SIZE * STEP - GAP; // whole board
const RADIUS = 10; // rounded corners
const RING = 6; // ring around today's cells

// Wood stain for each piece, light to dark like the real puzzle
const WOODS = [
  "#c9975e",
  "#a0603a",
  "#7c5236",
  "#b88352",
  "#5f4130",
  "#93765b",
  "#8a4f33",
  "#a98a69",
];

const dateInput = document.getElementById("date");
const countNumber = document.getElementById("count-number");
const countLabel = document.getElementById("count-label");
const layer = document.getElementById("layer");
const hintButton = document.getElementById("hint");
const otherButton = document.getElementById("other");
const cooldownText = document.getElementById("cooldown");

let month, day;
let solutions = [];
let solutionIndex = 0; // which solution the hints come from
let hintsShown = 0;
let cooldown = 0; // seconds left before the next hint
let timer;

// Today's date as YYYY-MM-DD in local time
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function onDateChange() {
  const [y, m, d] = dateInput.value.split("-").map(Number);
  if (!m || !d) return;

  month = MONTHS[m - 1];
  day = String(d);

  solutions = solve(month, day);
  solutionIndex = 0;
  hintsShown = 0;
  stopCooldown();

  countNumber.textContent = solutions.length;
  // e.g. "October 9" or "9. oktober", depending on the browser's locale
  const date = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  countLabel.textContent = `solutions for ${date}`;
  render();
}

function onHint() {
  hintsShown++;
  startCooldown();
  render();
}

// Count down once per second, then enable the hint button again
function startCooldown() {
  cooldown = COOLDOWN;
  clearInterval(timer);
  timer = setInterval(() => {
    cooldown--;
    if (cooldown <= 0) clearInterval(timer);
    renderControls();
  }, 1000);
}

function stopCooldown() {
  cooldown = 0;
  clearInterval(timer);
}

// Switch to the next solution (wraps around) and clear the board
function onOther() {
  solutionIndex = (solutionIndex + 1) % solutions.length;
  hintsShown = 0;
  stopCooldown();
  render();
}

function render() {
  const solution = solutions[solutionIndex] ?? [];
  const placed = solution.slice(0, hintsShown);
  const covered = new Set(placed.flatMap((p) => p.cells));

  // Open board cells with their labels. Covered cells are skipped so the
  // piece edges always sit on the dark frame.
  const cells = BOARD.flatMap((labels, row) =>
    labels.map((label, col) => {
      if (label === null || covered.has(row * SIZE + col)) return "";
      const x = col * STEP;
      const y = row * STEP;
      const isTarget = label === month || label === day;
      const cls = isTarget ? " target" : "";
      // SVG strokes straddle the edge, so shrink today's cells by half
      // the ring width to keep the ring inside the cell
      const inset = isTarget ? RING / 2 : 0;
      const size = CELL - 2 * inset;
      return `<rect class="cell${cls}" x="${x + inset}" y="${y + inset}" width="${size}" height="${size}" rx="${RADIUS - inset}" stroke-width="${RING}"/>
        <text class="label${cls}" x="${x + CELL / 2}" y="${y + CELL / 2}">${label}</text>`;
    }),
  );

  // Placed pieces: wood colour, then grain on top. Alternate the grain
  // direction so neighbouring pieces stand apart. The newest one drops in.
  const pieces = placed.map((p, n) => {
    const d = piecePath(p.cells);
    const grain = p.piece % 2 ? "grain-v" : "grain-h";
    return `<g class="piece${n === placed.length - 1 ? " new" : ""}">
      <path d="${d}" fill="${WOODS[p.piece]}"/>
      <path d="${d}" fill="url(#${grain})"/>
    </g>`;
  });

  layer.innerHTML = cells.join("") + pieces.join("");
  renderControls();
}

// Outline of a piece as an SVG path with rounded corners
function piecePath(cells) {
  const inPiece = new Set(cells);

  // Walk the outline clockwise along the cell sides that don't touch
  // another cell of the piece. Points are grid corners as [x, y].
  const next = {};
  for (const i of cells) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const has = (dr, dc) =>
      c + dc >= 0 && c + dc < SIZE && inPiece.has(i + dr * SIZE + dc);
    if (!has(-1, 0)) next[[c, r]] = [c + 1, r]; // top side, going right
    if (!has(0, 1)) next[[c + 1, r]] = [c + 1, r + 1]; // right side, going down
    if (!has(1, 0)) next[[c + 1, r + 1]] = [c, r + 1]; // bottom side, going left
    if (!has(0, -1)) next[[c, r + 1]] = [c, r]; // left side, going up
  }
  // Follow the sides from point to point; there's one point per side
  const points = [];
  let p = Object.values(next)[0];
  for (let k = 0; k < Object.keys(next).length; k++) {
    points.push(p);
    p = next[p];
  }

  // Keep the turns, moved to the cell edges: right and bottom sides end
  // a gap before the next grid line
  const corners = [];
  points.forEach(([x, y], k) => {
    const [px, py] = points.at(k - 1);
    const [nx, ny] = points.at((k + 1) % points.length);
    if (x - px === nx - x && y - py === ny - y) return; // straight on, not a corner

    const down = py < y || ny > y; // going down = right side
    const left = px > x || nx < x; // going left = bottom side
    corners.push([x * STEP - (down ? GAP : 0), y * STEP - (left ? GAP : 0)]);
  });

  // Round each corner: stop RADIUS before it, curve through it
  const toward = ([ax, ay], [bx, by]) => [
    ax + Math.sign(bx - ax) * RADIUS,
    ay + Math.sign(by - ay) * RADIUS,
  ];
  const d = corners.map((corner, k) => {
    const before = toward(corner, corners.at(k - 1));
    const after = toward(corner, corners.at((k + 1) % corners.length));
    return `${k ? "L" : "M"}${before} Q${corner} ${after}`;
  });
  return d.join(" ") + " Z";
}

function renderControls() {
  const solution = solutions[solutionIndex] ?? [];
  const allShown = hintsShown >= solution.length;

  hintButton.disabled = allShown || cooldown > 0;
  hintButton.textContent = `Hint ${hintsShown}/${PIECES.length}`;

  otherButton.disabled = solutions.length < 2;
  otherButton.textContent = `Solution ${solutionIndex + 1}/${solutions.length} ↻`;

  cooldownText.hidden = allShown || cooldown <= 0;
  cooldownText.textContent = `Try to solve it yourself. Wait ${cooldown} s before next hint.`;
}

// Size the board, and put the logo in the empty end of the last row
const board = document.getElementById("board");
const logo = document.getElementById("logo");
board.setAttribute("viewBox", `0 0 ${WIDTH} ${WIDTH}`);
logo.setAttribute("x", WIDTH);
logo.setAttribute("y", (SIZE - 1) * STEP + CELL / 2);

dateInput.value = today();
dateInput.addEventListener("change", onDateChange);
hintButton.addEventListener("click", onHint);
otherButton.addEventListener("click", onOther);
onDateChange();
