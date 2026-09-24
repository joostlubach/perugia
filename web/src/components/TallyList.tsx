// Per-answer counts with a bar, for the reveal.
export function TallyList({
  items,
  counts,
  isCorrect,
}: {
  items: string[];
  counts: number[];
  isCorrect?: (index: number) => boolean;
}) {
  const maxCount = Math.max(1, ...counts);

  return (
    <ol className="tally-list">
      {items.map((text, i) => {
        const count = counts[i] ?? 0;
        const correct = isCorrect?.(i);
        return (
          <li key={i} className={correct === undefined ? '' : correct ? 'correct' : 'dimmed'}>
            <div className="tally-row">
              <span>
                {correct === undefined ? '' : correct ? '✅ ' : '❌ '}
                {text}
              </span>
              <span>{count}</span>
            </div>
            <div className="count-bar-track">
              <div className="count-bar-fill" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
