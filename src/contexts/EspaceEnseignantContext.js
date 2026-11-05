// Données de l'enseignant (matières attribuées, leçons, notes d'une matière), gardées en mémoire tant que l'espace est ouvert.
// Une page déjà visitée s'affiche aussitôt avec ce qu'elle a déjà reçu, puis se met à jour en silence
// (pas d'écran de chargement à chaque changement de menu).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../api/client';

const EspaceEnseignantContext = createContext(null);

export const EspaceEnseignantProvider = ({ children }) => {
  const [cache, setCache] = useState({}); // clé (url + paramètres) → { data, erreur }
  const enCours = useRef({}); // clé → promesse de la requête en cours
  const numeros = useRef({}); // clé → numéro de la dernière requête : seule sa réponse est retenue

  const charger = useCallback((cle, url, params, messageErreur, forcer = false) => {
    if (!forcer && enCours.current[cle]) return enCours.current[cle];
    const moi = (numeros.current[cle] || 0) + 1;
    numeros.current[cle] = moi;
    const requete = api
      .get(url, { params })
      .then((res) => {
        if (moi === numeros.current[cle]) setCache((tout) => ({ ...tout, [cle]: { data: res.data, erreur: null } }));
        return res.data;
      })
      .catch((err) => {
        // Déjà affiché : on garde ce qu'on avait plutôt qu'un écran d'erreur
        if (moi === numeros.current[cle]) {
          setCache((tout) => ({ ...tout, [cle]: { data: tout[cle]?.data ?? null, erreur: errorMessage(err, messageErreur) } }));
        }
        return null;
      })
      .finally(() => {
        if (moi === numeros.current[cle]) delete enCours.current[cle];
      });
    enCours.current[cle] = requete;
    return requete;
  }, []);

  // Range une réponse sous une autre clé (ex. l'année en cours, reçue sans l'avoir demandée), si elle est encore vide
  const amorcer = useCallback((cle, data) => {
    setCache((tout) => (tout[cle] ? tout : { ...tout, [cle]: { data, erreur: null } }));
  }, []);

  const valeur = useMemo(() => ({ cache, charger, amorcer }), [cache, charger, amorcer]);

  return <EspaceEnseignantContext.Provider value={valeur}>{children}</EspaceEnseignantContext.Provider>;
};

export const cleRequete = (url, params = {}) => {
  const definis = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return `${url}?${new URLSearchParams(definis).toString()}`;
};

/**
 * GET mis en cache dans l'espace enseignant. url null : rien à charger pour le moment.
 * chargement : rien encore reçu pour cette requête ; un rechargement garde les données affichées.
 */
export const useDonneesEnseignant = (url, params, messageErreur) => {
  const { cache, charger, amorcer } = useContext(EspaceEnseignantContext);
  const cle = url ? cleRequete(url, params) : null;
  const entree = cle ? cache[cle] : undefined;
  const derniers = useRef({ url, params, messageErreur });
  derniers.current = { url, params, messageErreur };

  // À chaque ouverture de la page : mise à jour, sans masquer ce qui est déjà affiché
  useEffect(() => {
    if (!cle) return;
    const { url: u, params: p, messageErreur: m } = derniers.current;
    charger(cle, u, p, m);
  }, [cle, charger]);

  const recharger = useCallback(() => {
    if (!cle) return Promise.resolve(null);
    const { url: u, params: p, messageErreur: m } = derniers.current;
    return charger(cle, u, p, m, true);
  }, [cle, charger]);

  return {
    data: entree?.data ?? null,
    erreur: entree && !entree.data ? entree.erreur : null,
    chargement: Boolean(cle) && !entree,
    recharger,
    amorcer,
  };
};
