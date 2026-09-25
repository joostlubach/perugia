import { HostRoomView } from '../../types';
import { QuestionText } from '../../components/QuestionText';
import { t } from '../../texts';

// The question on its own while the host reads it out; phones say "look at the screen".
export function HostIntro({ view, onStart }: { view: HostRoomView; onStart: () => void }) {
  const question = view.question!;
  // The trace_marks photo is for drawing on, on the phones.
  const imageUrl = 'imageUrl' in question && question.type !== 'trace_marks' ? question.imageUrl : undefined;

  return (
    <div className="page">
      <div className="intro-header">
        {view.category && <div className="intro-category">{view.category.title}</div>}
        <div className="hint">
          {t('host.intro.header', { number: view.currentQuestionIndex + 1, total: view.totalQuestions })}
        </div>
      </div>
      <h1 className="title">{question.title}</h1>
      <h2 className="question-text intro"><QuestionText text={question.text} /></h2>
      {imageUrl && <img className="question-image" src={imageUrl} alt="" />}
      <button className="btn btn-primary btn-lg" onClick={onStart}>
        {t('host.intro.start')}
      </button>
    </div>
  );
}
