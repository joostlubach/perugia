import { HostAnswer, HostPlayerAnswer, HostQuestionView } from '../../types';
import { avatarSrc } from '../../avatar';
import { AnswerOption } from '../../components/AnswerOption';
import { HamCutView } from '../../components/HamCutView';
import { MenuCard } from '../../components/MenuCard';
import { formatEuro, Vase } from '../../components/MoneyVase';
import { PinMap } from '../../components/PinMap';
import { PodiumStand } from '../../components/PodiumStand';
import { PhotoStrip } from '../../components/PhotoStrip';
import { SketchMap } from '../../components/SketchMap';
import { TraceMarksView } from '../../components/TraceMarksView';
import { TravelMap } from '../../components/TravelMap';
import { isCorrectOption } from '../../scoring';
import { t } from '../../texts';

// One player's answer at the reveal, drawn the way they gave it.
export function PlayerAnswerView({ question, player }: { question: HostQuestionView; player: HostPlayerAnswer }) {
  const answer = player.answer;

  return (
    <>
      <div className={`featured-answer ${answer?.correct ? 'correct' : ''}`}>
        <img className="avatar-img" src={avatarSrc(player.avatar)} alt="" />
        <div>
          <div className="featured-answer-text">
            {answer ? t('host.reveal.answerOf', { name: player.name }) : t('host.reveal.noAnswerFrom', { name: player.name })}
          </div>
          {answer && <div className="hint">{t('host.reveal.pointsEarned', { points: answer.pointsAwarded })}</div>}
        </div>
      </div>
      {answer && <AnswerBody question={question} answer={answer} avatar={player.avatar} />}
    </>
  );
}

function AnswerBody({ question, answer, avatar }: { question: HostQuestionView; answer: HostAnswer; avatar: string }) {
  const { detail } = answer;

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <AnswerOption
              key={i}
              index={i}
              text={text}
              revealed
              picked={answer.value === i}
              isCorrect={question.correctIndex !== undefined && isCorrectOption(question.correctIndex, i)}
            />
          ))}
        </div>
      );
    case 'multi_select':
      return (
        <ol className="tally-list">
          {question.options.map((text, i) => {
            const ticked = !!answer.selection?.includes(i);
            const right = ticked === !!question.correctIndexes?.includes(i);
            return (
              <li key={i} className={right ? 'correct' : 'dimmed'}>
                <div className="tally-row">
                  <span>
                    {ticked ? '☑️' : '⬜'} {text}
                  </span>
                  <span>{right ? '✅' : '❌'}</span>
                </div>
              </li>
            );
          })}
        </ol>
      );
    case 'photo_floors':
      return (
        <PhotoStrip
          photoUrls={question.photoUrls}
          captions={question.photoUrls.map((_, i) => question.floors[answer.selection?.[i] ?? -1] ?? t('host.reveal.noAnswer'))}
          marks={question.photoUrls.map((_, i) =>
            answer.selection?.[i] === question.correctFloors?.[i] ? 'correct' : 'wrong',
          )}
        />
      );
    case 'menu_order':
      return <MenuCard menu={question.menu} selected={answer.selection} correctIndexes={question.correctIndexes} wide />;
    case 'open_answer':
    case 'multi_text':
      return (
        <div className="featured-answer small">
          <div className="featured-answer-text">“{answer.text || t('host.reveal.noAnswer')}”</div>
        </div>
      );
    case 'drag_count':
      return <BigNumber value={answer.value} correct={question.correctCount} />;
    case 'money_vase':
      return (
        <>
          <Vase total={answer.value} large />
          {question.correctCents !== undefined && (
            <p className="subtitle">{t('host.reveal.correctWas', { answer: formatEuro(question.correctCents) })}</p>
          )}
        </>
      );
    case 'map_pin':
      return (
        <>
          <PinMap
            mapUrl={question.mapUrl}
            aspectRatio={question.aspectRatio}
            pins={answer.point ? [{ key: 'player', avatar, ...answer.point }] : []}
            answer={question.answer}
            large
          />
          <p className="subtitle">{t('host.reveal.kmOff', { km: answer.value })}</p>
        </>
      );
    case 'travel_map':
      return (
        <TravelMap
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          landmarks={question.landmarks}
          stops={question.stops}
          groups={detail?.order ?? question.stops.map(() => [])}
          large
        />
      );
    case 'podium_order':
      return (
        <div className="podium-order">
          {question.groupLabels.map((label, g) => (
            <div key={g} className="podium-order-group">
              <div className="hint">{label}</div>
              <PodiumStand order={detail?.order?.[g] ?? []} groupIndex={g} />
            </div>
          ))}
        </div>
      );
    case 'situation_sketch':
      return (
        <SketchMap
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          zoom={question.zoom}
          pieces={question.pieces}
          placements={detail?.placements}
          large
          showLabels
        />
      );
    case 'ham_cut':
      return (
        <>
          <HamCutView imageUrl={question.imageUrl} line={detail?.line} />
          <p className="subtitle">{t('host.reveal.scorePercent', { score: answer.value })}</p>
        </>
      );
    case 'trace_marks':
      return (
        <>
          <div className="answer-side-by-side">
            <TraceMarksView imageUrl={question.imageUrl} aspectRatio={question.aspectRatio} strokes={detail?.strokes} />
            {question.revealImageUrl && (
              <TraceMarksView imageUrl={question.revealImageUrl} aspectRatio={question.aspectRatio} />
            )}
          </div>
          <p className="subtitle">{t('host.reveal.scorePercent', { score: answer.value })}</p>
        </>
      );
  }
}

function BigNumber({ value, correct }: { value: number; correct?: number }) {
  return (
    <>
      <div className="countdown" style={{ borderRadius: 16, width: 'auto', height: 'auto', padding: '12px 28px' }}>
        {value}
      </div>
      {correct !== undefined && <p className="subtitle">{t('host.reveal.correctWas', { answer: correct })}</p>}
    </>
  );
}
