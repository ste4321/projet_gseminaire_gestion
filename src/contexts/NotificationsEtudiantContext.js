// Nouvelles de l'espace étudiant, en plus des annonces (NotificationAnnonceContext) :
// - notes d'un semestre publiées ;
// - emploi du temps ajouté ou remplacé ;
// - leçon publiée par un enseignant (matière de son niveau).
// Reçues en direct (WebSocket) : données à jour + notification en bas à droite.
// Non lues (cloche de l'en-tête) : publiées depuis la dernière visite de la page concernée (gardé sur le compte,
// voir utils/notificationsLues : identique sur tous les navigateurs), calculées à partir des données elles-mêmes :
// ce qui a été publié pendant l'absence de l'étudiant compte aussi.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from './FeedbackContext';
import { useEmploi } from './EmploiContext';
import { useActualiserLecons, useActualiserReleves, useLecons, useReleve } from './EspaceEtudiantContext';
import { getUser } from '../auth/session';
import { ecouterUtilisateur, onConnectionChange } from '../realtime';
import {
  chargerLues, ecrireLocal as ecrire, enregistrerLues, fusionnerDate, lireLocal as lire, plusRecente, surRetourOnglet,
} from '../utils/notificationsLues';

const NotificationsEtudiantContext = createContext(null);
const SANS_FOURNISSEUR = {
  elements: [], coursLusJusqua: '', leconsVues: [],
  marquerNotesLues: () => {}, marquerEdtLu: () => {}, marquerCoursLus: () => {}, marquerLeconVue: () => {}, toutMarquerLu: () => {},
};

// Première visite (rien de mémorisé) : seules les nouveautés des 14 derniers jours comptent
const RECENT = 14 * 24 * 60 * 60 * 1000;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);
const idsLocaux = (cle) => lire(cle).split(',').filter(Boolean).map(Number);

/** Date d'un élément de l'emploi du temps : ajout ou remplacement */
const dateEdt = (e) => (instant(e.updated_at) > instant(e.created_at) ? e.updated_at : e.created_at);

export const NotificationsEtudiantProvider = ({ children }) => {
  const userId = getUser()?.id;
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const { emploiSemestre1, emploiSemestre2, fetchEmplois } = useEmploi();
  const { releve } = useReleve(); // inscription en cours : partagé avec l'accueil et « Mes notes »
  const actualiserReleves = useActualiserReleves();
  const { lecons } = useLecons(); // inscription en cours : partagé avec « Mes cours »
  const actualiserLecons = useActualiserLecons();

  const cleNotes = `notes_lues_${userId}`;
  const cleEdt = `edt_lu_${userId}`;
  const [notesLuesJusqua, setNotesLuesJusqua] = useState(() => lire(cleNotes));
  const [edtLuJusqua, setEdtLuJusqua] = useState(() => lire(cleEdt));
  const cleCours = `cours_lus_${userId}`;
  const [coursLusJusqua, setCoursLusJusqua] = useState(() => lire(cleCours));
  // Leçons ouvertes une à une (depuis la cloche ou une notification) : elles ne comptent plus comme nouvelles
  const cleVues = `lecons_vues_${userId}`;
  const [leconsVues, setLeconsVues] = useState(() => idsLocaux(cleVues));
  const [ouverture] = useState(() => Date.now());
  const seuil = (lu) => (lu ? instant(lu) : ouverture - RECENT);

  // ---------- Lu sur un autre navigateur ----------
  // À l'ouverture et à chaque retour sur l'onglet : on reprend ce que le compte a déjà lu.
  // Ce que ce navigateur avait lu de plus récent (avant cette mise à jour, ou hors ligne) est renvoyé au serveur.
  useEffect(() => {
    if (!userId) return undefined;
    let actif = true;
    const synchroniser = async () => {
      const serveur = await chargerLues();
      if (!actif || !serveur) return;
      const envoi = {};
      const notes = fusionnerDate(serveur.notes, cleNotes, setNotesLuesJusqua);
      const edt = fusionnerDate(serveur.edt, cleEdt, setEdtLuJusqua);
      const cours = fusionnerDate(serveur.cours, cleCours, setCoursLusJusqua);
      if (notes) envoi.notes = notes;
      if (edt) envoi.edt = edt;
      if (cours) envoi.cours = cours;

      const surServeur = (serveur.lecons_vues || []).map(Number);
      const locales = idsLocaux(cleVues);
      const manquantes = locales.filter((id) => !surServeur.includes(id));
      const toutes = [...new Set([...surServeur, ...locales])].slice(0, 200);
      ecrire(cleVues, toutes.join(','));
      setLeconsVues(toutes);
      if (manquantes.length > 0) envoi.lecons_vues = manquantes;

      enregistrerLues(envoi);
    };
    synchroniser();
    const arreter = surRetourOnglet(synchroniser);
    return () => { actif = false; arreter(); };
  }, [userId, cleNotes, cleEdt, cleCours, cleVues]);

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

  useEffect(
    () => ecouterUtilisateur(userId, 'lecons.maj', ({ action, id, titre, matiere, enseignant }) => {
      actualiserLecons();
      if (action === 'publiee') {
        notify.annonce(null, {
          icone: 'bx-book-open',
          title: `Nouvelle leçon · ${matiere || 'Mes cours'}`,
          meta: [titre, enseignant].filter(Boolean).join(' · '),
          action: { label: 'Voir', onClick: () => navigate(`/etudiant/cours/${id}`) },
        });
      }
    }),
    [userId, actualiserLecons, notify, navigate]
  );

  // Connexion rétablie après une coupure : rattrape ce qui a pu être publié entre-temps
  useEffect(() => {
    let dejaConnecte = false;
    return onConnectionChange((etat) => {
      if (etat !== 'connected') return;
      if (dejaConnecte) {
        actualiserReleves();
        actualiserLecons();
        fetchEmplois();
      }
      dejaConnecte = true;
    });
  }, [actualiserReleves, actualiserLecons, fetchEmplois]);

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

    // Une ligne par leçon publiée depuis la dernière visite de « Mes cours »
    const cours = (lecons || [])
      .filter((l) => instant(l.publie_le) > seuil(coursLusJusqua) && !leconsVues.includes(l.id))
      .map((l) => ({
        cle: `lecon-${l.id}`,
        icone: 'bx-book-open',
        titre: `Nouvelle leçon · ${l.matiere}`,
        detail: [l.titre, l.enseignant].filter(Boolean).join(' · '),
        quand: l.publie_le,
        ouvrir: () => navigate(`/etudiant/cours/${l.id}`),
      }));

    return [...notes, ...edt, ...cours];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semestresPublies, emplois, lecons, notesLuesJusqua, edtLuJusqua, coursLusJusqua, leconsVues, navigate]);

  // Lu jusqu'à la plus récente reçue (heure du serveur : pas de décalage avec l'horloge du poste),
  // enregistré sur le compte pour les autres navigateurs
  const marquer = (dates, actuel, setter, cle, cleServeur) => {
    const nouvelle = dates.reduce((max, d) => plusRecente(max, d), actuel);
    if (!nouvelle || nouvelle === actuel) return;
    setter(nouvelle);
    ecrire(cle, nouvelle);
    enregistrerLues({ [cleServeur]: nouvelle });
  };
  const marquerNotesLues = useCallback(
    () => marquer(semestresPublies.map((s) => s.publie_le), notesLuesJusqua, setNotesLuesJusqua, cleNotes, 'notes'),
    [semestresPublies, notesLuesJusqua, cleNotes]
  );
  const marquerEdtLu = useCallback(
    () => marquer(emplois.map(dateEdt), edtLuJusqua, setEdtLuJusqua, cleEdt, 'edt'),
    [emplois, edtLuJusqua, cleEdt]
  );
  const marquerCoursLus = useCallback(
    () => marquer((lecons || []).map((l) => l.publie_le), coursLusJusqua, setCoursLusJusqua, cleCours, 'cours'),
    [lecons, coursLusJusqua, cleCours]
  );
  const marquerLeconVue = useCallback((id) => {
    const lecon = Number(id);
    if (leconsVues.includes(lecon)) return;
    const suivantes = [lecon, ...leconsVues].slice(0, 200); // les plus anciennes sont de toute façon déjà lues
    setLeconsVues(suivantes);
    ecrire(cleVues, suivantes.join(','));
    enregistrerLues({ lecons_vues: [lecon] });
  }, [leconsVues, cleVues]);
  const toutMarquerLu = useCallback(() => {
    marquerNotesLues();
    marquerEdtLu();
    marquerCoursLus();
  }, [marquerNotesLues, marquerEdtLu, marquerCoursLus]);

  const valeur = useMemo(
    () => ({ elements, coursLusJusqua, leconsVues, marquerNotesLues, marquerEdtLu, marquerCoursLus, marquerLeconVue, toutMarquerLu }),
    [elements, coursLusJusqua, leconsVues, marquerNotesLues, marquerEdtLu, marquerCoursLus, marquerLeconVue, toutMarquerLu]
  );

  return <NotificationsEtudiantContext.Provider value={valeur}>{children}</NotificationsEtudiantContext.Provider>;
};

/** Vide hors de l'espace étudiant (enseignant, administration) */
export const useNotificationsEtudiant = () => useContext(NotificationsEtudiantContext) || SANS_FOURNISSEUR;
