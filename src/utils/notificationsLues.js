// Notifications déjà lues (cloche de l'en-tête), gardées sur le compte (GET / PUT /api/notifications/lues) :
// ce qui est lu dans un navigateur ne réapparaît pas dans un autre.
// Une copie reste dans ce navigateur pour un affichage immédiat, avant la réponse du serveur.
// Pendant une consultation par l'administration, rien n'est enregistré : l'admin voit l'état réel de la personne.
import api from '../api/client';
import { getConsultation } from '../auth/session';

const instant = (iso) => (iso ? new Date(iso).getTime() : 0);

/** La plus récente de deux dates ISO ('' si aucune) */
export const plusRecente = (a, b) => (instant(b) > instant(a) ? b : a) || '';

export const lireLocal = (cle) => {
  if (getConsultation()) return '';
  try {
    return localStorage.getItem(cle) || '';
  } catch (e) {
    return '';
  }
};

export const ecrireLocal = (cle, valeur) => {
  if (getConsultation()) return;
  try {
    localStorage.setItem(cle, valeur);
  } catch (e) {
    // Stockage indisponible (navigation privée) : le serveur garde de toute façon ce qui est lu
  }
};

/** { annonces, notes, edt, cours, lecons_vues } du compte, ou null si le serveur ne répond pas */
export const chargerLues = () => api.get('/notifications/lues').then((res) => res.data).catch(() => null);

/** Envoie ce qui vient d'être lu ; le serveur ne garde que ce qui fait avancer (jamais de retour en arrière) */
export const enregistrerLues = (changements) => {
  if (getConsultation() || Object.keys(changements).length === 0) return;
  api.put('/notifications/lues', changements).catch(() => {
    // Sans réseau : la copie locale suffit, elle sera renvoyée à la prochaine synchronisation
  });
};

/** Appelle rappel quand on revient sur l'onglet (lu entre-temps sur un autre appareil) */
export const surRetourOnglet = (rappel) => {
  const visible = () => document.visibilityState === 'visible' && rappel();
  document.addEventListener('visibilitychange', visible);
  return () => document.removeEventListener('visibilitychange', visible);
};

/**
 * Fusionne une date « lu jusqu'à » du serveur avec la copie locale : garde la plus récente,
 * met à jour l'état et la copie locale, et renvoie la valeur à envoyer au serveur s'il est en retard.
 */
export const fusionnerDate = (serveur, cleLocale, setter) => {
  const local = lireLocal(cleLocale);
  const valeur = plusRecente(local, serveur || '');
  if (valeur && valeur !== local) ecrireLocal(cleLocale, valeur);
  setter((actuelle) => plusRecente(actuelle, valeur));
  return valeur && valeur !== serveur ? valeur : null;
};
