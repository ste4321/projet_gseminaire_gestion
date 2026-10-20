import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/niveaux', nom: 'les niveaux' });

export const NiveauProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useNiveau = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { niveaux: data, setNiveaux: setData, loading, erreur, fetchNiveaux: recharger };
};
