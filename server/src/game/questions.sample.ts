import { DistributiveOmit, Question } from './types';
import { texts } from './question-texts';
import { KARTING_WINNER_GROUP, KARTING_LOSER_GROUP } from './karting';
import { DINNER_HEAD, DINNER_LEFT, DINNER_RIGHT, DINNER_CORRECT_PRIMO, DINNER_CORRECT_SECONDO } from './dinner';
import { HAM_ROWS } from './ham';
import { BOWIE_MARKS, BOWIE_ASPECT_RATIO } from './bowie';
import { RUBEN_MENU, RUBEN_CORRECT_INDEXES } from './ruben';
import { TRAVEL_MAP_URL, TRAVEL_MAP_ASPECT_RATIO, TRAVEL_LANDMARKS, TRAVEL_STOPS, TRAVEL_CORRECT_GROUPS } from './travel';

// Kept in the same order as Vragen.txt so the running order matches what's
// planned there.
export const sampleQuestions: DistributiveOmit<Question, 'id'>[] = [
  {
    type: 'multiple_choice',
    ...texts('lake'),
    options: ['Pinocchio', 'Narnia', 'Alice in Wonderland', 'The Wizard of Oz'],
    correctIndex: 1,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'multi_select',
    ...texts('assisi'),
    options: [
      'St. Francis',
      'St. Anthony',
      'St. Carlo',
      'St. Clare',
      'St. Catherine',
      'St. Nicholas',
      'St. Peter',
    ],
    correctIndexes: [0, 2, 3],
    timeLimitSec: 30,
    points: 1500,
  },
  {
    type: 'drag_count',
    ...texts('pedro'),
    dragLabel: 'Pedro',
    correctCount: 48,
    // 40-56 earns half, 32-64 a quarter.
    nearMisses: [
      { maxOff: 8, share: 0.5 },
      { maxOff: 16, share: 0.25 },
    ],
    timeLimitSec: 45,
    points: 1500,
  },
  {
    type: 'multiple_choice',
    ...texts('poolParty'),
    options: ['30 liters', '300 liters', '3000 liters', '30.000 liters'],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'podium_order',
    ...texts('karting'),
    correctOrder: [KARTING_WINNER_GROUP, KARTING_LOSER_GROUP],
    groupLabels: ['Winner group', 'Loser group'],
    timeLimitSec: 90,
    points: 2000,
  },
  {
    type: 'multiple_choice',
    ...texts('house'),
    options: ['Degli Oddi Baglioni', 'Buonaccorsi di Montefalco', 'Di Serego Alighieri', 'Della Rovere Portinari'],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'trace_marks',
    ...texts('bowie'),
    imageUrl: '/images/bowie-nomarks.jpeg',
    revealImageUrl: '/images/bowie-marks.jpg',
    aspectRatio: BOWIE_ASPECT_RATIO,
    marks: BOWIE_MARKS,
    timeLimitSec: 60,
    points: 1500,
  },
  {
    type: 'ham_cut',
    ...texts('ham'),
    imageUrl: '/images/ham.jpg',
    rows: HAM_ROWS,
    timeLimitSec: 45,
    points: 1500,
  },
  {
    type: 'plate_assignment',
    ...texts('dinner'),
    head: DINNER_HEAD,
    left: DINNER_LEFT,
    right: DINNER_RIGHT,
    correctPrimo: DINNER_CORRECT_PRIMO,
    correctSecondo: DINNER_CORRECT_SECONDO,
    timeLimitSec: 90,
    points: 2000,
  },
  {
    type: 'menu_order',
    ...texts('ruben'),
    menu: RUBEN_MENU,
    correctIndexes: RUBEN_CORRECT_INDEXES,
    timeLimitSec: 60,
    points: 1000,
  },
  {
    type: 'multiple_choice',
    ...texts('festival'),
    imageUrl: '/images/festival.jpg',
    options: ['190', '256', '360', '472'],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'open_answer',
    ...texts('kyle'),
    // Whatever Kyle types is the right answer.
    answerFrom: 'kyle',
    showAnswersOf: ['ruben'],
    timeLimitSec: 45,
    points: 1500,
  },
  {
    type: 'multiple_choice',
    ...texts('pool'),
    options: [
      'Easy jumping off the wall',
      "Out of the way for Pietro's wife, so it wouldn't get too noisy",
      'It was a septic tank',
      'Who knowah? Is Italia, we puttah the swimming pool where we wantah!',
    ],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'travel_map',
    ...texts('travel'),
    mapUrl: TRAVEL_MAP_URL,
    aspectRatio: TRAVEL_MAP_ASPECT_RATIO,
    landmarks: TRAVEL_LANDMARKS,
    stops: TRAVEL_STOPS,
    correctGroups: TRAVEL_CORRECT_GROUPS,
    timeLimitSec: 120,
    points: 2000,
  },
  {
    type: 'multiple_choice',
    ...texts('perusia'),
    options: ['Peruvians', 'Umbrians', 'Etruscans', 'Sabines'],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'multiple_choice',
    ...texts('ancestor'),
    options: ['Leonardo da Vinci', 'Dante', 'Michelangelo', 'Giotto'],
    correctIndex: 1,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'multiple_choice',
    ...texts('serverRoom'),
    options: [
      'He tapped off a street lantern near his house',
      "He hacked his way into the electricity company so they wouldn't charge for his usage",
      'He stole batteries from city share scooters',
      "He ran an extension cord through the wall into his neighbour's apartment",
    ],
    correctIndex: 2,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    type: 'money_vase',
    ...texts('splitser'),
    // €1000 (not a real bill, but it speeds things up), €500 and €200 bills, and every euro coin.
    denominations: [100000, 50000, 20000, 200, 100, 50, 20, 10, 5, 2, 1],
    correctCents: 881903,
    timeLimitSec: 60,
    points: 1500,
  },
];
