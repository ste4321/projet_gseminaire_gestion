import { useEffect } from 'react';
import { cleRequete, useDonneesEnseignant } from '../contexts/EspaceEnseignantContext';

const URL = '/enseignant/matieres';

// Matières attribuées à l'enseignant connecté pour une année, avec l'avancement des notes et des leçons.
// Sans année demandée, le serveur choisit l'année en cours (renvoyée dans `annee`).
// Gardées en mémoire d'une page à l'autre (EspaceEnseignantContext).
const useMesMatieres = (anneeDemandee) => {
  const { data, erreur, chargement, recharger, amorcer } = useDonneesEnseignant(
    URL,
    { annee: anneeDemandee || undefined },
    'Impossible de charger vos matières.'
  );

  // L'année en cours reçue sans la demander : déjà disponible quand une page la demande explicitement (?annee=)
  useEffect(() => {
    if (!anneeDemandee && data?.annee) amorcer(cleRequete(URL, { annee: data.annee }), data);
  }, [anneeDemandee, data, amorcer]);

  return {
    annees: data?.annees || [],
    annee: data?.annee ?? null,
    matieres: data?.matieres || [],
    chargement,
    erreur,
    recharger,
  };
};

export default useMesMatieres;
