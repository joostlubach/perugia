import { MenuCourse } from '../types';

// A menu_order question drawn as a restaurant menu. Dish indexes run across
// all courses in order. Pass `onPick` to make dishes tappable and `selected`
// to highlight the order (player), `counts` to show how many ordered each dish
// (host), and `correctIndexes` once revealed.
export function MenuCard({
  menu,
  onPick,
  selected,
  counts,
  correctIndexes,
  wide,
}: {
  menu: MenuCourse[];
  onPick?: (index: number) => void;
  selected?: number[];
  counts?: number[];
  correctIndexes?: number[];
  wide?: boolean;
}) {
  const revealed = correctIndexes !== undefined;
  let index = 0;

  return (
    <div className={`menu-card ${wide ? 'wide' : ''}`}>
      <div className="menu-header">
        <div className="menu-kicker">~ Perugia ~</div>
        <div className="menu-name">Osteria del Grifo</div>
        <div className="menu-kicker">Menù del giorno</div>
      </div>

      <div className="menu-courses">
        {menu.map((course) => (
          <section key={course.course} className="menu-course">
            <h3 className="menu-course-title">{course.course}</h3>
            {course.dishes.map((dish) => {
              const i = index++;
              const isCorrect = revealed && correctIndexes.includes(i);
              const classes = ['menu-dish'];
              if (onPick) classes.push('pickable');
              if (revealed) classes.push(isCorrect ? 'correct' : 'gluten');
              const content = (
                <>
                  <span className="menu-dish-name">
                    {dish.name}
                    {revealed && <span className="menu-dish-tag">{isCorrect ? 'senza glutine ✓' : '🌾'}</span>}
                  </span>
                  {dish.description && <span className="menu-dish-description">{dish.description}</span>}
                  {counts && <span className="menu-dish-count">{counts[i] ?? 0}</span>}
                  {selected?.includes(i) && <PenCircle />}
                </>
              );
              return onPick ? (
                <button key={i} className={classes.join(' ')} onClick={() => onPick(i)}>
                  {content}
                </button>
              ) : (
                <div key={i} className={classes.join(' ')}>
                  {content}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

// A hand-drawn loop around the dish, overshooting where it closes like a real pen stroke.
function PenCircle() {
  return (
    <svg className="menu-dish-circle" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <path
        d="M 10 24 C 4 10, 38 3, 62 4 C 86 5, 98 13, 95 23 C 92 34, 62 38, 42 37 C 17 36, 2 29, 6 18 C 9 11, 22 6, 36 5"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
