import { MenuCourse } from './types';

// "You are Ruben, so gluten intolerant -- order a full meal." Each course has
// exactly one safe dish; the rest hide gluten: sciatt and pizzoccheri are
// buckwheat but still cut with wheat flour, fiori di zucca are battered,
// gnocchi and passatelli are bound with flour or breadcrumbs, saltimbocca is
// dredged in flour, cacciucco is served over bread, polpette have breadcrumbs,
// and every dolce but the flourless torta caprese is a flour cake or biscuit.
export const RUBEN_MENU: MenuCourse[] = [
  {
    course: 'Antipasti',
    dishes: [
      { name: 'Sciatt', description: 'Frittelle di grano saraceno ripiene di formaggio Casera' },
      { name: 'Vitello tonnato', description: 'Girello di vitello, salsa di tonno, capperi e acciughe' },
      { name: 'Fiori di zucca fritti', description: 'Ripieni di mozzarella e alici, in pastella' },
      { name: 'Crostini neri', description: 'Fegatini di pollo, capperi e Vin Santo' },
    ],
  },
  {
    course: 'Primi',
    dishes: [
      { name: 'Gnocchi al sugo di castrato', description: 'Gnocchi di patate con ragù di pecora' },
      { name: 'Pizzoccheri della Valtellina', description: 'Grano saraceno, verza, patate, burro e Bitto' },
      { name: 'Passatelli in brodo', description: 'Parmigiano, uova e noce moscata in brodo di cappone' },
      { name: 'Risotto al Sagrantino', description: 'Carnaroli mantecato al Sagrantino di Montefalco' },
    ],
  },
  {
    course: 'Secondi',
    dishes: [
      { name: 'Saltimbocca alla romana', description: 'Vitello, prosciutto crudo e salvia al vino bianco' },
      { name: 'Cacciucco alla livornese', description: 'Zuppa di pesce e crostacei al pomodoro e peperoncino' },
      { name: 'Porchetta di Costano', description: 'Maiale arrosto con finocchietto selvatico, aglio e rosmarino' },
      { name: 'Polpette al sugo', description: 'Manzo, Parmigiano e prezzemolo in salsa di pomodoro' },
    ],
  },
  {
    course: 'Dolci',
    dishes: [
      { name: 'Torcolo di San Costanzo', description: 'Ciambella perugina con canditi, uvetta e anice' },
      { name: 'Tiramisù', description: 'Mascarpone, caffè e cacao' },
      { name: 'Torta caprese', description: 'Mandorle, cioccolato fondente e burro' },
      { name: 'Cantucci e Vin Santo', description: 'Biscotti alle mandorle da inzuppare' },
    ],
  },
];

export const RUBEN_CORRECT_INDEXES = correctIndexes(['Vitello tonnato', 'Risotto al Sagrantino', 'Porchetta di Costano', 'Torta caprese']);

function correctIndexes(names: string[]): number[] {
  const all = RUBEN_MENU.flatMap((course) => course.dishes.map((dish) => dish.name));
  return names.map((name) => all.indexOf(name));
}
