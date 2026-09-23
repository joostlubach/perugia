import { Shape } from './Shape';

export function AnswerOption({
  index,
  text,
  count,
  maxCount,
  isCorrect,
  revealed,
}: {
  index: number;
  text: string;
  count: number;
  maxCount: number;
  isCorrect?: boolean;
  revealed?: boolean;
}) {
  const dimmed = revealed && !isCorrect;
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div className={`shape-btn shape-${index} ${dimmed ? 'dimmed' : ''} ${revealed && isCorrect ? 'correct' : ''}`}>
      <Shape index={index} />
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div>{text}</div>
        <div className="count-bar-track">
          <div className="count-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div>{count}</div>
    </div>
  );
}
