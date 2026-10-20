import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/annonces', nom: 'les annonces' });

export const AnnonceProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useAnnonce = () => {
  const { data, loading, erreur, recharger } = useRessource();
  return { annonces: data, loading, erreur, fetchAnnonces: recharger };
};
