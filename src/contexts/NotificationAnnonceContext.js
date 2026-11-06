// Notifications d'annonces pour les enseignants et les étudiants :
// - en direct (WebSocket, voir realtime.js) : dès qu'une annonce qui les concerne est publiée, modifiée
//   ou supprimée, la liste des annonces se met à jour (et une notification s'affiche pour une nouvelle) ;
// - annonces non lues : celles publiées depuis la dernière visite de la page Annonces
//   (gardé sur le compte, voir utils/notificationsLues : identique sur tous les navigateurs),
//   comptées sur la cloche de l'en-tête.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnonce } from './AnnonceContext';
import { useFeedback } from './FeedbackContext';
import { getRole, getUser } from '../auth/session';
import { ecouterUtilisateur, onConnectionChange } from '../realtime';
import { chargerLues, ecrireLocal, enregistrerLues, fusionnerDate, lireLocal, plusRecente, surRetourOnglet } from '../utils/notificationsLues';

const NotificationAnnonceContext = createContext(null);
const SANS_FOURNISSEUR = { actif: false, nonLues: [], marquerLues: () => {}, ouvrir: () => {} };

const ROLES_NOTIFIES = ['prof', 'etudiant'];
const cleLecture = (userId) => `annonces_lues_${userId}`;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);

// L'administration publie les annonces : pas de notification (ni de chargement des annonces sur chaque page)
export const NotificationAnnonceProvider = ({ children }) => {
  const role = getRole();
  const userId = getUser()?.id;
  if (!ROLES_NOTIFIES.includes(role) || !userId) return children;
  return <Notifications role={role} userId={userId}>{children}</Notifications>;
};

const Notifications = ({ role, userId, children }) => {
  const pageAnnonces = `/${role}/annonce`;

  // Chargées dès l'ouverture de l'espace, pour compter les non lues
  const { annonces, fetchAnnonces: recharger } = useAnnonce();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [luJusquA, setLuJusquA] = useState(() => lireLocal(cleLecture(userId)));

  // Lu sur un autre navigateur : repris à l'ouverture et à chaque retour sur l'onglet
  useEffect(() => {
    let actif = true;
    const synchroniser = async () => {
      const serveur = await chargerLues();
      if (!actif || !serveur) return;
      const enRetard = fusionnerDate(serveur.annonces, cleLecture(userId), setLuJusquA);
      if (enRetard) enregistrerLues({ annonces: enRetard });
    };
    synchroniser();
    const arreter = surRetourOnglet(synchroniser);
    return () => { actif = false; arreter(); };
  }, [userId]);

  /** Ouvre la page Annonces, et le détail de l'annonce si précisée */
  const ouvrir = useCallback((id) => navigate(pageAnnonces, { state: id ? { annonce: id } : undefined }), [navigate, pageAnnonces]);

  // Annonce publiée, modifiée ou supprimée : liste à jour immédiatement ; une nouvelle annonce est notifiée
  useEffect(
    () => ecouterUtilisateur(userId, 'annonce.maj', ({ action, annonce }) => {
      recharger();
      if (action === 'creee') {
        // En bas à droite, aux couleurs du séminaire (voir FeedbackContext)
        notify.annonce(null, {
          title: annonce.titre,
          meta: `Annonce · ${annonce.expediteur}`,
          action: { label: 'Lire', onClick: () => ouvrir(annonce.id) },
        });
      }
    }),
    [userId, recharger, notify, ouvrir]
  );

  // Connexion rétablie (coupure réseau, serveur redémarré) : rattrape ce qui a pu être manqué.
  // Sans connexion temps réel : actualisation toutes les 30 secondes, en attendant qu'elle revienne.
  const [connecte, setConnecte] = useState(true);
  useEffect(() => {
    let dejaConnecte = false;
    return onConnectionChange((etat) => {
      const ok = etat === 'connected';
      if (ok && dejaConnecte) recharger();
      if (ok) dejaConnecte = true;
      setConnecte(ok || etat === 'connecting' || etat === 'initialized');
    });
  }, [recharger]);
  useEffect(() => {
    if (connecte) return undefined;
    const minuterie = setInterval(() => {
      if (document.visibilityState === 'visible') recharger();
    }, 30000);
    return () => clearInterval(minuterie);
  }, [connecte, recharger]);

  const nonLues = useMemo(
    () => annonces.filter((a) => instant(a.created_at) > instant(luJusquA)),
    [annonces, luJusquA]
  );

  // Date de la plus récente annonce reçue (heure du serveur : pas de décalage avec l'horloge du poste)
  const marquerLues = useCallback(() => {
    if (annonces.length === 0) return;
    const nouvelle = annonces.reduce((max, a) => plusRecente(max, a.created_at), luJusquA);
    if (!nouvelle || nouvelle === luJusquA) return;
    setLuJusquA(nouvelle);
    ecrireLocal(cleLecture(userId), nouvelle);
    enregistrerLues({ annonces: nouvelle });
  }, [annonces, luJusquA, userId]);

  const valeur = useMemo(() => ({ actif: true, nonLues, marquerLues, ouvrir }), [nonLues, marquerLues, ouvrir]);

  return <NotificationAnnonceContext.Provider value={valeur}>{children}</NotificationAnnonceContext.Provider>;
};

export const useNotificationsAnnonces = () => useContext(NotificationAnnonceContext) || SANS_FOURNISSEUR;
