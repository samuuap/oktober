// ============================================================
// Fechas del calendario
// ============================================================
//
// Todo se calcula en hora de Madrid, no en la del navegador: si no, el
// mismo día se abriría a horas distintas según dónde esté cada uno, y la
// promesa de "se desbloquea para todos a la vez" dejaría de cumplirse.
//
// Sigue siendo el reloj del cliente, así que quien lo atrase o adelante
// puede ver una película antes de tiempo. Para impedirlo de verdad haría
// falta comprobarlo también en base de datos.

export const TIMEZONE = 'Europe/Madrid'

const FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

// {year, month, day} en Madrid. month es 1-12.
export function todayInMadrid(now = new Date()) {
  const parts = Object.fromEntries(
    FORMATTER.formatToParts(now).map((p) => [p.type, p.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  }
}

// Último día del calendario que ya está a la vista de todo el mundo, sin
// necesidad de superar su prueba.
//
// La puerta de un día se abre sola el mismo día en que toca ver la película:
// por ejemplo, el 2 de octubre ya están destapados el 1 y el 2. Quien quiera
// ver los días posteriores antes de tiempo, puede superar su prueba.
export function autoRevealedThrough(calendarYear, now = new Date()) {
  const { year, month, day } = todayInMadrid(now)

  if (year < calendarYear) return 0
  if (year > calendarYear) return 31
  if (month < 10) return 0
  if (month > 10) return 31

  return Math.min(31, Math.max(0, day))
}

// El instante exacto que corresponde a una hora local de Madrid. Hace falta
// porque `new Date(a, m, d)` la construye en el huso del navegador: alguien
// en México vería la cuenta atrás desfasada respecto al desbloqueo.
const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
})

export function madridInstant(year, month, day, hour = 0, minute = 0, second = 0) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second)
  const p = Object.fromEntries(
    PARTS.formatToParts(new Date(guess)).map((x) => [x.type, x.value])
  )
  const reread = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess - (reread - guess))
}

// Hacia dónde mira la cuenta atrás:
//  - antes de octubre  → al arranque del calendario, el día 1
//  - durante octubre   → a la noche de Halloween
//  - después           → al octubre siguiente
export function countdownTarget(now = new Date()) {
  const { year, month } = todayInMadrid(now)

  if (month < 10) {
    return { date: madridInstant(year, 10, 1), kind: 'start', year }
  }

  if (month === 10) {
    const halloween = madridInstant(year, 10, 31, 23, 59, 59)
    if (now.getTime() <= halloween.getTime()) {
      return { date: halloween, kind: 'halloween', year }
    }
  }

  return { date: madridInstant(year + 1, 10, 1), kind: 'start', year: year + 1 }
}
