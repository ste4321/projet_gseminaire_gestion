import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage, estAnnulee } from '../api/client';

// Catalogue des matières vu depuis une année académique : chaque matière indique si elle est
// au programme de cette année (au_programme), avec le coefficient et les heures de l'année,
// les notes déjà saisies (notes_annee, notes_total) et les années où elle a été enseignée (historique).
//
// Mémoire par année : revenir sur la page ou sur une année déjà vue l'affiche immédiatement,
// puis la liste est rafraîchie en arrière-plan.
const memoire = new Map();

const useMatieresAnnee = (annee) => {
  const cle = annee ? JSON.stringify([localStorage.getItem('token'), String(annee)]) : null;
  const [resultat, setResultat] = useState(() => (cle && memoire.has(cle) ? { cle, data: memoire.get(cle) } : null));
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!cle) return undefined;
    const controle = new AbortController(); // changement d'année rapide : seule la dernière réponse compte
    setErreur(null);
    api
      .get('/matieres', { params: { annee }, signal: controle.signal })
      .then((res) => {
        memoire.set(cle, res.data);
        setResultat({ cle, data: res.data });
      })
      .catch((err) => {
        if (!estAnnulee(err)) setErreur(errorMessage(err, 'Impossible de charger les matières.'));
      });
    return () => controle.abort();
    // `cle` regroupe le jeton et l'année
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, version]);

  // Année déjà vue : affichée dès ce rendu. Sinon, rien (squelette) plutôt que la liste d'une autre année
  const data = (cle && memoire.get(cle)) || (resultat?.cle === cle ? resultat.data : null);

  // Après un ajout, une modification ou un retrait : un nom ou un code changé vaut pour toutes les années
  const recharger = useCallback(() => {
    memoire.clear();
    setVersion((v) => v + 1);
  }, []);

  return { matieres: data || [], chargement: !data && !erreur, erreur, recharger };
};

export default useMatieresAnnee;
