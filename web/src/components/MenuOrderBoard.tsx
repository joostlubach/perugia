import { useRef, useState } from 'react';
import { MenuCourse } from '../types';
import { Countdown } from './Countdown';
import { MenuCard } from './MenuCard';

// Player orders one dish per course; tapping another dish in the same course
// swaps it. The order is placed once every course has a dish, or when time runs out.
export function MenuOrderBoard({
  menu,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  menu: MenuCourse[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (selected: number[]) => void;
}) {
  const [picks, setPicks] = useState<(number | null)[]>(() => menu.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const picksRef = useRef(picks);
  const submittedRef = useRef(false);
  picksRef.current = picks;

  const courseOfDish = menu.flatMap((course, c) => course.dishes.map(() => c));

  const pick = (dish: number) => {
    if (submittedRef.current) return;
    setPicks((prev) => prev.map((p, c) => (c === courseOfDish[dish] ? dish : p)));
  };

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(picksRef.current.filter((p): p is number => p !== null));
  };

  const complete = picks.every((p) => p !== null);

  return (
    <>
      {startedAt && !submitted && <Countdown startedAt={startedAt} timeLimitSec={timeLimitSec} onExpire={submit} />}
      <MenuCard menu={menu} onPick={pick} selected={picks.filter((p): p is number => p !== null)} />
      {!submitted && (
        <button className="btn btn-primary btn-lg" disabled={!complete} onClick={submit}>
          🍽️ Place order
        </button>
      )}
    </>
  );
}
