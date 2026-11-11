import { creerRessource } from '../api/ressource';

// Annonces les plus récentes, partagées par la cloche (non lues), les accueils (dernières annonces)
// et la page Annonces (ouverture depuis une notification, mises à jour en direct).
// La page Annonces, elle, demande ses pages au serveur (voir AnnonceAdminProf) : l'historique complet
// ne transite jamais d'un coup.
export const NB_ANNONCES_RECENTES = 30;

const { Provider, useRessource } = creerRessource({
  url: '/annonces',
  nom: 'les annonces',
  params: { recentes: NB_ANNONCES_RECENTES },
});

export const AnnonceProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useAnnonce = () => {
  const { data, loading, erreur, recharger } = useRessource();
  return { annonces: data, loading, erreur, fetchAnnonces: recharger };
};
