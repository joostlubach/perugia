import { HostGuess } from '../../types';
import { avatarSrc } from '../../avatar';
import { t } from '../../texts';

// The reveal of an open question: the right answer -- as typed by the answer
// key player, if there is one -- the answers of a few named players, and how
// many got it. Everyone else's answer stays private.
export function OpenAnswerSummary({
  guesses,
  correctAnswer,
  answerFrom,
  showAnswersOf,
}: {
  guesses: HostGuess[];
  correctAnswer: string;
  answerFrom?: string;
  showAnswersOf: string[];
}) {
  const keeper = answerFrom ? guesses.find((g) => g.avatar === answerFrom) : undefined;
  const others = guesses.filter((g) => g !== keeper);
  const shown = others.filter((g) => showAnswersOf.includes(g.avatar));
  const correctCount = others.filter((g) => g.correct).length;

  return (
    <div className="open-answer-summary">
      <div className="featured-answer correct">
        {keeper && <img className="avatar-img" src={avatarSrc(keeper.avatar)} alt="" />}
        <div>
          {keeper && <div className="hint">{t('host.reveal.featuredAnswer', { name: keeper.name })}</div>}
          <div className="featured-answer-text">“{correctAnswer}”</div>
        </div>
      </div>
      {shown.map((g) => (
        <div key={g.playerId} className={`featured-answer small ${g.correct ? 'correct' : ''}`}>
          <img className="avatar-img" src={avatarSrc(g.avatar)} alt="" />
          <div>
            <div className="hint">{t('host.reveal.playerAnswer', { name: g.name, keeper: keeper?.name ?? '' })}</div>
            <div className="featured-answer-text">
              {g.correct ? '✅' : '❌'} “{g.text || t('host.reveal.noAnswer')}”
            </div>
          </div>
        </div>
      ))}
      <p className="subtitle">{t('host.reveal.correctCount', { count: correctCount, total: others.length })}</p>
    </div>
  );
}
