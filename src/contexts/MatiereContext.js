import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/matieres', nom: 'les matières' });

export const MatiereProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useMatiere = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { matieres: data, setMatieres: setData, loading, erreur, fetchMatieres: recharger };
};
