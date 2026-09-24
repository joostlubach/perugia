import { HostGuess } from '../../types';
import { t } from '../../texts';

// How many got it right; with partial credit, also how many got close ("Cosi cosa" on the phones).
export function CorrectTally({ guesses, partialCredit }: { guesses: HostGuess[]; partialCredit: boolean }) {
  const count = guesses.filter((g) => g.correct).length;
  const close = guesses.filter((g) => !g.correct && g.pointsAwarded > 0).length;

  return (
    <p className="subtitle">
      {partialCredit
        ? t('host.reveal.spotOnCount', { count, close, total: guesses.length })
        : t('host.reveal.correctCount', { count, total: guesses.length })}
    </p>
  );
}
