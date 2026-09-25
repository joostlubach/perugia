const GLYPHS = ['♪', '♫', '♩', '♬'];
const COUNT = 18;

// Fixed so every render floats the notes the same way instead of reshuffling.
const NOTES = Array.from({ length: COUNT }, (_, i) => {
  const r = (n: number) => ((Math.sin((i + 1) * n) + 1) / 2) % 1;
  return {
    glyph: GLYPHS[i % GLYPHS.length],
    left: (i / COUNT) * 100 + r(12.9) * (100 / COUNT),
    size: 2 + r(78.2) * 3,
    duration: 14 + r(37.7) * 12,
    delay: -r(4.1) * 26,
    drift: (r(93.3) - 0.5) * 120,
  };
});

// Notes drifting up behind the whole screen, for the music round.
export function MusicNotes() {
  return (
    <div className="music-notes" aria-hidden>
      {NOTES.map((note, i) => (
        <span
          key={i}
          style={
            {
              left: `${note.left}%`,
              fontSize: `${note.size}rem`,
              animationDuration: `${note.duration}s`,
              animationDelay: `${note.delay}s`,
              '--drift': `${note.drift}px`,
            } as React.CSSProperties
          }
        >
          {note.glyph}
        </span>
      ))}
    </div>
  );
}
