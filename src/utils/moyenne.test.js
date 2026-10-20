import { lireNote, releveEnDirect, resultat } from './moyenne';

test('moyenne pondérée par les coefficients, arrondie à 2 décimales', () => {
  expect(resultat([{ note: 12, coefficient: 2 }, { note: 9, coefficient: 1 }]).moyenne).toBe(11);
  expect(resultat([{ note: 10, coefficient: 1 }, { note: 11, coefficient: 2 }]).moyenne).toBe(10.67);
});

test('un 0 compte, une matière sans note est ignorée', () => {
  expect(resultat([{ note: 0, coefficient: 1 }, { note: 20, coefficient: 1 }]).moyenne).toBe(10);
  expect(resultat([{ note: 14, coefficient: 1 }, { note: null, coefficient: 3 }]).moyenne).toBe(14);
  expect(resultat([{ note: null, coefficient: 1 }]).moyenne).toBeNull();
});

test('résultat seulement quand toutes les notes sont saisies', () => {
  expect(resultat([{ note: 15, coefficient: 1 }, { note: null, coefficient: 1 }]).statut).toBeNull();
  expect(resultat([{ note: 10, coefficient: 1 }]).statut).toBe('Validé');
  expect(resultat([{ note: 9.99, coefficient: 1 }]).statut).toBe('Rattrapage');
});

test('lecture des valeurs saisies', () => {
  expect(lireNote('')).toBeNull();
  expect(lireNote('12,5')).toBe(12.5);
  expect(lireNote('0')).toBe(0);
  expect(lireNote('21')).toBeNaN();
  expect(lireNote('-1')).toBeNaN();
});

test('relevé recalculé en direct, valeur invalide signalée', () => {
  const releve = {
    seuil_validation: 10,
    semestres: [
      { matieres: [{ id: 1, coefficient: 2 }, { id: 2, coefficient: 1 }] },
      { matieres: [{ id: 3, coefficient: 1 }] },
    ],
  };
  const direct = releveEnDirect(releve, { 1: '12', 2: '9', 3: '25' });

  expect(direct.semestres[0]).toEqual({ moyenne: 11, notes_saisies: 2, statut: 'Validé' });
  expect(direct.semestres[1].moyenne).toBeNull();
  expect(direct.general).toMatchObject({ moyenne: 11, notes_saisies: 2, matieres_total: 3, statut: null });
  expect([...direct.invalides]).toEqual([3]);
});
