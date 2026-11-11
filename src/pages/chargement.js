// Découpage de l'application par page : chaque écran est un fichier JavaScript séparé,
// téléchargé seulement quand on l'ouvre. La page de connexion n'embarque donc plus tout l'espace
// d'administration, et un étudiant ne télécharge jamais les écrans de l'administration.
//
// Pour que la navigation reste instantanée, les écrans de l'espace ouvert sont préchargés
// en arrière-plan dès que le navigateur est inactif (voir prechargerEspace).
import { lazy } from 'react';

/** Composant chargé à la demande, qu'on peut aussi précharger (Composant.precharger()) */
const page = (importer) => {
  let promesse = null;
  const charger = () => {
    promesse = promesse || importer().catch((e) => {
      promesse = null; // échec réseau : un nouvel essai reste possible
      throw e;
    });
    return promesse;
  };
  const Composant = lazy(charger);
  Composant.precharger = charger;
  return Composant;
};

export const ChangerMotDePasse = page(() => import('./ChangerMotDePasse'));

export const AdminLayout = page(() => import('../layouts/AdminLayout'));
export const AdminDashboard = page(() => import('./admin/AdminDashboard'));
export const Info = page(() => import('./admin/Info'));
export const AnneesAcademiques = page(() => import('./admin/AnneesAcademiques'));
export const Calendrier = page(() => import('./admin/Calendrier'));
export const Messages = page(() => import('./admin/Messages'));
export const Reinscription = page(() => import('./admin/Reinscription'));
export const Niveau = page(() => import('./admin/Niveau'));
export const ListeEtudiants = page(() => import('../components/ListeEtudiants'));
export const NoteEtudiant = page(() => import('../components/NoteEtudiant'));
export const Matiere = page(() => import('../components/Matiere'));
export const Semestre = page(() => import('../components/Semestre'));
export const Portal = page(() => import('../components/Portal'));

export const ProfLayout = page(() => import('../layouts/ProfLayout'));
export const ProfDashboard = page(() => import('./prof/ProfDashboard'));
export const MesMatieres = page(() => import('./prof/MesMatieres'));
export const SaisieNotes = page(() => import('./prof/SaisieNotes'));
export const MesLecons = page(() => import('./prof/MesLecons'));
export const LeconProf = page(() => import('./prof/LeconProf'));

export const EtudiantLayout = page(() => import('../layouts/EtudiantLayout'));
export const EtudiantDashboard = page(() => import('./etudiant/EtudiantDashboard'));
export const MesNotes = page(() => import('./etudiant/MesNotes'));
export const MesCours = page(() => import('./etudiant/MesCours'));
export const LeconDetail = page(() => import('./etudiant/LeconDetail'));

// Écrans communs à plusieurs espaces
export const EmploiDuTemps = page(() => import('../components/EmploiDuTemps'));
export const ListeProf = page(() => import('../components/ListeProf'));
export const AnnonceAdminProf = page(() => import('../components/AnnonceAdminProf'));

const ESPACES = {
  admin: [
    AdminLayout, AdminDashboard, ListeEtudiants, NoteEtudiant, Matiere, EmploiDuTemps, ListeProf,
    AnnonceAdminProf, Info, Calendrier, Messages, Portal, AnneesAcademiques, Niveau, Semestre, Reinscription,
  ],
  prof: [ProfLayout, ProfDashboard, MesMatieres, SaisieNotes, MesLecons, LeconProf, EmploiDuTemps, AnnonceAdminProf],
  etudiant: [EtudiantLayout, EtudiantDashboard, MesNotes, MesCours, LeconDetail, EmploiDuTemps, ListeProf, AnnonceAdminProf],
};

const quandInactif = (tache) =>
  window.requestIdleCallback ? window.requestIdleCallback(tache, { timeout: 3000 }) : setTimeout(tache, 1500);

/** Précharge en arrière-plan les écrans d'un espace (sans gêner l'affichage en cours) */
export const prechargerEspace = (role) => {
  const pages = ESPACES[role];
  if (!pages) return;
  // Connexion lente ou économie de données : on s'abstient, chaque page se chargera à l'ouverture
  const reseau = navigator.connection;
  if (reseau?.saveData || /(^|-)2g$/.test(reseau?.effectiveType || '')) return;
  quandInactif(() => pages.forEach((p) => p.precharger().catch(() => {})));
};

/** Page de connexion : prépare la structure et le tableau de bord de chaque espace pendant la saisie */
export const prechargerConnexion = () =>
  quandInactif(() =>
    [AdminLayout, AdminDashboard, ProfLayout, ProfDashboard, EtudiantLayout, EtudiantDashboard].forEach((p) =>
      p.precharger().catch(() => {})
    )
  );
