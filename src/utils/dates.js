// Dates relatives des listes (annonces, cloche de l'en-tête).

const JOUR = 24 * 60 * 60 * 1000;
const debutDuJour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « 12 oct. », « 12 oct. 2025 » */
export const ilYA = (iso, maintenant = new Date()) => {
  if (!iso) return '';
  const date = new Date(iso);
  const minutes = Math.round((maintenant - date) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const jours = Math.round((debutDuJour(maintenant) - debutDuJour(date)) / JOUR);
  if (jours === 0) return `il y a ${Math.round(minutes / 60)} h`;
  if (jours === 1) return 'hier';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== maintenant.getFullYear() && { year: 'numeric' }),
  });
};
