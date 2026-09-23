import { QuestionInput } from '../../types';
import { TestResult } from './TestQuestion';

export function TestNavigator({
  questions,
  index,
  results,
  totalScore,
  onGoTo,
  onRestart,
}: {
  questions: QuestionInput[];
  index: number;
  results: Record<number, TestResult>;
  totalScore: number;
  onGoTo: (index: number) => void;
  onRestart: () => void;
}) {
  return (
    <div className="test-nav">
      <button className="btn" disabled={index === 0} onClick={() => onGoTo(index - 1)}>
        ◀
      </button>
      <select value={index} onChange={(e) => onGoTo(Number(e.target.value))}>
        {questions.map((q, i) => (
          <option key={i} value={i}>
            {resultMark(results[i])} {i + 1}. {q.title}
          </option>
        ))}
      </select>
      <button className="btn" disabled={index === questions.length - 1} onClick={() => onGoTo(index + 1)}>
        ▶
      </button>
      <button className="btn btn-gold" onClick={onRestart}>
        ↻
      </button>
      <div className="test-score">{totalScore} pts</div>
    </div>
  );
}

function resultMark(result: TestResult | undefined) {
  if (!result) return '·';
  return result.correct ? '✅' : '❌';
}
