// Board layout as a 7x7 grid. null = not part of the board.
export const BOARD = [
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', null],
  ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', null],
  ['1', '2', '3', '4', '5', '6', '7'],
  ['8', '9', '10', '11', '12', '13', '14'],
  ['15', '16', '17', '18', '19', '20', '21'],
  ['22', '23', '24', '25', '26', '27', '28'],
  ['29', '30', '31', null, null, null, null],
];

export const SIZE = 7;

// The 8 pieces. '#' = filled square.
export const PIECES = [
  ['###', '###'],          // Rectangle
  ['###', '##.'],          // P
  ['###', '#.#'],          // U
  ['###', '#..', '#..'],   // V
  ['##.', '.#.', '.##'],   // Z
  ['####', '#...'],        // L
  ['####', '.#..'],        // Y
  ['###.', '..##'],        // N
];

// Turn a shape like ['##', '#.'] into a list of [row, col] squares.
function toSquares(shape) {
  const squares = [];
  shape.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === '#') squares.push([r, c]);
    });
  });
  return squares;
}

// Shift squares so the top-left is at (0, 0), and sort them.
function normalize(squares) {
  const minR = Math.min(...squares.map(([r]) => r));
  const minC = Math.min(...squares.map(([, c]) => c));
  return squares
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// All unique rotations and flips of a shape (up to 8).
function orientations(shape) {
  const unique = new Map();
  let squares = toSquares(shape);
  for (let flip = 0; flip < 2; flip++) {
    for (let rot = 0; rot < 4; rot++) {
      squares = squares.map(([r, c]) => [c, -r]); // rotate 90°
      const norm = normalize(squares);
      unique.set(JSON.stringify(norm), norm);
    }
    squares = squares.map(([r, c]) => [r, -c]); // mirror
  }
  return [...unique.values()];
}

// Every way each piece can be placed on the board.
// A placement is { piece, cells }, where cells are indices (row * SIZE + col).
function allPlacements() {
  const placements = [];
  PIECES.forEach((shape, piece) => {
    for (const squares of orientations(shape)) {
      for (let r0 = 0; r0 < SIZE; r0++) {
        for (let c0 = 0; c0 < SIZE; c0++) {
          const cells = squares.map(([r, c]) => [r + r0, c + c0]);
          const fits = cells.every(([r, c]) => r < SIZE && c < SIZE && BOARD[r][c] !== null);
          if (fits) placements.push({ piece, cells: cells.map(([r, c]) => r * SIZE + c) });
        }
      }
    }
  });
  return placements;
}

const PLACEMENTS = allPlacements();

// Group placements by their first (lowest) cell. When the search fills the
// first empty cell, only placements starting at that cell can cover it.
const PLACEMENTS_BY_FIRST_CELL = Array.from({ length: SIZE * SIZE }, () => []);
for (const p of PLACEMENTS) {
  PLACEMENTS_BY_FIRST_CELL[Math.min(...p.cells)].push(p);
}

// Index of the cell with the given label, e.g. 'Oct' or '17'.
export function cellIndex(label) {
  const flat = BOARD.flat();
  return flat.indexOf(label);
}

// Find all solutions that leave `month` and `day` uncovered.
// Each solution is a list of 8 placements.
export function solve(month, day) {
  const filled = BOARD.flat().map((label) => label === null);
  filled[cellIndex(month)] = true;
  filled[cellIndex(day)] = true;

  const used = PIECES.map(() => false);
  const current = [];
  const solutions = [];

  function search(start) {
    // Find the first empty cell
    let cell = start;
    while (cell < filled.length && filled[cell]) cell++;

    if (cell === filled.length) {
      solutions.push([...current]);
      return;
    }

    // Try every unused piece that can cover this cell
    for (const p of PLACEMENTS_BY_FIRST_CELL[cell]) {
      if (used[p.piece] || p.cells.some((c) => filled[c])) continue;

      p.cells.forEach((c) => (filled[c] = true));
      used[p.piece] = true;
      current.push(p);

      search(cell + 1);

      current.pop();
      used[p.piece] = false;
      p.cells.forEach((c) => (filled[c] = false));
    }
  }

  search(0);
  return solutions;
}
