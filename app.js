import { BOARD, PIECES, SIZE, solve } from './solver.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#8ab17d', '#9b5de5', '#457b9d'];

const dateInput = document.getElementById('date');
const countText = document.getElementById('count');
const boardEl = document.getElementById('board');
const hintButton = document.getElementById('hint');
const otherButton = document.getElementById('other');

let month, day;
let solutions = [];
let solutionIndex = 0; // which solution the hints come from
let hintsShown = 0;

// Today's date as YYYY-MM-DD in local time
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function onDateChange() {
  const [, m, d] = dateInput.value.split('-').map(Number);
  if (!m || !d) return;

  month = MONTHS[m - 1];
  day = String(d);

  solutions = solve(month, day);
  solutionIndex = 0;
  hintsShown = 0;

  countText.textContent = `${solutions.length} solutions for ${month} ${day}`;
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

  boardEl.innerHTML = '';
  BOARD.flat().forEach((label, i) => {
    const cell = document.createElement('div');
    boardEl.appendChild(cell);
    if (label === null) return; // empty space outside the board

    cell.className = 'cell';
    cell.textContent = label;
    if (label === month || label === day) cell.classList.add('target');
    if (i in pieceAt) {
      cell.classList.add('covered');
      cell.style.background = COLORS[pieceAt[i]];
    }
  });

  hintButton.disabled = hintsShown >= solution.length;
  hintButton.textContent = `Hint (${hintsShown}/${PIECES.length})`;

  otherButton.disabled = solutions.length < 2;
  otherButton.textContent = `Other solution (${solutionIndex + 1}/${solutions.length})`;
}

boardEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
dateInput.value = today();
dateInput.addEventListener('change', onDateChange);
hintButton.addEventListener('click', onHint);
otherButton.addEventListener('click', onOther);
onDateChange();
