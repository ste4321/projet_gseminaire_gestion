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
const DELAI_ESTOMPAGE = 250; // ms d'attente avant d'estomper les anciennes lignes

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

  // Chaque résultat garde la clé de filtres qui l'a produit : on sait ainsi si les lignes affichées
  // correspondent au choix actuel (rafraîchissement silencieux) ou à l'ancien (lignes estompées).
  const [resultat, setResultat] = useState(() => (memoire.has(cle) ? { cle, ...memoire.get(cle) } : null));
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!annee) return undefined;
    const enMemoire = memoire.get(cle);
    if (enMemoire) setResultat({ cle, ...enMemoire });

    const controle = new AbortController(); // une frappe ou un filtre plus récent annule la requête en cours
    setErreur(null);
    api
      .get('/etudiant_parcours', {
        params: { annee, niveau, q: terme || undefined, page: page + 1, per_page: parPage },
        signal: controle.signal,
      })
      .then((res) => {
        const valeur = { lignes: res.data.data, total: res.data.total, pages: res.data.last_page };
        memoriser(cle, valeur);
        setResultat({ cle, ...valeur });
      })
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') setErreur(errorMessage(err, 'Impossible de charger la liste des étudiants.'));
      });
    return () => controle.abort();
    // `cle` regroupe annee, niveau, terme, page et parPage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, version]);

  // Page déjà vue : affichée dès ce rendu, sans attendre l'effet ni le serveur
  const enMemoire = memoire.get(cle);
  const affiche = enMemoire || resultat;
  const aJour = Boolean(enMemoire) || resultat?.cle === cle;
  const perime = Boolean(affiche) && (!aJour || terme !== recherche.trim());

  // Estompage seulement si l'attente se prolonge : une réponse rapide remplace les lignes sans clignotement
  const [estompe, setEstompe] = useState(false);
  useEffect(() => {
    if (!perime) {
      setEstompe(false);
      return undefined;
    }
    const t = setTimeout(() => setEstompe(true), DELAI_ESTOMPAGE);
    return () => clearTimeout(t);
  }, [perime]);

  // Après un ajout, une modification, une suppression ou un import : tout ce qui est en mémoire est périmé
  const recharger = useCallback(() => {
    memoire.clear();
    setVersion((v) => v + 1);
  }, []);

  return {
    lignes: affiche?.lignes || [],
    total: affiche?.total ?? 0,
    pages: affiche?.pages ?? 0,
    premierChargement: !affiche && !erreur, // rien à montrer encore : squelette
    attente: perime, // nouvelles lignes en route (ne pas conclure à une liste vide)
    actualisation: perime && estompe, // lignes d'un ancien filtre, attente qui se prolonge : estompées
    erreur,
    recharger,
  };
};

export default useParcoursPagines;
