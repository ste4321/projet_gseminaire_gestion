import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/semestres', nom: 'les semestres' });

export const SemestreProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useSemestre = () => {
  const { data, loading, erreur, recharger } = useRessource();
  return { semestres: data, loading, erreur, fetchSemestres: recharger };
};
