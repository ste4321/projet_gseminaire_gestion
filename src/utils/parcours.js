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

/**
 * Situation d'un étudiant pour une année : passant, redoublant, nouveau, ou son départ.
 * `p` : l'inscription de l'année ; `parcours` : toutes ses inscriptions (pour l'année en cours,
 * on compare avec l'année précédente). null = rien à afficher.
 */
export const situationAnnee = (p, parcours = []) => {
  if (!p?.statut) return null;
  const niveau = p.niveau?.niveau || '';
  if (p.statut === 'admis') return { type: 'passant', libelle: 'Passant', aide: `Admis au niveau supérieur après ${niveau}` };
  if (p.statut === 'redoublant') return { type: 'redoublant', libelle: 'Redoublant', aide: `Redouble ${niveau} l'année suivante` };
  if (p.statut !== 'inscrit') return { type: 'sortie', libelle: libelleStatut(p.statut) };

  // Année en cours : redoublant s'il était déjà à ce niveau l'année d'avant
  const annee = p.annee_academique?.annee_aca || '';
  const avant = parcours
    .filter((x) => (x.annee_academique?.annee_aca || '') < annee)
    .sort((a, b) => b.annee_academique.annee_aca.localeCompare(a.annee_academique.annee_aca))[0];
  if (!avant) return { type: 'nouveau', libelle: 'Nouveau', aide: 'Première année au séminaire' };
  if (avant.id_niveau === p.id_niveau) return { type: 'redoublant', libelle: 'Redoublant', aide: `Redouble ${niveau}` };
  return { type: 'passant', libelle: 'Passant', aide: `Passé de ${avant.niveau?.niveau || '?'} à ${niveau}` };
};

/** « 1 mars 2026 » */
export const dateCourte = (iso) =>
  iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
