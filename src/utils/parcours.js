// Statut d'une inscription (etudiant_parcours.statut) : l'issue de l'année, et les départs.
// Mêmes valeurs que le serveur (EtudiantParcours::STATUTS).

export const STATUTS = {
  inscrit: 'Inscrit',
  admis: 'Admis au niveau supérieur',
  redoublant: 'Redoublant',
  diplome: 'Diplômé',
  abandon: 'Abandon',
  transfere: 'Transféré',
  exclu: 'Exclu',
};

/** Départs déclarables : diplômé (compte gardé actif) ou départ (compte désactivé) */
export const SORTIES = [
  { valeur: 'diplome', libelle: 'Diplômé', aide: 'Cycle terminé : il garde l\'accès à ses bulletins.' },
  { valeur: 'abandon', libelle: 'Abandon', aide: 'Son compte sera désactivé.' },
  { valeur: 'transfere', libelle: 'Transféré', aide: 'Parti dans un autre établissement : son compte sera désactivé.' },
  { valeur: 'exclu', libelle: 'Exclu', aide: 'Son compte sera désactivé.' },
];

export const libelleStatut = (statut) => STATUTS[statut] || statut || '';

/** « 1 mars 2026 » */
export const dateCourte = (iso) =>
  iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
