import { ilYA } from './dates';

const maintenant = new Date(2026, 9, 23, 15, 0); // 23 octobre 2026, 15 h

test('dates relatives', () => {
  expect(ilYA(new Date(2026, 9, 23, 14, 59, 40), maintenant)).toBe("à l'instant");
  expect(ilYA(new Date(2026, 9, 23, 14, 35), maintenant)).toBe('il y a 25 min');
  expect(ilYA(new Date(2026, 9, 23, 9, 0), maintenant)).toBe('il y a 6 h');
  expect(ilYA(new Date(2026, 9, 22, 23, 0), maintenant)).toBe('hier');
  expect(ilYA(new Date(2026, 9, 12, 10, 0), maintenant)).toMatch(/^12 oct/);
  expect(ilYA(new Date(2025, 9, 12, 10, 0), maintenant)).toMatch(/2025$/);
  expect(ilYA(null, maintenant)).toBe('');
});
