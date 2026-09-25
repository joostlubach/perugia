import { useEffect, useState } from 'react';
import { api } from '../api';
import { QuestionInput } from '../types';
import { MuteToggle } from '../components/MuteToggle';
import { TestNavigator } from './test/TestNavigator';
import { TestQuestion, TestResult } from './test/TestQuestion';

export function TestPage() {
  const [questions, setQuestions] = useState<QuestionInput[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<number, TestResult>>({});

  useEffect(() => {
    api.getQuestions().then(setQuestions, (err) => setError((err as Error).message));
  }, []);

  const goTo = (next: number) => {
    if (!questions) return;
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLSelectElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!questions) {
    return <div className="page">Loading...</div>;
  }

  const totalScore = Object.values(results).reduce((sum, r) => sum + r.pointsAwarded, 0);

  return (
    <>
      <MuteToggle />
      <TestNavigator
        questions={questions}
        index={index}
        results={results}
        totalScore={totalScore}
        onGoTo={goTo}
        onRestart={() => goTo(index)}
      />
      <TestQuestion
        key={attempt}
        question={questions[index]}
        index={index}
        total={questions.length}
        onResult={(result) => setResults((prev) => ({ ...prev, [index]: result }))}
        onNext={index < questions.length - 1 ? () => goTo(index + 1) : undefined}
      />
    </>
  );
}
