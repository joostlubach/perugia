import { Shape } from './Shape';

export function AnswerOption({
  index,
  text,
  count,
  maxCount,
  isCorrect,
  revealed,
  picked,
}: {
  index: number;
  text: string;
  count?: number;
  maxCount?: number;
  isCorrect?: boolean;
  revealed?: boolean;
  // The one option a single player picked, when showing their answer.
  picked?: boolean;
}) {
  const dimmed = revealed && !isCorrect && !picked;
  const pct = count !== undefined && maxCount ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div className={`shape-btn shape-${index} ${dimmed ? 'dimmed' : ''} ${revealed && isCorrect ? 'correct' : ''} ${picked ? 'picked' : ''}`}>
      <Shape index={index} />
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div>{text}</div>
        {count !== undefined && (
          <div className="count-bar-track">
            <div className="count-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {count !== undefined && <div>{count}</div>}
      {picked && <div>👈</div>}
    </div>
  );
}
