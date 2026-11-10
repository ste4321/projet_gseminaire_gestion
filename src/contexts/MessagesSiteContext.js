// Messages du formulaire « Contactez-nous » du site vitrine, pour l'administration :
// - en direct (WebSocket, canal privé « administration », voir realtime.js) : un message reçu, lu, répondu
//   ou supprimé met à jour la cloche, le menu et la page « Messages du site » sans recharger ;
// - un nouveau message est aussi signalé par une notification en bas de l'écran ;
// - sans connexion temps réel : actualisation toutes les 30 secondes, en attendant qu'elle revienne.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useFeedback } from './FeedbackContext';
import { ecouterCanalPrive, onConnectionChange } from '../realtime';

export const PAGE_MESSAGES = '/admin/messages';
const COMPTEURS_VIDES = { tous: 0, non_lus: 0, non_repondus: 0 };
const SANS_FOURNISSEUR = {
  actif: false, nonLus: [], compteurs: COMPTEURS_VIDES, evenement: null,
  ouvrir: () => {}, toutMarquerLu: () => {}, recharger: () => {},
};

const extrait = (texte, max = 90) => {
  const t = String(texte || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

const MessagesSiteContext = createContext(null);

export const MessagesSiteProvider = ({ children }) => {
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [nonLus, setNonLus] = useState([]); // les plus récents non lus (une page), pour la cloche
  const [compteurs, setCompteurs] = useState(COMPTEURS_VIDES);
  // Dernier événement reçu en direct : la page « Messages du site » s'y abonne pour se mettre à jour
  const [evenement, setEvenement] = useState(null);
  const numero = useRef(0);

  const recharger = useCallback(async () => {
    const moi = ++numero.current;
    try {
      const res = await api.get('/contacts', { params: { filtre: 'non_lus' } });
      if (moi !== numero.current) return; // réponse dépassée
      setNonLus(res.data.data);
      setCompteurs(res.data.compteurs);
    } catch {
      // Silencieux : la cloche garde son état, la page Messages affiche ses propres erreurs
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  /** Ouvre la page Messages, et le message s'il est précisé */
  const ouvrir = useCallback((id) => navigate(PAGE_MESSAGES, { state: id ? { message: id } : undefined }), [navigate]);

  // Direct : message reçu, modifié ou supprimé (par un visiteur, ou par un autre administrateur)
  useEffect(
    () => ecouterCanalPrive('administration', 'contact.maj', ({ action, message, compteurs: aJour }) => {
      numero.current += 1; // une lecture en cours ne doit pas écraser cet état plus récent
      setCompteurs(aJour);
      setNonLus((liste) => {
        const sans = liste.filter((m) => m.id !== message.id);
        if (action === 'supprime' || message.lu_le) return sans;
        return [message, ...sans].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
      setEvenement({ action, message, n: Date.now() });
      if (action === 'recu') {
        notify.annonce(null, {
          title: message.name,
          meta: `Message du site · ${extrait(message.message, 60)}`,
          icone: 'bx-envelope',
          action: { label: 'Lire', onClick: () => ouvrir(message.id) },
        });
      }
      // « Tout marquer comme lu » fait ailleurs : un seul signal, la liste est relue
      if (action === 'modifie' && aJour.non_lus === 0) setNonLus([]);
    }),
    [notify, ouvrir]
  );

  // Connexion rétablie : rattrape ce qui a pu être manqué. Sans connexion : relecture toutes les 30 s.
  const [connecte, setConnecte] = useState(true);
  useEffect(() => {
    let dejaConnecte = false;
    return onConnectionChange((etat) => {
      const ok = etat === 'connected';
      if (ok && dejaConnecte) {
        recharger();
        setEvenement({ action: 'reconnexion', message: null, n: Date.now() });
      }
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

  const toutMarquerLu = useCallback(async () => {
    setNonLus([]);
    setCompteurs((c) => ({ ...c, non_lus: 0 }));
    try {
      await api.post('/contacts/lus');
      setEvenement({ action: 'modifie', message: null, n: Date.now() });
    } catch {
      notify.error('Impossible de marquer les messages comme lus.');
      recharger();
    }
  }, [notify, recharger]);

  const valeur = useMemo(
    () => ({ actif: true, nonLus, compteurs, evenement, ouvrir, toutMarquerLu, recharger }),
    [nonLus, compteurs, evenement, ouvrir, toutMarquerLu, recharger]
  );

  return <MessagesSiteContext.Provider value={valeur}>{children}</MessagesSiteContext.Provider>;
};

/** Hors de l'espace administrateur : inactif (pas de cloche de messages) */
export const useMessagesSite = () => useContext(MessagesSiteContext) || SANS_FOURNISSEUR;
