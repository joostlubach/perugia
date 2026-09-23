// Every question's wording in one place, in quiz order. `host` is the long
// version shown on the big screen and read out; `player` is the short version
// on phones.
export const QUESTION_TEXTS = {
  lake: {
    title: 'The Lake',
    host: 'Which story is based on the area around the ice cold swimming lake?',
    player: 'Which story is based on the area around the ice cold swimming lake?',
  },
  assisi: {
    title: 'Assisi',
    host: 'Which saint(s) do we associate with the town of Assisi? Select all that apply.',
    player: 'Which saint(s) do we associate with the town of Assisi? Select all that apply.',
  },
  pedro: {
    title: 'Pedro',
    host: "How many times does the word \"Pedro\" appear in Raffaella Carra's song \"Pedro\"?",
    player: "How many times does the word \"Pedro\" appear in Raffaella Carra's song \"Pedro\"?",
  },
  poolParty: {
    title: 'Pool Party',
    host: 'How many liters of water did the pool lose after the first pool party?',
    player: 'How many liters of water did the pool lose after the first pool party?',
  },
  karting: {
    title: 'Karting',
    host: 'Who finished where in karting? Put both groups in the right order.',
    player: 'Who finished where in karting? Put both groups in the right order.',
  },
  house: {
    title: 'The house',
    host: 'What was the surname of the family that owned the house?',
    player: 'What was the surname of the family that owned the house?',
  },
  bowie: {
    title: "Bowie's scratches",
    host: "Everyone fell into the pool at the pool party. Everyone? No, one friend was able to resist any attempt. But he paid dearly. Draw as best as you can the marks on Bowie's side from the pool party",
    player: 'Draw the scratches as best as you can',
  },
  ham: {
    title: 'Ham cutting',
    host: 'Drag the two points to find the line that cuts the ham exactly in half.',
    player: 'Drag the two points to find the line that cuts the ham exactly in half.',
  },
  dinner: {
    title: 'Primo / Secondo',
    host: 'At the final dinner, who had a primo, who had a secondo, and who had both?',
    player: 'At the final dinner, who had a primo, who had a secondo, and who had both?',
  },
  ruben: {
    title: 'Cena da Ruben',
    host: "You're at an Italian restaurant and you want to have a nice meal. The problem: you are Ruben, and therefore gluten intolerant. Order an antipasto, a primo, a secondo and a dolce!",
    player: "You are Ruben, and you're gluten intolerant. Order an antipasto, a primo, a secondo and a dolce!",
  },
  festival: {
    title: 'Village festival',
    host: 'At the village festival, we arrived when the number was at 182. Which number did we have?',
    player: 'At the village festival, we arrived when the number was at 182. Which number did we have?',
  },
  pool: {
    title: 'The swimming pool',
    host: 'What was the reason the swimming pool was where it was?',
    player: 'What was the reason the swimming pool was where it was?',
  },
  travel: {
    title: 'On the way',
    host: 'Drag each person to how they _arrived_ to Perugia',
    player: 'Drag each person to how they _arrived_ to Perugia',
  },
  perusia: {
    title: 'Perusia',
    host: 'What people used to live in Perugia before Octavian burnt their terracotta asses?',
    player: 'What people used to live in Perugia before Octavian burnt their terracotta asses?',
  },
  ancestor: {
    title: 'Famous ancestor',
    host: 'What famous artist does the Di Serego family descend from?',
    player: 'What famous artist does the Di Serego family descend from?',
  },
  serverRoom: {
    title: 'Server room',
    host: 'What did Leonardo do to power his server room at home?',
    player: 'What did Leonardo do to power his server room at home?',
  },
  splitser: {
    title: 'Splitser',
    host: 'How much money did we spend in total, according to Splitser?',
    player: 'How much did we spend in total, according to Splitser?',
  },
};

export function texts(key: keyof typeof QUESTION_TEXTS) {
  const { title, host, player } = QUESTION_TEXTS[key];
  return { title, text: host, playerText: player };
}
