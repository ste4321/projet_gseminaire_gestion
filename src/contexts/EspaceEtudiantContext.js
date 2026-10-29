// Données personnelles de l'étudiant (relevé de notes, inscriptions), gardées en mémoire tant que l'espace est ouvert.
// Une page déjà visitée s'affiche aussitôt avec ce qu'elle a déjà reçu, puis se met à jour en silence
// (une note publiée entre-temps apparaît sans écran de chargement).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../api/client';

const EspaceEtudiantContext = createContext(null);

export const EspaceEtudiantProvider = ({ children }) => {
  const [releves, setReleves] = useState({}); // parcours ('' = inscription la plus récente) → { data, erreur }
  const [parcours, setParcours] = useState(null); // null = pas encore reçu
  const enCours = useRef({}); // une seule requête à la fois par relevé
  const relevesVus = useRef(new Set()); // relevés déjà demandés (à recharger quand des notes sont publiées)

  const chargerReleve = useCallback((cle) => {
    relevesVus.current.add(cle);
    if (enCours.current[cle]) return enCours.current[cle];
    const requete = api
      .get('/etudiant/releve', { params: cle ? { parcours: cle } : {} })
      .then((res) => {
        setReleves((tout) => ({ ...tout, [cle]: { data: res.data, erreur: null } }));
        return res.data;
      })
      .catch((err) => {
        // Déjà affiché : on garde ce qu'on avait plutôt qu'un écran d'erreur
        setReleves((tout) => ({ ...tout, [cle]: { data: tout[cle]?.data ?? null, erreur: errorMessage(err, 'Impossible de charger vos notes.') } }));
        return null;
      })
      .finally(() => {
        delete enCours.current[cle];
      });
    enCours.current[cle] = requete;
    return requete;
  }, []);

  const parcoursDemandes = useRef(false);
  const chargerParcours = useCallback(() => {
    if (parcoursDemandes.current) return;
    parcoursDemandes.current = true;
    api
      .get('/etudiant/parcours')
      .then((res) => setParcours(res.data))
      .catch(() => setParcours([])); // sans la liste, seul le parcours en cours est proposé
  }, []);

  // Notes publiées ou retirées (notification en direct) : tous les relevés déjà vus se mettent à jour
  const actualiserReleves = useCallback(() => {
    relevesVus.current.forEach((cle) => chargerReleve(cle));
  }, [chargerReleve]);

  const valeur = useMemo(
    () => ({ releves, chargerReleve, actualiserReleves, parcours, chargerParcours }),
    [releves, chargerReleve, actualiserReleves, parcours, chargerParcours]
  );

  return <EspaceEtudiantContext.Provider value={valeur}>{children}</EspaceEtudiantContext.Provider>;
};

/**
 * Relevé d'une inscription (par défaut la plus récente).
 * loading : rien encore reçu pour ce relevé ; actualisation : mise à jour en arrière-plan.
 */
export const useReleve = (parcoursId = '') => {
  const { releves, chargerReleve } = useContext(EspaceEtudiantContext);
  const cle = String(parcoursId || '');
  const entree = releves[cle];

  // À chaque ouverture de la page : mise à jour, sans masquer ce qui est déjà affiché
  useEffect(() => {
    chargerReleve(cle);
  }, [cle, chargerReleve]);

  const recharger = useCallback(() => chargerReleve(cle), [cle, chargerReleve]);

  return {
    releve: entree?.data ?? null,
    loading: !entree,
    erreur: entree && !entree.data ? entree.erreur : null,
    recharger,
  };
};

/** Remet à jour les relevés déjà affichés (après une publication de notes) */
export const useActualiserReleves = () => useContext(EspaceEtudiantContext).actualiserReleves;

/** Inscriptions de l'étudiant (années / niveaux), la plus récente d'abord */
export const useParcours = () => {
  const { parcours, chargerParcours } = useContext(EspaceEtudiantContext);
  useEffect(() => {
    chargerParcours();
  }, [chargerParcours]);
  return parcours || [];
};
