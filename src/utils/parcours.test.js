import { situationAnnee } from './parcours';

const p = (id, annee, niveau, statut) => ({
  id, statut, id_niveau: niveau, niveau: { niveau: `L${niveau}` }, annee_academique: { annee_aca: annee },
});

test('passant, redoublant, nouveau selon le statut et l\'année précédente', () => {
  const l1 = p(1, '2025-2026', 1, 'admis');
  const l2 = p(2, '2026-2027', 2, 'inscrit');
  expect(situationAnnee(l1, [l2, l1]).libelle).toBe('Passant');
  expect(situationAnnee(l2, [l2, l1]).libelle).toBe('Passant');

  const r1 = p(3, '2025-2026', 1, 'redoublant');
  const r2 = p(4, '2026-2027', 1, 'inscrit');
  expect(situationAnnee(r1, [r2, r1]).libelle).toBe('Redoublant');
  expect(situationAnnee(r2, [r2, r1]).libelle).toBe('Redoublant');

  expect(situationAnnee(p(5, '2026-2027', 1, 'inscrit'), []).libelle).toBe('Nouveau');
  expect(situationAnnee(p(6, '2025-2026', 3, 'diplome'), []).libelle).toBe('Diplômé');
  expect(situationAnnee(null)).toBeNull();
});
