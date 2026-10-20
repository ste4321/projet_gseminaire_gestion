import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';

// Une page d'inscriptions (étudiant + niveau + année) filtrée et paginée par le serveur :
// seules les lignes affichées transitent, quel que soit le nombre total d'étudiants.
//
// Mémoire par combinaison de filtres : revenir sur une page ou un niveau déjà vu l'affiche
// immédiatement, puis la page est rafraîchie en arrière-plan.
const memoire = new Map();
const TAILLE_MEMOIRE = 60;
const memoriser = (cle, valeur) => {
  memoire.delete(cle);
  memoire.set(cle, valeur);
  if (memoire.size > TAILLE_MEMOIRE) memoire.delete(memoire.keys().next().value);
};

const DELAI_RECHERCHE = 300; // ms sans frappe avant d'interroger le serveur

const useDiffere = (valeur, delai) => {
  const [differee, setDifferee] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setDifferee(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return differee;
};

/**
 * @param annee     id de l'année académique (rien n'est chargé tant qu'elle est vide)
 * @param niveau    libellé du niveau, ex. « L1 »
 * @param recherche texte libre (nom, matricule, email, diocèse, téléphone)
 * @param page      numéro de page, à partir de 0
 */
const useParcoursPagines = ({ annee, niveau, recherche = '', page = 0, parPage = 10 }) => {
  const terme = useDiffere(recherche.trim(), DELAI_RECHERCHE);
  const cle = JSON.stringify([localStorage.getItem('token'), annee, niveau, terme, page, parPage]);

  const [resultat, setResultat] = useState(() => memoire.get(cle) || null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!annee) return undefined;
    const enMemoire = memoire.get(cle);
    if (enMemoire) setResultat(enMemoire);

    const controle = new AbortController(); // une frappe ou un filtre plus récent annule la requête en cours
    setLoading(true);
    setErreur(null);
    api
      .get('/etudiant_parcours', {
        params: { annee, niveau, q: terme || undefined, page: page + 1, per_page: parPage },
        signal: controle.signal,
      })
      .then((res) => {
        const valeur = { lignes: res.data.data, total: res.data.total, pages: res.data.last_page };
        memoriser(cle, valeur);
        setResultat(valeur);
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setErreur(errorMessage(err, 'Impossible de charger la liste des étudiants.'));
      })
      .finally(() => {
        if (!controle.signal.aborted) setLoading(false);
      });
    return () => controle.abort();
    // `cle` regroupe annee, niveau, terme, page et parPage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, version]);

  // Après un ajout, une modification, une suppression ou un import : tout ce qui est en mémoire est périmé
  const recharger = useCallback(() => {
    memoire.clear();
    setVersion((v) => v + 1);
  }, []);

  return {
    lignes: resultat?.lignes || [],
    total: resultat?.total ?? 0,
    pages: resultat?.pages ?? 0,
    premierChargement: !resultat && !erreur, // rien à montrer encore : squelette
    actualisation: Boolean(resultat) && (loading || terme !== recherche.trim()), // anciennes lignes estompées
    erreur,
    recharger,
  };
};

export default useParcoursPagines;
