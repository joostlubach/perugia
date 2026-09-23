import { DistributiveOmit, Question } from './types';

export const sampleQuestions: DistributiveOmit<Question, 'id'>[] = [
  {
    // TODO: verify this count yourself before Friday -- automated lyric
    // counts came back inconsistent (32 vs 44) depending on how repeated
    // chorus lines get transcribed, so don't trust this number blindly.
    type: 'drag_count',
    text: "How many times does the word \"Pedro\" appear in Raffaella Carra's song \"Pedro\"?",
    dragLabel: 'Pedro',
    correctCount: 32,
    timeLimitSec: 45,
    points: 1500,
  },
];
