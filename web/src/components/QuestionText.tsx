// Renders question text, showing `_words_` in italics for emphasis.
export function QuestionText({ text }: { text: string }) {
  return <>{text.split(/_([^_]+)_/).map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part))}</>;
}
