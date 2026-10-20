// Calcul de la moyenne pendant la saisie, avant tout enregistrement.
// Même règle que le serveur (ReleveService) — le serveur reste la référence à l'enregistrement :
//   moyenne = Σ(note × coefficient) / Σ(coefficients des matières notées), arrondie à 2 décimales ;
//   une note de 0 compte, une matière sans note n'entre pas dans la moyenne ;
//   résultat seulement quand toutes les notes sont saisies : « Validé » si moyenne ≥ seuil, sinon « Rattrapage ».

export const SEUIL_VALIDATION = 10;

/** Valeur d'un champ de saisie : nombre entre 0 et 20, null si vide, NaN si invalide */
export const lireNote = (valeur) => {
  const texte = String(valeur ?? '').trim().replace(',', '.');
  if (texte === '') return null;
  const note = Number(texte);
  return Number.isFinite(note) && note >= 0 && note <= 20 ? note : NaN;
};

const arrondi2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

/** @param lignes [{ note: number|null, coefficient: number }] */
export const resultat = (lignes, seuil = SEUIL_VALIDATION) => {
  const notees = lignes.filter((l) => l.note !== null);
  const points = notees.reduce((s, l) => s + l.note * l.coefficient, 0);
  const coefficients = notees.reduce((s, l) => s + l.coefficient, 0);
  const moyenne = coefficients > 0 ? arrondi2(points / coefficients) : null;
  const complet = lignes.length > 0 && notees.length === lignes.length;
  return {
    moyenne,
    notes_saisies: notees.length,
    statut: complet ? (moyenne >= seuil ? 'Validé' : 'Rattrapage') : null,
  };
};

/**
 * Relevé recalculé avec les valeurs en cours de saisie (id_matiere → texte).
 * Une valeur invalide est ignorée dans le calcul et signalée dans `invalides`.
 */
export const releveEnDirect = (releve, saisie) => {
  const seuil = releve.seuil_validation ?? SEUIL_VALIDATION;
  const invalides = new Set();
  const toutes = [];

  const semestres = releve.semestres.map((s) => {
    const lignes = s.matieres.map((m) => {
      const note = lireNote(saisie[m.id]);
      if (Number.isNaN(note)) invalides.add(m.id);
      return { note: Number.isNaN(note) ? null : note, coefficient: Number(m.coefficient) || 0 };
    });
    toutes.push(...lignes);
    return resultat(lignes, seuil);
  });

  return {
    semestres,
    general: { ...resultat(toutes, seuil), matieres_total: toutes.length },
    invalides,
  };
};
