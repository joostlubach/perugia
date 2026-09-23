import { useEffect, useRef, useState } from 'react';
import { HamLine, MultiSelectAnswer, PlateAnswer, QuestionInput, TraceAnswer } from '../../types';
import { audio } from '../../audio';
import {
  countCorrectGroupings,
  countCorrectPlacements,
  countCorrectPlateMarks,
  countCorrectSelections,
  scoreForAnswer,
  scoreHamCut,
  scoreTraceMarks,
  totalPlacements,
} from '../../scoring';
import { Countdown } from '../../components/Countdown';
import { Shape } from '../../components/Shape';
import { MenuCard } from '../../components/MenuCard';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';
import { PodiumOrder } from '../../components/PodiumOrder';
import { PlateBoard } from '../../components/PlateBoard';
import { HamCutBoard } from '../../components/HamCutBoard';
import { MultiSelectBoard } from '../../components/MultiSelectBoard';
import { TraceMarksBoard } from '../../components/TraceMarksBoard';
import { TravelMapBoard } from '../../components/TravelMapBoard';
import { QuestionText } from '../../components/QuestionText';

type Answer = number | string[][] | PlateAnswer | HamLine | MultiSelectAnswer | TraceAnswer | null;

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
  const partialCredit =
    question.type === 'podium_order' ||
    question.type === 'travel_map' ||
    question.type === 'plate_assignment' ||
    question.type === 'ham_cut' ||
    question.type === 'multi_select' ||
    question.type === 'trace_marks';
  const isPercent = question.type === 'ham_cut' || question.type === 'trace_marks';

  const seats =
    question.type === 'plate_assignment' ? [question.head, ...question.left, ...question.right] : [];

  const correctValue =
    question.type === 'multiple_choice'
      ? question.correctIndex
      : question.type === 'drag_count'
      ? question.correctCount
      : question.type === 'plate_assignment'
      ? seats.length * 2
      : question.type === 'ham_cut' || question.type === 'trace_marks'
      ? 100
      : question.type === 'multi_select'
      ? question.options.length
      : question.type === 'travel_map'
      ? totalPlacements(question.correctGroups)
      : totalPlacements(question.correctOrder);

  const [travelPeople] = useState(() =>
    question.type === 'travel_map' ? question.correctGroups.flat().sort() : [],
  );
  const [podiumGroups] = useState(() =>
    question.type === 'podium_order' ? question.correctOrder.map((group) => [...group].sort()) : [],
  );

  const finish = (answer: Answer) => {
    if (resultRef.current) return;
    const elapsedMs = Date.now() - startedAt;
    let value: number | null;
    if (Array.isArray(answer) && question.type === 'podium_order') {
      value = countCorrectPlacements(answer, question.correctOrder);
    } else if (Array.isArray(answer) && question.type === 'travel_map') {
      value = countCorrectGroupings(answer, question.correctGroups);
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && 'p1' in answer && question.type === 'ham_cut') {
      value = scoreHamCut(answer, question.rows);
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && 'strokes' in answer && question.type === 'trace_marks') {
      value = scoreTraceMarks(answer.strokes, question.marks, question.aspectRatio);
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && 'selected' in answer && question.type === 'multi_select') {
      value = countCorrectSelections(answer.selected, question.correctIndexes, question.options.length);
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && question.type === 'plate_assignment') {
      value = countCorrectPlateMarks(
        answer as PlateAnswer,
        { correctPrimo: question.correctPrimo, correctSecondo: question.correctSecondo },
        seats,
      );
    } else {
      value = answer as number | null;
    }
    const correct =
      question.type === 'ham_cut'
        ? (value ?? 0) >= 95
        : question.type === 'trace_marks'
        ? (value ?? 0) >= 80
        : value === correctValue;
    // Mirrors the server: podium_order/plate_assignment/ham_cut get partial credit.
    const points = partialCredit ? Math.round((question.points * (value ?? 0)) / correctValue) : question.points;
    const next: TestResult = {
      value,
      elapsedMs,
      correct,
      pointsAwarded: (correct || partialCredit) && points > 0 ? scoreForAnswer(points, question.timeLimitSec, elapsedMs) : 0,
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
        Question {index + 1} / {total} · {question.title} · {question.points} pts · {question.timeLimitSec}s
      </div>
      <h1 className="question-text"><QuestionText text={('playerText' in question && question.playerText) || question.text} /></h1>
      {!result && question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}
      {result ? (
        <ResultBanner result={result} correctValue={correctValue} partialCredit={partialCredit} isPercent={isPercent} />
      ) : question.type === 'multiple_choice' ? (
        <Countdown startedAt={startedAt} timeLimitSec={question.timeLimitSec} onExpire={() => finish(null)} />
      ) : null}

      {!result && question.type === 'multiple_choice' && question.menu && (
        <MenuCard menu={question.menu} onPick={finish} />
      )}

      {!result && question.type === 'multiple_choice' && !question.menu && (
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

      {!result && question.type === 'podium_order' && (
        <PodiumOrder
          groups={podiumGroups}
          groupLabels={question.groupLabels}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {!result && question.type === 'travel_map' && (
        <TravelMapBoard
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          landmarks={question.landmarks}
          stops={question.stops}
          people={travelPeople}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {!result && question.type === 'plate_assignment' && (
        <PlateBoard
          head={question.head}
          left={question.left}
          right={question.right}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {!result && question.type === 'ham_cut' && (
        <HamCutBoard
          imageUrl={question.imageUrl}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {!result && question.type === 'multi_select' && (
        <MultiSelectBoard
          options={question.options}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(selected) => finish({ selected })}
        />
      )}

      {!result && question.type === 'trace_marks' && (
        <TraceMarksBoard
          imageUrl={question.imageUrl}
          aspectRatio={question.aspectRatio}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(strokes) => finish({ strokes })}
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

function ResultBanner({
  result,
  correctValue,
  partialCredit,
  isPercent,
}: {
  result: TestResult;
  correctValue: number;
  partialCredit: boolean;
  isPercent: boolean;
}) {
  const seconds = (result.elapsedMs / 1000).toFixed(1);
  if (result.value === null) {
    return <h2 className="title">Tempo scaduto! ⏰</h2>;
  }
  return (
    <div>
      <h2 className="title">
        {result.correct ? 'Perfetto! 🎉' : result.pointsAwarded > 0 ? 'Quasi! 👌' : 'Peccato! 😅'}
      </h2>
      <p className="subtitle">
        {isPercent
          ? `${result.value}% · +${result.pointsAwarded} points`
          : partialCredit
          ? `${result.value} / ${correctValue} placed right · +${result.pointsAwarded} points`
          : result.correct
          ? `+${result.pointsAwarded} points`
          : `No points · correct was ${correctValue}`}{' '}
        · answered in {seconds}s
      </p>
    </div>
  );
}

function optionClass(i: number, correctIndex: number, result: TestResult | null) {
  const classes = ['shape-btn', `shape-${i}`];
  if (result) classes.push(i === correctIndex ? 'correct' : 'dimmed');
  return classes.join(' ');
}
