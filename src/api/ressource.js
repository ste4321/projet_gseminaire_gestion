// Données de référence partagées par les pages d'un espace (annonces, matières, niveaux…).
// Une seule façon de les charger, pour toute l'application :
// - à la demande : la requête part quand une page utilise la donnée pour la première fois,
//   pas à l'ouverture de l'espace ;
// - une seule requête à la fois, même si plusieurs composants la demandent ensemble ;
// - gardée en mémoire tant que l'espace est ouvert : changer de page ne recharge pas ;
// - erreur notifiée et exposée (`erreur`) au lieu d'une liste vide silencieuse ; nouvel essai possible ;
// - une réponse dépassée (rechargement plus récent lancé entre-temps) est ignorée.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from './client';
import { useFeedback } from '../contexts/FeedbackContext';

// Composant utilisé hors de l'espace qui fournit la donnée : liste vide, sans planter
const rien = () => Promise.resolve(null);
const SANS_FOURNISSEUR = { data: [], setData: () => {}, loading: false, actualisation: false, erreur: null, charger: rien, recharger: rien };

/**
 * @param url       ressource GET de l'API
 * @param nom       libellé utilisé dans le message d'erreur (« les annonces »)
 * @param params    paramètres de requête éventuels
 * @returns { Provider, useRessource } — useRessource() renvoie
 *          { data, loading, actualisation, erreur, charger, recharger, setData }
 */
export const creerRessource = ({ url, nom, params }) => {
  const Contexte = createContext(null);

  const Provider = ({ children }) => {
    const [data, setData] = useState([]);
    const [chargee, setChargee] = useState(false);
    const [enCours, setEnCours] = useState(false);
    const [erreur, setErreur] = useState(null);
    const { notify } = useFeedback();
    const requete = useRef(null); // requête en cours ou déjà aboutie
    const numero = useRef(0); // seule la réponse de la dernière requête est retenue

    const lancer = useCallback(() => {
      const moi = ++numero.current;
      setEnCours(true);
      setErreur(null);
      const promesse = api
        .get(url, { params })
        .then((res) => {
          if (moi === numero.current) {
            setData(res.data);
            setChargee(true);
          }
          return res.data;
        })
        .catch((err) => {
          if (moi === numero.current) {
            requete.current = null; // le prochain appel retentera
            const message = errorMessage(err, `Impossible de charger ${nom}.`);
            setErreur(message);
            notify.error(message);
          }
          return null;
        })
        .finally(() => {
          if (moi === numero.current) setEnCours(false);
        });
      requete.current = promesse;
      return promesse;
    }, [notify]);

    // Premier besoin : charge une fois, puis renvoie la même promesse
    const charger = useCallback(() => requete.current || lancer(), [lancer]);
    // Après un ajout, une modification ou une suppression
    const recharger = useCallback(() => lancer(), [lancer]);

    const valeur = useMemo(
      () => ({
        data,
        setData,
        // premier chargement seulement : un rechargement (après ajout, suppression…) garde la liste affichée
        loading: !chargee && !erreur,
        actualisation: enCours && chargee,
        erreur,
        charger,
        recharger,
      }),
      [data, enCours, chargee, erreur, charger, recharger]
    );

    return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
  };

  const useRessource = () => {
    const ressource = useContext(Contexte);
    const charger = ressource?.charger;
    useEffect(() => {
      charger?.();
    }, [charger]);
    return ressource || SANS_FOURNISSEUR;
  };

  return { Provider, useRessource };
};
