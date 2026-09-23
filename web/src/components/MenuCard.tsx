import { MenuCourse } from '../types';

// A multiple_choice question drawn as a restaurant menu. Dish indexes run
// across all courses in order, matching the question's `options`. Pass
// `onPick` to make dishes tappable (player), `counts` to show how many picked
// each dish (host), and `correctIndex` once revealed.
export function MenuCard({
  menu,
  onPick,
  counts,
  correctIndex,
  wide,
}: {
  menu: MenuCourse[];
  onPick?: (index: number) => void;
  counts?: number[];
  correctIndex?: number;
  wide?: boolean;
}) {
  const revealed = correctIndex !== undefined;
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
              const isCorrect = revealed && i === correctIndex;
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
