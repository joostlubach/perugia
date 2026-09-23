import { useEffect, useRef, useState } from 'react';
import { HamLine, MultiSelectAnswer, PlateAnswer, QuestionInput, TextAnswer, TraceAnswer } from '../../types';
import { audio } from '../../audio';
import {
  countCorrectGroupings,
  countCorrectMenuPicks,
  countCorrectPlacements,
  countCorrectPlateMarks,
  countCorrectSelections,
  isCorrectOption,
  scoreCount,
  scoreForAnswer,
  scoreEstimate,
  scoreHamCut,
  scoreTraceMarks,
  totalPlacements,
} from '../../scoring';
import { Countdown } from '../../components/Countdown';
import { Shape } from '../../components/Shape';
import { MenuOrderBoard } from '../../components/MenuOrderBoard';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';
import { PodiumOrder } from '../../components/PodiumOrder';
import { PlateBoard } from '../../components/PlateBoard';
import { HamCutBoard } from '../../components/HamCutBoard';
import { MultiSelectBoard } from '../../components/MultiSelectBoard';
import { TraceMarksBoard } from '../../components/TraceMarksBoard';
import { TravelMapBoard } from '../../components/TravelMapBoard';
import { formatEuro, MoneyVaseBoard } from '../../components/MoneyVase';
import { QuestionText } from '../../components/QuestionText';
import { OpenAnswerBoard } from '../../components/OpenAnswerBoard';

type Answer = number | string[][] | PlateAnswer | HamLine | MultiSelectAnswer | TraceAnswer | TextAnswer | null;

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
  // open_answer has no right answer until the host types it in, so the test page just shows what was typed.
  const [typedAnswer, setTypedAnswer] = useState<string | null>(null);
  const resultRef = useRef<TestResult | null>(null);
  const partialCredit =
    question.type === 'podium_order' ||
    question.type === 'travel_map' ||
    question.type === 'money_vase' ||
    question.type === 'plate_assignment' ||
    question.type === 'ham_cut' ||
    question.type === 'multi_select' ||
    question.type === 'menu_order' ||
    question.type === 'trace_marks';
  const isPercent = question.type === 'ham_cut' || question.type === 'trace_marks';

  const seats =
    question.type === 'plate_assignment' ? [question.head, ...question.left, ...question.right] : [];

  const correctValue =
    question.type === 'multiple_choice'
      ? [question.correctIndex].flat()[0]
      : question.type === 'drag_count'
      ? question.correctCount
      : question.type === 'plate_assignment'
      ? seats.length * 2
      : question.type === 'ham_cut' || question.type === 'trace_marks'
      ? 100
      : question.type === 'multi_select'
      ? question.options.length
      : question.type === 'menu_order'
      ? question.menu.length
      : question.type === 'open_answer'
      ? 1
      : question.type === 'travel_map'
      ? totalPlacements(question.correctGroups)
      : question.type === 'money_vase'
      ? question.correctCents
      : totalPlacements(question.correctOrder);

  const [travelPeople] = useState(() =>
    question.type === 'travel_map' ? question.correctGroups.flat().sort() : [],
  );
  const [podiumGroups] = useState(() =>
    question.type === 'podium_order' ? question.correctOrder.map((group) => [...group].sort()) : [],
  );

  const finish = (answer: Answer) => {
    if (resultRef.current) return;
    if (answer && typeof answer === 'object' && 'text' in answer) setTypedAnswer(answer.text);
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
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && 'selected' in answer && question.type === 'menu_order') {
      value = countCorrectMenuPicks(answer.selected, question.menu, question.correctIndexes);
    } else if (answer && !Array.isArray(answer) && typeof answer === 'object' && question.type === 'plate_assignment') {
      value = countCorrectPlateMarks(
        answer as PlateAnswer,
        { correctPrimo: question.correctPrimo, correctSecondo: question.correctSecondo },
        seats,
      );
    } else {
      value = answer as number | null;
    }
    // money_vase keeps the guessed cents as `value` but scores by closeness.
    const closeness =
      question.type === 'money_vase'
        ? scoreEstimate(value ?? 0, question.correctCents)
        : question.type === 'drag_count' && value !== null
        ? scoreCount(value, question.correctCount, question.nearMisses) * 100
        : null;
    const correct =
      question.type === 'drag_count'
        ? value === correctValue
        : closeness !== null
        ? value !== null && closeness >= 98
        : question.type === 'ham_cut'
        ? (value ?? 0) >= 95
        : question.type === 'trace_marks'
        ? (value ?? 0) >= 80
        : question.type === 'multiple_choice'
        ? value !== null && isCorrectOption(question.correctIndex, value)
        : value === correctValue;
    // Mirrors the server: podium_order/plate_assignment/ham_cut get partial credit.
    const points =
      closeness !== null
        ? Math.round((question.points * closeness) / 100)
        : partialCredit
        ? Math.round((question.points * (value ?? 0)) / correctValue)
        : question.points;
    const next: TestResult = {
      value,
      elapsedMs,
      correct,
      pointsAwarded: (correct || partialCredit || closeness !== null) && points > 0 ? scoreForAnswer(points, question.timeLimitSec, elapsedMs) : 0,
    };
    resultRef.current = next;
    setResult(next);
    onResult(next);
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
        question.type === 'open_answer' ? (
          <div>
            <h2 className="title">“{typedAnswer || '…'}”</h2>
            <p className="subtitle">Open question: scored live when the host types the right answer.</p>
          </div>
        ) : question.type === 'money_vase' && result.value !== null ? (
          <div>
            <h2 className="title">{result.correct ? 'Perfetto! 🎉' : result.pointsAwarded > 0 ? 'Quasi! 👌' : 'Peccato! 😅'}</h2>
            <p className="subtitle">
              You bet {formatEuro(result.value)} · correct was {formatEuro(question.correctCents)} · +{result.pointsAwarded}{' '}
              points
            </p>
          </div>
        ) : (
          <ResultBanner result={result} correctValue={correctValue} partialCredit={partialCredit} isPercent={isPercent} />
        )
      ) : (
        <Countdown
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onExpire={question.type === 'multiple_choice' ? () => finish(null) : undefined}
          floating
        />
      )}

      {!result && question.type === 'open_answer' && (
        <OpenAnswerBoard startedAt={startedAt} timeLimitSec={question.timeLimitSec} onSubmit={(text) => finish({ text })} />
      )}

      {!result && question.type === 'menu_order' && (
        <MenuOrderBoard
          menu={question.menu}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(selected) => finish({ selected })}
        />
      )}

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

      {!result && question.type === 'podium_order' && (
        <PodiumOrder
          groups={podiumGroups}
          groupLabels={question.groupLabels}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={finish}
        />
      )}

      {!result && question.type === 'money_vase' && (
        <MoneyVaseBoard
          denominations={question.denominations}
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
          : result.pointsAwarded > 0
          ? `+${result.pointsAwarded} points · correct was ${correctValue}`
          : `No points · correct was ${correctValue}`}{' '}
        · answered in {seconds}s
      </p>
    </div>
  );
}

function optionClass(i: number, correctIndex: number | number[], result: TestResult | null) {
  const classes = ['shape-btn', `shape-${i}`];
  if (result) classes.push(isCorrectOption(correctIndex, i) ? 'correct' : 'dimmed');
  return classes.join(' ');
}
