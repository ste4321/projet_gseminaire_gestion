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

  // ---------- Leçons (cours) : liste par inscription, détail par leçon ----------
  const [lecons, setLecons] = useState({}); // 'liste:<parcours>' ou 'lecon:<id>' → { data, erreur }
  const leconsEnCours = useRef({});
  const leconsVues = useRef(new Set());

  const chargerLecons = useCallback((cle) => {
    leconsVues.current.add(cle);
    if (leconsEnCours.current[cle]) return leconsEnCours.current[cle];
    const [type, valeurCle] = cle.split(':');
    const requete = api
      .get(type === 'lecon' ? `/etudiant/lecons/${valeurCle}` : '/etudiant/lecons', { params: type === 'liste' && valeurCle ? { parcours: valeurCle } : {} })
      .then((res) => {
        setLecons((tout) => ({ ...tout, [cle]: { data: res.data, erreur: null } }));
        return res.data;
      })
      .catch((err) => {
        // Leçon retirée entre-temps : plus rien à montrer (404) ; sinon on garde ce qui était affiché
        const disparue = err.response?.status === 404 && type === 'lecon';
        setLecons((tout) => ({
          ...tout,
          [cle]: {
            data: disparue ? null : tout[cle]?.data ?? null,
            erreur: errorMessage(err, type === 'lecon' ? "Cette leçon n'est pas disponible." : 'Impossible de charger vos cours.'),
          },
        }));
        return null;
      })
      .finally(() => {
        delete leconsEnCours.current[cle];
      });
    leconsEnCours.current[cle] = requete;
    return requete;
  }, []);

  // Leçon publiée, modifiée ou retirée (notification en direct) : listes et détails déjà vus se mettent à jour
  const actualiserLecons = useCallback(() => {
    leconsVues.current.forEach((cle) => chargerLecons(cle));
  }, [chargerLecons]);

  const valeur = useMemo(
    () => ({ releves, chargerReleve, actualiserReleves, parcours, chargerParcours, lecons, chargerLecons, actualiserLecons }),
    [releves, chargerReleve, actualiserReleves, parcours, chargerParcours, lecons, chargerLecons, actualiserLecons]
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

// Entrée du cache des leçons : chargée à l'ouverture, mise à jour en silence ensuite
const useEntreeLecons = (cle) => {
  const { lecons, chargerLecons } = useContext(EspaceEtudiantContext);
  const entree = cle ? lecons[cle] : undefined;

  useEffect(() => {
    if (cle) chargerLecons(cle);
  }, [cle, chargerLecons]);

  const recharger = useCallback(() => (cle ? chargerLecons(cle) : Promise.resolve(null)), [cle, chargerLecons]);

  return {
    data: entree?.data ?? null,
    loading: Boolean(cle) && !entree,
    erreur: entree && !entree.data ? entree.erreur : null,
    recharger,
  };
};

/** Leçons publiées pour une inscription (par défaut la plus récente), la plus récente d'abord */
export const useLecons = (parcoursId = '') => {
  const { data, ...reste } = useEntreeLecons(`liste:${parcoursId || ''}`);
  return { lecons: data, ...reste };
};

/** Une leçon et les autres leçons de sa matière */
export const useLecon = (id) => {
  const { data, ...reste } = useEntreeLecons(id ? `lecon:${id}` : null);
  return { lecon: data, ...reste };
};

/** Remet à jour les leçons déjà affichées (après une publication) */
export const useActualiserLecons = () => useContext(EspaceEtudiantContext).actualiserLecons;

/** Inscriptions de l'étudiant (années / niveaux), la plus récente d'abord */
export const useParcours = () => {
  const { parcours, chargerParcours } = useContext(EspaceEtudiantContext);
  useEffect(() => {
    chargerParcours();
  }, [chargerParcours]);
  return parcours || [];
};
