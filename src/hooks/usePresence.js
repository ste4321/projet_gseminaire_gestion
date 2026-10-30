// Signal de présence : tant que l'application est ouverte, le serveur sait que la personne est « En ligne »
// (page « Comptes et accès »). Envoyé toutes les 45 s et dès le retour sur l'onglet ; au-delà de 2 min sans
// signal (onglet fermé, ordinateur en veille), le compte repasse hors ligne. Une déconnexion est immédiate.
// Rien n'est envoyé pendant une consultation par l'administration : ce n'est pas la personne qui est là.
import { useEffect } from 'react';
import api from '../api/client';
import { getConsultation } from '../auth/session';

const INTERVALLE = 45 * 1000;

const signaler = () => {
  if (getConsultation()) return;
  api.post('/presence').catch(() => {}); // sans conséquence : le prochain signal rattrapera
};

const usePresence = () => {
  useEffect(() => {
    signaler();
    const minuterie = setInterval(signaler, INTERVALLE);
    const auRetour = () => document.visibilityState === 'visible' && signaler();
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, []);
};

export default usePresence;
