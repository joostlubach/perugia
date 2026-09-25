import { HostGuess, RulingPick } from '../../types';
import { avatarName, avatarSrc } from '../../avatar';
import { isRealAnswer } from '../../openAnswer';
import { t } from '../../texts';

// The reveal of an open question with a rival: first the answer key player's
// answer, then (on advancing) the rival's, then the host picks whose answer
// counts -- or that nobody scores -- and the tally shows.
export function RivalAnswerReveal({
  guesses,
  answerFrom,
  rivalAnswerFrom,
  correctAnswer,
  rivalRevealed,
  onRevealRival,
  onRule,
}: {
  guesses: HostGuess[];
  answerFrom: string;
  rivalAnswerFrom: string;
  correctAnswer?: string | null;
  rivalRevealed: boolean;
  onRevealRival: () => void;
  onRule: (pick: RulingPick) => void;
}) {
  const keeper = guesses.find((g) => g.avatar === answerFrom);
  const rival = guesses.find((g) => g.avatar === rivalAnswerFrom);
  const names = { keeper: avatarName(answerFrom), rival: avatarName(rivalAnswerFrom) };
  const ruled = correctAnswer !== undefined;
  const keeperAnswered = isRealAnswer(keeper?.text);
  const rivalAnswered = isRealAnswer(rival?.text);
  const isRight = (guess?: HostGuess) => ruled && isRealAnswer(guess?.text) && guess!.text === correctAnswer;
  const others = guesses.filter((g) => g !== keeper && g !== rival);
  const correctCount = others.filter((g) => g.correct).length;

  return (
    <div className="open-answer-summary">
      <div className={`featured-answer ${isRight(keeper) ? 'correct' : ''}`}>
        <img className="avatar-img" src={avatarSrc(answerFrom)} alt="" />
        <div>
          {keeperAnswered ? (
            <>
              <div className="hint">{t('host.reveal.featuredAnswer', { name: names.keeper })}</div>
              <div className="featured-answer-text">“{keeper!.text}”</div>
            </>
          ) : (
            <>
              <div className="featured-answer-text">{t('host.reveal.refusedToAnswer', { name: names.keeper })}</div>
              {keeper && keeper.pointsAwarded < 0 && (
                <div className="hint">{t('host.reveal.penalty', { name: names.keeper, points: keeper.pointsAwarded })}</div>
              )}
            </>
          )}
        </div>
      </div>

      {rivalRevealed ? (
        <div className={`featured-answer ${isRight(rival) ? 'correct' : ''}`}>
          <img className="avatar-img" src={avatarSrc(rivalAnswerFrom)} alt="" />
          <div>
            <div className="hint">{t('host.reveal.rivalAnswered', names)}</div>
            <div className="featured-answer-text">
              {rivalAnswered ? `“${rival!.text}”` : t('host.reveal.noAnswer')}
            </div>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-lg" onClick={onRevealRival}>
          {t('host.reveal.revealRival', names)}
        </button>
      )}

      {rivalRevealed && !ruled && (
        <>
          <p className="subtitle">{t('host.reveal.whichCounts')}</p>
          <div className="btn-row">
            {keeperAnswered && (
              <button className="btn btn-gold btn-lg" onClick={() => onRule('answerFrom')}>
                {t('host.reveal.pickAnswer', { name: names.keeper })}
              </button>
            )}
            {rivalAnswered && (
              <button className="btn btn-gold btn-lg" onClick={() => onRule('rival')}>
                {t('host.reveal.pickAnswer', { name: names.rival })}
              </button>
            )}
            <button className="btn btn-accent btn-lg" onClick={() => onRule('nobody')}>
              {t('host.reveal.pickNobody')}
            </button>
          </div>
        </>
      )}

      {ruled && (
        <p className="subtitle">
          {correctAnswer === null
            ? t('host.reveal.nobodyScores')
            : t('host.reveal.correctCount', { count: correctCount, total: others.length })}
        </p>
      )}
    </div>
  );
}
