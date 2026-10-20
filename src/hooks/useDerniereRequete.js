import { useCallback, useEffect, useRef } from 'react';

// Pour les pages qui rechargent selon un filtre (année, niveau, parcours…) :
// chaque nouvel appel annule le précédent, et tout est annulé quand la page se ferme.
// Une réponse dépassée ne peut donc jamais écraser l'affichage du dernier choix.
//
//   const nouvelleRequete = useDerniereRequete();
//   const signal = nouvelleRequete();
//   const res = await api.get(url, { signal });
//   …
//   catch (err) { if (estAnnulee(err)) return; … }
const useDerniereRequete = () => {
  const controle = useRef(null);

  useEffect(() => () => controle.current?.abort(), []);

  return useCallback(() => {
    controle.current?.abort();
    controle.current = new AbortController();
    return controle.current.signal;
  }, []);
};

export default useDerniereRequete;
