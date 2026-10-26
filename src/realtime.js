// Connexion WebSocket au serveur Laravel Reverb (protocole Pusher).
// Sans clé configurée (REACT_APP_REVERB_KEY vide), le direct est désactivé :
// les nouvelles annonces apparaissent alors au prochain chargement de la page.
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './api/client';

const KEY = process.env.REACT_APP_REVERB_KEY;
const SCHEME = process.env.REACT_APP_REVERB_SCHEME || 'https';

let echo = null;

export const realtimeEnabled = Boolean(KEY);

let avertissementAffiche = false;

export const getEcho = () => {
  if (!realtimeEnabled) {
    if (!avertissementAffiche) {
      avertissementAffiche = true;
      // Variables lues au démarrage seulement : relancer `npm start` après avoir modifié le .env
      console.warn('[GSTF] Direct désactivé : REACT_APP_REVERB_KEY est vide. Les annonces sont actualisées toutes les 30 s.');
    }
    return null;
  }
  if (!echo) {
    window.Pusher = Pusher;
    const port = Number(process.env.REACT_APP_REVERB_PORT) || (SCHEME === 'https' ? 443 : 80);
    echo = new Echo({
      broadcaster: 'reverb',
      key: KEY,
      wsHost: process.env.REACT_APP_REVERB_HOST || window.location.hostname,
      wsPort: port,
      wssPort: port,
      forceTLS: SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      // Canaux privés : autorisation demandée à l'API avec le jeton de la session en cours
      // (client HTTP commun, donc toujours le jeton à jour)
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          api
            .post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name }, { sansRedirection: true })
            .then((res) => callback(null, res.data))
            .catch((err) => callback(err, null));
        },
      }),
    });
  }
  return echo;
};

/** État de la connexion : 'connected', 'connecting', 'unavailable', 'disconnected'… ('desactive' sans clé) */
export const onConnectionChange = (callback) => {
  const instance = getEcho();
  if (!instance) {
    callback('desactive');
    return () => {};
  }
  const connection = instance.connector.pusher.connection;
  const handler = ({ current }) => {
    if (current === 'unavailable') {
      console.warn(`[GSTF] Serveur temps réel injoignable (${process.env.REACT_APP_REVERB_HOST}:${process.env.REACT_APP_REVERB_PORT}). Reverb est-il démarré ? (php artisan reverb:start)`);
    }
    callback(current);
  };
  connection.bind('state_change', handler);
  callback(connection.state);
  return () => connection.unbind('state_change', handler);
};

/** Écoute un événement sur le canal privé de l'utilisateur ; renvoie la fonction d'arrêt */
export const ecouterUtilisateur = (userId, evenement, callback) => {
  const instance = getEcho();
  if (!instance || !userId) return () => {};
  const nom = `App.Models.User.${userId}`;
  const canal = instance.private(nom);
  canal.listen(`.${evenement}`, callback);
  canal.error((erreur) => console.warn(`[GSTF] Abonnement au canal ${nom} refusé`, erreur));
  return () => {
    canal.stopListening(`.${evenement}`, callback);
    instance.leave(nom);
  };
};

/** Fermeture de la connexion (déconnexion de l'utilisateur) */
export const fermerConnexion = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
};
