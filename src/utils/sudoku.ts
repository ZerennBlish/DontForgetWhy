export type Difficulty = 'easy' | 'medium' | 'hard';

export type Grid = (number | 0)[][];

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
  difficulty: Difficulty;
}

function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function copyGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValidPlacement(
  grid: Grid,
  row: number,
  col: number,
  num: number,
): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function solveFull(grid: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValidPlacement(grid, r, c, n)) {
            grid[r][c] = n;
            if (solveFull(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid: Grid, limit: number): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        let count = 0;
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(grid, r, c, n)) {
            grid[r][c] = n;
            count += countSolutions(grid, limit - count);
            grid[r][c] = 0;
            if (count >= limit) return count;
          }
        }
        return count;
      }
    }
  }
  return 1;
}

const REMOVAL_COUNT: Record<Difficulty, [number, number]> = {
  easy: [30, 35],
  medium: [40, 45],
  hard: [50, 55],
};

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const deadline = Date.now() + 500;

  while (Date.now() < deadline) {
    const solution = createEmptyGrid();
    if (!solveFull(solution)) continue;

    const puzzle = copyGrid(solution);
    const [minRemove, maxRemove] = REMOVAL_COUNT[difficulty];
    const target = minRemove + Math.floor(Math.random() * (maxRemove - minRemove + 1));

    // Build list of cells and shuffle for random removal
    const cells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
    const shuffledCells = shuffleArray(cells);

    let removed = 0;
    for (const [r, c] of shuffledCells) {
      if (removed >= target) break;
      if (Date.now() >= deadline) break;

      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Also remove symmetric cell
      const sr = 8 - r;
      const sc = 8 - c;
      const symBackup = puzzle[sr][sc];
      const isSymSame = sr === r && sc === c;
      if (!isSymSame) puzzle[sr][sc] = 0;

      // Check unique solution
      const check = copyGrid(puzzle);
      if (countSolutions(check, 2) === 1) {
        removed += isSymSame ? 1 : 2;
      } else {
        puzzle[r][c] = backup;
        if (!isSymSame) puzzle[sr][sc] = symBackup;
      }
    }

    if (removed >= minRemove) {
      return { puzzle, solution: copyGrid(solution), difficulty };
    }
  }

  // Timeout fallback: generate a simple puzzle with uniqueness validation
  const [fallbackMin] = REMOVAL_COUNT[difficulty];
  const fallbackTarget = fallbackMin;

  for (let attempt = 0; attempt < 3; attempt++) {
    const solution = createEmptyGrid();
    solveFull(solution);
    const puzzle = copyGrid(solution);
    const cells = shuffleArray(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number]),
    );
    let removed = 0;
    for (const [r, c] of cells) {
      if (removed >= fallbackTarget) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      const check = copyGrid(puzzle);
      if (countSolutions(check, 2) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }
    if (removed >= fallbackMin) {
      return { puzzle, solution: copyGrid(solution), difficulty };
    }
  }

  // Last resort: simple removal without uniqueness check
  console.warn('[sudoku] fallback puzzle generated without uniqueness guarantee');
  const solution = createEmptyGrid();
  solveFull(solution);
  const puzzle = copyGrid(solution);
  const cells = shuffleArray(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number]),
  );
  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= fallbackTarget) break;
    puzzle[r][c] = 0;
    removed++;
  }
  return { puzzle, solution: copyGrid(solution), difficulty };
}

export function checkComplete(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
