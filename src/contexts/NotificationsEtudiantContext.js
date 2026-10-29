// Nouvelles de l'espace étudiant, en plus des annonces (NotificationAnnonceContext) :
// - notes d'un semestre publiées ;
// - emploi du temps ajouté ou remplacé.
// Reçues en direct (WebSocket) : données à jour + notification en bas à droite.
// Non lues (cloche de l'en-tête) : publiées depuis la dernière visite de la page concernée (mémorisé dans ce navigateur),
// calculées à partir des données elles-mêmes : ce qui a été publié pendant l'absence de l'étudiant compte aussi.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from './FeedbackContext';
import { useEmploi } from './EmploiContext';
import { useActualiserReleves, useReleve } from './EspaceEtudiantContext';
import { getUser } from '../auth/session';
import { ecouterUtilisateur, onConnectionChange } from '../realtime';

const NotificationsEtudiantContext = createContext(null);
const SANS_FOURNISSEUR = { elements: [], marquerNotesLues: () => {}, marquerEdtLu: () => {}, toutMarquerLu: () => {} };

// Première visite (rien de mémorisé) : seules les nouveautés des 14 derniers jours comptent
const RECENT = 14 * 24 * 60 * 60 * 1000;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);
const lire = (cle) => {
  try {
    return localStorage.getItem(cle) || '';
  } catch (e) {
    return '';
  }
};
const ecrire = (cle, valeur) => {
  try {
    localStorage.setItem(cle, valeur);
  } catch (e) {
    // Stockage indisponible (navigation privée) : le compteur repartira au prochain chargement
  }
};

/** Date d'un élément de l'emploi du temps : ajout ou remplacement */
const dateEdt = (e) => (instant(e.updated_at) > instant(e.created_at) ? e.updated_at : e.created_at);

export const NotificationsEtudiantProvider = ({ children }) => {
  const userId = getUser()?.id;
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const { emploiSemestre1, emploiSemestre2, fetchEmplois } = useEmploi();
  const { releve } = useReleve(); // inscription en cours : partagé avec l'accueil et « Mes notes »
  const actualiserReleves = useActualiserReleves();

  const cleNotes = `notes_lues_${userId}`;
  const cleEdt = `edt_lu_${userId}`;
  const [notesLuesJusqua, setNotesLuesJusqua] = useState(() => lire(cleNotes));
  const [edtLuJusqua, setEdtLuJusqua] = useState(() => lire(cleEdt));
  const [ouverture] = useState(() => Date.now());
  const seuil = (lu) => (lu ? instant(lu) : ouverture - RECENT);

  // ---------- En direct ----------
  useEffect(
    () => ecouterUtilisateur(userId, 'notes.maj', ({ action, semestre }) => {
      actualiserReleves();
      if (action === 'publiees') {
        notify.annonce(null, {
          icone: 'bx-medal',
          title: semestre ? `Notes du ${semestre} publiées` : 'Nouvelles notes publiées',
          meta: 'Mes notes',
          action: { label: 'Voir', onClick: () => navigate('/etudiant/notes') },
        });
      }
    }),
    [userId, actualiserReleves, notify, navigate]
  );

  useEffect(
    () => ecouterUtilisateur(userId, 'edt.maj', ({ action, semestre }) => {
      fetchEmplois();
      if (action === 'ajoute' || action === 'remplace') {
        notify.annonce(null, {
          icone: 'bx-calendar',
          title: `Emploi du temps · Semestre ${semestre}`,
          meta: action === 'ajoute' ? 'Nouvelle page' : 'Page remplacée',
          action: { label: 'Voir', onClick: () => navigate('/etudiant/edt', { state: { semestre } }) },
        });
      }
    }),
    [userId, fetchEmplois, notify, navigate]
  );

  // Connexion rétablie après une coupure : rattrape ce qui a pu être publié entre-temps
  useEffect(() => {
    let dejaConnecte = false;
    return onConnectionChange((etat) => {
      if (etat !== 'connected') return;
      if (dejaConnecte) {
        actualiserReleves();
        fetchEmplois();
      }
      dejaConnecte = true;
    });
  }, [actualiserReleves, fetchEmplois]);

  // ---------- Non lues ----------
  const semestresPublies = useMemo(() => (releve?.semestres || []).filter((s) => s.publie && s.publie_le), [releve]);
  const emplois = useMemo(() => [...emploiSemestre1, ...emploiSemestre2], [emploiSemestre1, emploiSemestre2]);

  const elements = useMemo(() => {
    const notes = semestresPublies
      .filter((s) => instant(s.publie_le) > seuil(notesLuesJusqua))
      .map((s) => ({
        cle: `notes-${s.id}`,
        icone: 'bx-medal',
        titre: `Notes du ${s.semestre} publiées`,
        detail: 'Mes notes',
        quand: s.publie_le,
        ouvrir: () => navigate('/etudiant/notes'),
      }));

    // Une ligne par semestre, à la date de la dernière modification
    const parSemestre = {};
    emplois
      .filter((e) => instant(dateEdt(e)) > seuil(edtLuJusqua))
      .forEach((e) => {
        const s = Number(e.semestre);
        if (!parSemestre[s] || instant(dateEdt(e)) > instant(parSemestre[s])) parSemestre[s] = dateEdt(e);
      });
    const edt = Object.entries(parSemestre).map(([s, quand]) => ({
      cle: `edt-${s}`,
      icone: 'bx-calendar',
      titre: `Emploi du temps mis à jour · Semestre ${s}`,
      detail: 'Emploi du temps',
      quand,
      ouvrir: () => navigate('/etudiant/edt', { state: { semestre: Number(s) } }),
    }));

    return [...notes, ...edt];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semestresPublies, emplois, notesLuesJusqua, edtLuJusqua, navigate]);

  // Lu jusqu'à la plus récente reçue (heure du serveur : pas de décalage avec l'horloge du poste)
  const marquer = (dates, actuel, setter, cle) => {
    const plusRecente = dates.reduce((max, d) => (instant(d) > instant(max) ? d : max), actuel);
    if (!plusRecente || plusRecente === actuel) return;
    setter(plusRecente);
    ecrire(cle, plusRecente);
  };
  const marquerNotesLues = useCallback(
    () => marquer(semestresPublies.map((s) => s.publie_le), notesLuesJusqua, setNotesLuesJusqua, cleNotes),
    [semestresPublies, notesLuesJusqua, cleNotes]
  );
  const marquerEdtLu = useCallback(
    () => marquer(emplois.map(dateEdt), edtLuJusqua, setEdtLuJusqua, cleEdt),
    [emplois, edtLuJusqua, cleEdt]
  );
  const toutMarquerLu = useCallback(() => {
    marquerNotesLues();
    marquerEdtLu();
  }, [marquerNotesLues, marquerEdtLu]);

  const valeur = useMemo(
    () => ({ elements, marquerNotesLues, marquerEdtLu, toutMarquerLu }),
    [elements, marquerNotesLues, marquerEdtLu, toutMarquerLu]
  );

  return <NotificationsEtudiantContext.Provider value={valeur}>{children}</NotificationsEtudiantContext.Provider>;
};

/** Vide hors de l'espace étudiant (enseignant, administration) */
export const useNotificationsEtudiant = () => useContext(NotificationsEtudiantContext) || SANS_FOURNISSEUR;
