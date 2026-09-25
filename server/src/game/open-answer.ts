// Whether a typed answer matches the correct one, forgiving what people
// get wrong when typing fast on a phone: case, accents, punctuation, filler
// words ("the", "some", "de"...), plurals, small typos, and extra words
// around the right one ("I think it's cinnamon" matches "cinnamon").
export function matchesOpenAnswer(guess: string, correct: string): boolean {
  const guessWords = normalize(guess);
  const correctWords = normalize(correct);
  if (guessWords.length === 0 || correctWords.length === 0) return false;

  const g = guessWords.join(' ');
  const c = correctWords.join(' ');
  if (similar(g, c) || similar(g.replace(/ /g, ''), c.replace(/ /g, ''))) return true;

  // Every word of the correct answer shows up (roughly) in the guess.
  return correctWords.every((word) => guessWords.some((guessWord) => similar(guessWord, word)));
}

// Indexes of the `correct` answers found among the guesses, each guess
// counting for at most one. Looser than matchesOpenAnswer: half the words of
// a right answer (two at least) is enough, so "Total eclipse" counts.
export function matchAnswers(guesses: string[], correct: string[]): number[] {
  const unused = [...guesses];
  const matched: number[] = [];
  correct.forEach((answer, i) => {
    const index = unused.findIndex((guess) => matchesLoosely(guess, answer));
    if (index < 0) return;
    unused.splice(index, 1);
    matched.push(i);
  });
  return matched;
}

// Share of the points (0-1) for the matched answers of a ranked list, spread
// over the boxes: the top answers (one per box) are worth a full box, the
// ones below slide down to half a box for the last.
export function scoreHitList(matched: number[], answerCount: number, boxes: number): number {
  const worth = (i: number) => (i < boxes ? 1 : 1 - (LAST_HIT_WORTH * (i - boxes + 1)) / (answerCount - boxes));
  return matched.reduce((sum, i) => sum + worth(i), 0) / boxes;
}

// Whether something was really answered: at least one word of two letters or digits.
// Phones hand in whatever was typed when time runs out, so "" or "." can come in.
export function isRealAnswer(text: string | undefined): boolean {
  return !!text && /[\p{L}\p{N}]{2,}/u.test(text);
}

const LAST_HIT_WORTH = 0.5;

function matchesLoosely(guess: string, correct: string): boolean {
  if (matchesOpenAnswer(guess, correct)) return true;
  const guessWords = normalize(guess);
  const correctWords = normalize(correct);
  const found = correctWords.filter((word) => guessWords.some((guessWord) => similar(guessWord, word))).length;
  return found >= Math.min(2, correctWords.length) && found >= correctWords.length / 2;
}

// 0.8 allows one typo in a 5-letter word, two in a 10-letter one, none below 5.
const MIN_SIMILARITY = 0.8;

const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'some', 'of', 'and', 'with', 'its', 'it', 'is', 'i', 'think',
  'de', 'het', 'een', 'van', 'en', 'met',
  'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'di', 'e',
]);

function normalize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word && !FILLER_WORDS.has(word))
    .map(singular);
}

function singular(word: string): string {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function similar(a: string, b: string): boolean {
  const longest = Math.max(a.length, b.length);
  return longest > 0 && 1 - levenshtein(a, b) / longest >= MIN_SIMILARITY;
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}
