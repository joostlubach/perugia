import { MenuCourse } from './types';

// "You are Ruben, so gluten intolerant -- what do you order?" Every dish
// contains gluten except one, and the traps are deliberate: sciatt and
// pizzoccheri are buckwheat-based but still made with wheat flour,
// saltimbocca is dredged in flour, cacciucco is served over bread. Only the
// torta caprese (almonds and chocolate, no flour at all) is safe.
export const RUBEN_MENU: MenuCourse[] = [
  {
    course: 'Aperitivo',
    dishes: [
      { name: 'Sciatt', description: 'Frittelle di grano saraceno ripiene di formaggio Casera' },
      { name: 'Crostini neri', description: 'Fegatini di pollo, capperi e Vin Santo' },
    ],
  },
  {
    course: 'Primi',
    dishes: [
      { name: 'Strangozzi al tartufo', description: 'Tartufo nero di Norcia e olio extravergine umbro' },
      { name: 'Pizzoccheri della Valtellina', description: 'Grano saraceno, verza, patate, burro e Bitto' },
      { name: 'Passatelli in brodo', description: 'Parmigiano, uova e noce moscata in brodo di cappone' },
    ],
  },
  {
    course: 'Secondi',
    dishes: [
      { name: 'Saltimbocca alla romana', description: 'Vitello, prosciutto crudo e salvia al vino bianco' },
      { name: 'Cacciucco alla livornese', description: 'Zuppa di pesce e crostacei al pomodoro e peperoncino' },
    ],
  },
  {
    course: 'Dolci',
    dishes: [
      { name: 'Torcolo di San Costanzo', description: 'Ciambella perugina con canditi, uvetta e anice' },
      { name: 'Torta caprese', description: 'Mandorle, cioccolato fondente e burro' },
      { name: 'Cantucci e Vin Santo', description: 'Biscotti alle mandorle da inzuppare' },
    ],
  },
];

export const RUBEN_OPTIONS = RUBEN_MENU.flatMap((course) => course.dishes.map((dish) => dish.name));
export const RUBEN_CORRECT_INDEX = RUBEN_OPTIONS.indexOf('Torta caprese');
