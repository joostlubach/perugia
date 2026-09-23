const SHAPES = ['triangle', 'diamond', 'circle', 'square'] as const;

export function Shape({ index }: { index: number }) {
  const kind = SHAPES[index % SHAPES.length];
  return (
    <svg className="shape-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      {kind === 'triangle' && <polygon points="16,4 29,28 3,28" />}
      {kind === 'diamond' && <polygon points="16,3 29,16 16,29 3,16" />}
      {kind === 'circle' && <circle cx="16" cy="16" r="13" />}
      {kind === 'square' && <rect x="4" y="4" width="24" height="24" rx="3" />}
    </svg>
  );
}
