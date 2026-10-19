// Client HTTP unique de l'application : toutes les requêtes vers l'API passent ici.
// - ajoute automatiquement le jeton d'authentification
// - redirige vers la page de connexion si la session a expiré (401)
import axios from 'axios';
import { API_URL } from '../config';
import { clearSession, getToken, setMustChangePassword, CHANGE_PASSWORD_PATH, getConsultation, terminerConsultation } from '../auth/session';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.endsWith('/login');

    // Consultation expirée (1 h) : retour à la session de l'administrateur
    if (status === 401 && getConsultation() && !error.config?.sansRedirection) {
      const retour = terminerConsultation();
      window.location.assign(retour ? `${retour}${retour.includes('?') ? '&' : '?'}consultation=expiree` : '/?session=expiree');
      return Promise.reject(error);
    }

    if (status === 401 && !isLoginRequest) {
      clearSession();
      if (window.location.pathname !== '/') {
        window.location.assign('/?session=expiree');
      }
    }

    // Le serveur exige le remplacement du mot de passe provisoire
    if (status === 403 && error.response?.data?.error_type === 'password_change_required') {
      setMustChangePassword(true);
      if (window.location.pathname !== CHANGE_PASSWORD_PATH) {
        window.location.assign(CHANGE_PASSWORD_PATH);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Requête annulée volontairement (filtre changé, page quittée) : ce n'est pas une erreur à afficher
export const estAnnulee = (error) => error?.code === 'ERR_CANCELED';

// Message lisible à afficher à l'utilisateur : celui renvoyé par l'API, sinon un message par défaut
export const errorMessage = (error, fallback = 'Une erreur est survenue.') =>
  error?.response?.data?.message || fallback;
