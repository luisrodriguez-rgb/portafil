/**
 * Cifras derivadas del calendario GraphQL (semanas -> días): totales, rachas y semanas.
 * Funciones puras: las tarjetas y las pruebas las usan con el mismo calendario que la serpiente.
 */

/** Días en orden cronológico: [{ date, count, level }] */
function daysOf(weeks) {
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const days = [];
  for (const week of weeks) {
    for (const d of week.contributionDays) {
      days.push({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 });
    }
  }
  return days.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Racha actual y más larga (en días seguidos con al menos una contribución).
 * Si hoy (el último día del calendario) aún no tiene contribuciones, la racha actual cuenta hasta ayer:
 * el día no ha terminado y no se ha roto.
 */
function streaks(days) {
  let longest = { length: 0, start: null, end: null };
  let run = 0;
  let runStart = null;
  for (const day of days) {
    if (day.count > 0) {
      if (run === 0) runStart = day.date;
      run++;
      if (run > longest.length) longest = { length: run, start: runStart, end: day.date };
    } else {
      run = 0;
    }
  }

  const last = days.length - 1;
  const todayPending = last >= 0 && days[last].count === 0;
  let i = todayPending ? last - 1 : last;
  const end = i >= 0 ? days[i].date : null;
  let length = 0;
  while (i >= 0 && days[i].count > 0) { length++; i--; }
  const current = { length, start: length ? days[i + 1].date : null, end: length ? end : null };

  return { current, longest, todayPending, today: last >= 0 ? days[last] : null };
}

/** Total de cada semana del calendario: [{ start, total }] */
function weeklyTotals(weeks) {
  return weeks.map(w => ({
    start: w.contributionDays.length ? w.contributionDays[0].date : null,
    total: w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0)
  }));
}

function yearSummary(days) {
  let total = 0;
  let active = 0;
  for (const d of days) {
    total += d.count;
    if (d.count > 0) active++;
  }
  return { total, active, days: days.length };
}

module.exports = { daysOf, streaks, weeklyTotals, yearSummary };
