import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage, estAnnulee } from '../api/client';

// Une page d'une liste paginée par le serveur (annonces, actualités…) :
// réponse attendue { data, page, pages, total, total_tout }.
//
// - Mémoire par combinaison de paramètres : une page déjà vue s'affiche immédiatement,
//   puis elle est rafraîchie en arrière-plan.
// - Un changement de filtre annule la requête précédente : seule la dernière réponse compte.
// - Pendant l'attente, les lignes actuelles restent affichées ; elles ne sont estompées
//   que si l'attente se prolonge (pas de clignotement sur une réponse rapide).
const memoire = new Map();
const TAILLE_MEMOIRE = 60;
const DELAI_ESTOMPAGE = 250;

const memoriser = (cle, valeur) => {
  memoire.delete(cle);
  memoire.set(cle, valeur);
  if (memoire.size > TAILLE_MEMOIRE) memoire.delete(memoire.keys().next().value);
};

/** Valeur qui ne suit `valeur` qu'après `delai` ms sans changement (recherche pendant la frappe) */
export const useDiffere = (valeur, delai = 300) => {
  const [differee, setDifferee] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setDifferee(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return differee;
};

/**
 * @param url      ressource GET de l'API
 * @param params   paramètres de la page (page, per_page, filtres) ; valeurs vides ignorées
 * @param message  message affiché si la page ne peut pas être chargée
 */
const usePageServeur = (url, params, message = 'Impossible de charger la liste.') => {
  const propres = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
  const cle = JSON.stringify([localStorage.getItem('token'), url, propres]);

  const [resultat, setResultat] = useState(() => (memoire.has(cle) ? { cle, ...memoire.get(cle) } : null));
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const enMemoire = memoire.get(cle);
    if (enMemoire) setResultat({ cle, ...enMemoire });
    const controle = new AbortController();
    setErreur(null);
    api
      .get(url, { params: propres, signal: controle.signal })
      .then((res) => {
        // Serveur pas encore mis à jour (liste complète au lieu d'une page) : tout sur une seule page
        const valeur = Array.isArray(res.data)
          ? { data: res.data, page: 1, pages: 1, total: res.data.length, total_tout: res.data.length }
          : res.data;
        memoriser(cle, valeur);
        setResultat({ cle, ...valeur });
      })
      .catch((err) => {
        if (!estAnnulee(err)) setErreur(errorMessage(err, message));
      });
    return () => controle.abort();
    // `cle` regroupe l'adresse et les paramètres
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, version]);

  // Page déjà vue : affichée dès ce rendu, sans attendre le serveur
  const enMemoire = memoire.get(cle);
  const affiche = enMemoire || resultat;
  const perime = Boolean(affiche) && !enMemoire && resultat?.cle !== cle;

  const [estompe, setEstompe] = useState(false);
  useEffect(() => {
    if (!perime) {
      setEstompe(false);
      return undefined;
    }
    const t = setTimeout(() => setEstompe(true), DELAI_ESTOMPAGE);
    return () => clearTimeout(t);
  }, [perime]);

  // Après un ajout, une modification, une suppression ou une mise à jour en direct :
  // toutes les pages de cette liste sont périmées (la page affichée est relue, sans squelette)
  const recharger = useCallback(() => {
    [...memoire.keys()].forEach((k) => {
      if (JSON.parse(k)[1] === url) memoire.delete(k);
    });
    setVersion((v) => v + 1);
  }, [url]);

  return {
    lignes: affiche?.data || [],
    total: affiche?.total ?? 0,
    totalTout: affiche?.total_tout ?? 0,
    pages: affiche?.pages ?? 0,
    premierChargement: !affiche && !erreur, // rien à montrer encore : squelette
    attente: perime, // nouvelle page en route : ne pas conclure à une liste vide
    actualisation: perime && estompe, // attente qui se prolonge : lignes estompées
    erreur,
    recharger,
  };
};

export default usePageServeur;
