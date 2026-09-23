import { useEffect, useRef, useState } from 'react';
import { QuestionInput } from '../../types';
import { audio } from '../../audio';
import { scoreForAnswer } from '../../scoring';
import { Countdown } from '../../components/Countdown';
import { Shape } from '../../components/Shape';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';

export function TestQuestion({
  question,
  index,
  total,
  onResult,
  onNext,
}: {
  question: QuestionInput;
  index: number;
  total: number;
  onResult: (result: TestResult) => void;
  onNext?: () => void;
}) {
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<TestResult | null>(null);
  const resultRef = useRef<TestResult | null>(null);

  const correctValue = question.type === 'multiple_choice' ? question.correctIndex : question.correctCount;

  const finish = (value: number | null) => {
    if (resultRef.current) return;
    const elapsedMs = Date.now() - startedAt;
    const correct = value === correctValue;
    const next: TestResult = {
      value,
      elapsedMs,
      correct,
      pointsAwarded: correct ? scoreForAnswer(question.points, question.timeLimitSec, elapsedMs) : 0,
    };
    resultRef.current = next;
    setResult(next);
    onResult(next);
    if (correct) audio.play('correct');
  };

  useEffect(() => {
    if (question.type !== 'multiple_choice') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) finish(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="page">
      <div className="hint">
        Question {index + 1} / {total} · {question.points} pts · {question.timeLimitSec}s
      </div>
      <h1 className="question-text">{question.text}</h1>
      {result ? (
        <ResultBanner result={result} correctValue={correctValue} />
      ) : question.type === 'multiple_choice' ? (
        <Countdown startedAt={startedAt} timeLimitSec={question.timeLimitSec} onExpire={() => finish(null)} />
      ) : null}

      {!result && question.type === 'multiple_choice' && (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <button
              key={i}
              className={optionClass(i, question.correctIndex, result)}
              disabled={Boolean(result)}
              onClick={() => finish(i)}
            >
              <Shape index={i} />
              <span style={{ flex: 1, textAlign: 'left' }}>{text}</span>
              {result && (result as TestResult).value === i && <span>👈</span>}
            </button>
          ))}
        </div>
      )}

      {!result && question.type === 'drag_count' && (
        <DragCanvas
          dragLabel={question.dragLabel}
          {...dragSoundPropsFor(question.dragLabel)}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {result && onNext && (
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Next question ▶
        </button>
      )}
    </div>
  );
}

export interface TestResult {
  value: number | null;
  elapsedMs: number;
  correct: boolean;
  pointsAwarded: number;
}

function ResultBanner({ result, correctValue }: { result: TestResult; correctValue: number }) {
  const seconds = (result.elapsedMs / 1000).toFixed(1);
  if (result.value === null) {
    return <h2 className="title">Tempo scaduto! ⏰</h2>;
  }
  return (
    <div>
      <h2 className="title">{result.correct ? 'Perfetto! 🎉' : 'Peccato! 😅'}</h2>
      <p className="subtitle">
        {result.correct ? `+${result.pointsAwarded} points` : `No points · correct was ${correctValue}`} · answered
        in {seconds}s
      </p>
    </div>
  );
}

function optionClass(i: number, correctIndex: number, result: TestResult | null) {
  const classes = ['shape-btn', `shape-${i}`];
  if (result) classes.push(i === correctIndex ? 'correct' : 'dimmed');
  return classes.join(' ');
}
