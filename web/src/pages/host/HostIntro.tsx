import { HostRoomView } from '../../types';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { QuestionText } from '../../components/QuestionText';

// The question on its own while the host reads it out; phones say "look at the screen".
export function HostIntro({ view, onStart }: { view: HostRoomView; onStart: () => void }) {
  const question = view.question!;
  const imageUrl = 'imageUrl' in question ? question.imageUrl : undefined;

  return (
    <div className="page">
      <div className="hint">
        Question {view.currentQuestionIndex + 1} / {view.totalQuestions} · {question.title}
      </div>
      <h1 className="question-text intro"><QuestionText text={question.text} /></h1>
      {imageUrl && <img className="question-image" src={imageUrl} alt="" />}
      {question.type === 'travel_map' && (
        <TravelMap
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          landmarks={question.landmarks}
          stops={question.stops}
          large
        />
      )}
      {question.type === 'menu_order' && <MenuCard menu={question.menu} wide />}
      <button className="btn btn-primary btn-lg" onClick={onStart}>
        ▶️ Andiamo!
      </button>
    </div>
  );
}
