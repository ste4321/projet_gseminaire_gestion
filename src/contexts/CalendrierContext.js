import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/calendriers', nom: 'les calendriers' });

export const CalendrierProvider = Provider;

// Calendriers académiques (un par année, avec leurs événements), chargés à la première utilisation
export const useCalendrier = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();
  return { calendriers: data, setCalendriers: setData, loading, erreur, fetchCalendriers: recharger };
};
