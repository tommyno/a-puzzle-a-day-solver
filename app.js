import { BOARD, PIECES, SIZE, solve } from './solver.js';

const COOLDOWN = 60; // seconds to wait between hints
const MONTHS = BOARD.slice(0, 2).flat().filter(Boolean); // 'Jan' … 'Dec'
// Wood stain for each piece, light to dark like the real puzzle
const WOODS = ['#c9975e', '#a0603a', '#7c5236', '#b88352', '#5f4130', '#93765b', '#8a4f33', '#a98a69'];

const dateInput = document.getElementById('date');
const countNumber = document.getElementById('count-number');
const countLabel = document.getElementById('count-label');
const boardEl = document.getElementById('board');
const logo = boardEl.querySelector('.logo');
const hintButton = document.getElementById('hint');
const otherButton = document.getElementById('other');
const cooldownText = document.getElementById('cooldown');

let month, day;
let solutions = [];
let solutionIndex = 0; // which solution the hints come from
let hintsShown = 0;
let cooldown = 0; // seconds left before the next hint
let timer;

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
  stopCooldown();

  countNumber.textContent = solutions.length;
  // e.g. "October 9" or "9. oktober", depending on the browser's locale
  const date = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
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
        return c >= 0 && c < SIZE && pieceAt[r * SIZE + c] === piece;
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
      cell.classList.toggle('inner-tl', up && left && !same(-1, -1));
      cell.classList.toggle('inner-tr', up && right && !same(-1, 1));
      cell.classList.toggle('inner-br', down && right && !same(1, 1));
      cell.classList.toggle('inner-bl', down && left && !same(1, -1));
    }
  });
  boardEl.replaceChildren(...cells, logo);
  renderControls();
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

dateInput.value = today();
dateInput.addEventListener('change', onDateChange);
hintButton.addEventListener('click', onHint);
otherButton.addEventListener('click', onOther);
onDateChange();
