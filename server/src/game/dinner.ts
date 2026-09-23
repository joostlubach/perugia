// Seating at the final dinner table, top (head) to bottom on each side.
// Keys match avatar filenames in web/public/players/ where possible, so the
// seat can show that person's photo -- "milan" has no photo yet, the UI
// falls back to a plain initial for any key that doesn't resolve to one.
export const DINNER_HEAD = 'bas';
export const DINNER_LEFT = ['ruben', 'kyle', 'jasper', 'joost', 'ismail', 'dex'];
export const DINNER_RIGHT = ['bowie', 'sally', 'sanne', 'gokhan', 'milan', 'roland'];

// TODO: still unknown (per Vragen.txt) -- bowie, kyle, sally, ismail, milan,
// roland. Fill in once you know, they currently default to "had neither".
export const DINNER_CORRECT_PRIMO = ['bas', 'ruben', 'jasper', 'sanne', 'joost', 'gokhan', 'dex'];
export const DINNER_CORRECT_SECONDO = ['bas', 'jasper', 'sanne', 'joost', 'dex'];
