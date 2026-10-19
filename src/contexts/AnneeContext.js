import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/annee_aca', nom: 'les années académiques' });

export const AnneeProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useAnnee = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { annees: data, setAnnees: setData, loading, erreur, fetchAnnees: recharger };
};
