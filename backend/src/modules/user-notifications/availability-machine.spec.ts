import {
  decideTransition,
  isSubscriberEligible,
  MachineState,
} from './availability-machine';

const t0 = new Date('2026-11-01T12:00:00Z');
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

/** Simula una secuencia de (minuto, disponibles) sobre 30 espacios y devuelve las notificaciones */
function run(seq: [number, number][], initial: MachineState | null = null) {
  let s = initial;
  const notified: number[] = [];
  for (const [min, available] of seq) {
    const { next, release } = decideTransition(s, available, 30, at(min));
    if (
      release &&
      isSubscriberEligible(release.lotEligible, s?.lastNotifiedAt ?? null, t0)
    ) {
      next.lastNotifiedAt = at(min);
      notified.push(min);
    }
    s = next;
  }
  return { notified, state: s };
}

describe('máquina de estados de ocupación', () => {
  it('estado inicial: no notifica', () => {
    expect(run([[0, 0]]).notified).toEqual([]);
    expect(run([[0, 5]]).notified).toEqual([]);
  });

  it('completo → primera liberación notifica una sola vez (estados 1–3)', () => {
    const r = run([
      [0, 3],
      [1, 0],
      [2, 1],
      [3, 5],
      [4, 2],
    ]);
    expect(r.notified).toEqual([2]);
  });

  it('vuelve a completarse y se libera antes de 10 min: no notifica y reinicia el cooldown (estados 4–5)', () => {
    const r = run([
      [0, 3],
      [1, 0],
      [2, 1],
      [3, 0],
      [8, 1],
      [9, 0],
      [18, 1],
    ]);
    expect(r.notified).toEqual([2]); // 3→8 = 5 min; 9→18 = 9 min
  });

  it('completo 10 minutos seguidos habilita otra notificación (estado 6)', () => {
    const r = run([
      [0, 3],
      [1, 0],
      [2, 1],
      [3, 0],
      [13, 1],
    ]);
    expect(r.notified).toEqual([2, 13]);
  });

  it('sin espacios activos no hay transición', () => {
    expect(decideTransition(null, 0, 0, t0).release).toBeNull();
  });

  it('una suscripción nueva no queda bloqueada por el cooldown anterior', () => {
    const lastLot = at(2);
    expect(isSubscriberEligible(false, lastLot, at(1))).toBe(false); // vieja: respeta cooldown
    expect(isSubscriberEligible(false, lastLot, at(5))).toBe(true); // creada después de la última notificación
  });
});
