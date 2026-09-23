// A pause after the last question, before the final results are revealed.
export function HostFinale({ onNext }: { onNext: () => void }) {
  return (
    <div className="page">
      <h1 className="title">Finito! 🏁</h1>
      <p className="subtitle">That was the last question. Who takes home the gold?</p>
      <button className="btn btn-gold btn-lg" onClick={onNext}>
        🏆 Show the results
      </button>
    </div>
  );
}
