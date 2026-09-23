export function Podium({ top }: { top: { id: string; name: string; score: number }[] }) {
  const [first, second, third] = top;
  return (
    <div className="podium">
      {second && (
        <div className="podium-place second">
          <div>🥈</div>
          <div>{second.name}</div>
          <div>{second.score}</div>
        </div>
      )}
      {first && (
        <div className="podium-place first">
          <div>👑</div>
          <div>{first.name}</div>
          <div>{first.score}</div>
        </div>
      )}
      {third && (
        <div className="podium-place third">
          <div>🥉</div>
          <div>{third.name}</div>
          <div>{third.score}</div>
        </div>
      )}
    </div>
  );
}
