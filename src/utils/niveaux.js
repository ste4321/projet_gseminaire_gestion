// Niveaux enregistrés en base (table `niveaux`) : ordre d'affichage et libellé lisible.

const CYCLES = { L: 'Licence', M: 'Master', D: 'Doctorat' };

// Licence avant Master avant Doctorat, puis par numéro (L1, L2, L3, M1, M2…)
export const trierNiveaux = (liste = []) =>
  [...liste].sort((a, b) => String(a.niveau).localeCompare(String(b.niveau), 'fr', { numeric: true }));

// « L2 » → « Licence 2 » ; un libellé inconnu est affiché tel quel
export const libelleNiveau = (code) => {
  const m = /^([LMD])\s*(\d+)$/i.exec(String(code ?? '').trim());
  return m ? `${CYCLES[m[1].toUpperCase()]} ${m[2]}` : String(code ?? '');
};

// Options d'un <select> : la valeur envoyée au serveur est le code du niveau (validé par `exists:niveaux,niveau`)
export const optionsNiveaux = (liste = []) =>
  trierNiveaux(liste).map((n) => ({ value: n.niveau, label: `${n.niveau} — ${libelleNiveau(n.niveau)}` }));
