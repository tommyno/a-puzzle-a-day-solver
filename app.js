import { BOARD, PIECES, SIZE, solve } from './solver.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Wood stain for each piece, light to dark like the real puzzle
const WOODS = ['#c9975e', '#a0603a', '#7c5236', '#b88352', '#5f4130', '#93765b', '#8a4f33', '#a98a69'];

const dateInput = document.getElementById('date');
const countNumber = document.getElementById('count-number');
const countLabel = document.getElementById('count-label');
const boardEl = document.getElementById('board');
const logo = boardEl.querySelector('.logo');
const hintButton = document.getElementById('hint');
const otherButton = document.getElementById('other');

let month, day;
let solutions = [];
let solutionIndex = 0; // which solution the hints come from
let hintsShown = 0;

// Points on a quarter circle, as [sin, cos] from 0° to 90°
const ARC = [0, 22.5, 45, 67.5, 90].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad).toFixed(3), Math.cos(rad).toFixed(3)];
});

// Clip path that cuts a rounded notch (radius --join) into the given
// corners of a cell, so the piece gets rounded inner corners
function innerCornerClip({ tl, tr, br, bl }) {
  const point = (right, bottom, dx, dy) => {
    const x = right ? `calc(100% - ${dx} * var(--join))` : `calc(${dx} * var(--join))`;
    const y = bottom ? `calc(100% - ${dy} * var(--join))` : `calc(${dy} * var(--join))`;
    return `${x} ${y}`;
  };
  // Walk clockwise; `flip` swaps the arc direction to match
  const arc = (right, bottom, flip) =>
    ARC.map(([sin, cos]) => (flip ? point(right, bottom, cos, sin) : point(right, bottom, sin, cos)));

  return `polygon(${[
    ...(tl ? arc(false, false, false) : ['0 0']),
    ...(tr ? arc(true, false, true) : ['100% 0']),
    ...(br ? arc(true, true, false) : ['100% 100%']),
    ...(bl ? arc(false, true, true) : ['0 100%']),
  ].join(', ')})`;
}

// Today's date as YYYY-MM-DD in local time
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function onDateChange() {
  const [y, m, d] = dateInput.value.split('-').map(Number);
  if (!m || !d) return;

  month = MONTHS[m - 1];
  day = String(d);

  solutions = solve(month, day);
  solutionIndex = 0;
  hintsShown = 0;

  countNumber.textContent = solutions.length;
  // e.g. "October 9" or "9. oktober", depending on the browser's locale
  const date = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  countLabel.textContent = `solutions for ${date}`;
  render();
}

function onHint() {
  hintsShown++;
  render();
}

// Switch to the next solution (wraps around) and clear the board
function onOther() {
  solutionIndex = (solutionIndex + 1) % solutions.length;
  hintsShown = 0;
  render();
}

function render() {
  const solution = solutions[solutionIndex] ?? [];

  // Which piece (if any) covers each cell
  const pieceAt = {};
  solution.slice(0, hintsShown).forEach((p) => {
    p.cells.forEach((c) => (pieceAt[c] = p.piece));
  });
  const latest = solution[hintsShown - 1]?.piece; // animate the newest piece

  const cells = [];
  BOARD.flat().forEach((label, i) => {
    if (label === null) return; // not part of the board

    const cell = document.createElement('div');
    cells.push(cell);
    cell.className = 'cell';
    cell.textContent = label;

    // Grid position, also used to line up the wood grain across cells
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    cell.style.gridArea = `${row + 1} / ${col + 1}`;
    cell.style.setProperty('--row', row);
    cell.style.setProperty('--col', col);

    if (label === month || label === day) cell.classList.add('target');
    if (i in pieceAt) {
      const piece = pieceAt[i];
      cell.classList.add('covered');
      cell.style.setProperty('--wood', WOODS[piece]);
      // Alternate grain direction so neighbouring pieces stand apart
      cell.style.setProperty('--grain-angle', piece % 2 ? '90deg' : '0deg');
      if (piece === latest) cell.classList.add('new');

      // Is the neighbour at (row + dr, col + dc) part of the same piece?
      const same = (dr, dc) => {
        const r = row + dr;
        const c = col + dc;
        return r >= 0 && r < SIZE && c >= 0 && c < SIZE && pieceAt[r * SIZE + c] === piece;
      };

      // Join with neighbours of the same piece so it reads as one shape
      const up = same(-1, 0);
      const down = same(1, 0);
      const left = same(0, -1);
      const right = same(0, 1);
      cell.classList.toggle('join-up', up);
      cell.classList.toggle('join-down', down);
      cell.classList.toggle('join-left', left);
      cell.classList.toggle('join-right', right);

      // Stretching two ways also fills the gap corner between them. Where
      // the diagonal cell isn't the same piece, that's an inner corner:
      // cut it out again with a rounded notch.
      const inner = {
        tl: up && left && !same(-1, -1),
        tr: up && right && !same(-1, 1),
        br: down && right && !same(1, 1),
        bl: down && left && !same(1, -1),
      };
      if (inner.tl || inner.tr || inner.br || inner.bl) {
        cell.style.clipPath = innerCornerClip(inner);
      }
    }
  });
  boardEl.replaceChildren(...cells, logo);

  hintButton.disabled = hintsShown >= solution.length;
  hintButton.textContent = `Hint ${hintsShown}/${PIECES.length}`;

  otherButton.disabled = solutions.length < 2;
  otherButton.textContent = `Solution ${solutionIndex + 1}/${solutions.length} ↻`;
}

dateInput.value = today();
dateInput.addEventListener('change', onDateChange);
hintButton.addEventListener('click', onHint);
otherButton.addEventListener('click', onOther);
onDateChange();
