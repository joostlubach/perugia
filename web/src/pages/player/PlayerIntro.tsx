import { PlayerRoomView } from '../../types';

export function PlayerIntro({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <div className="hint">
        Question {view.currentQuestionIndex + 1} / {view.totalQuestions}
      </div>
      <h1 className="title">Look at the screen! 👀</h1>
      <p className="subtitle">You can answer once the question has been read out.</p>
    </div>
  );
}
