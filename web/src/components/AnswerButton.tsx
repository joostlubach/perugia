import { Shape } from './Shape';

export function AnswerButton({
  index,
  onClick,
  disabled,
}: {
  index: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`shape-btn shape-${index}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Answer ${index + 1}`}
    >
      <Shape index={index} />
    </button>
  );
}
