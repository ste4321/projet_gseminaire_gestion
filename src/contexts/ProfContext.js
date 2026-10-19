import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/enseignants', nom: 'les enseignants' });

export const ProfProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useProf = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { profs: data, setProfs: setData, loading, erreur, fetchProfs: recharger };
};
