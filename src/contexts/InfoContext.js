import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/infos', nom: 'les actualités' });

export const InfoProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js)
export const useInfo = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { infos: data, setInfos: setData, loading, erreur, fetchInfos: recharger };
};
