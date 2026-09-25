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
      <div className="hint">
        {t('host.questionHeader', {
          number: view.currentQuestionIndex + 1,
          total: view.totalQuestions,
          title: question.title,
        })}
      </div>
      <h1 className="question-text intro"><QuestionText text={question.text} /></h1>
      {imageUrl && <img className="question-image" src={imageUrl} alt="" />}
      <button className="btn btn-primary btn-lg" onClick={onStart}>
        {t('host.intro.start')}
      </button>
    </div>
  );
}
