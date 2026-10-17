// Client HTTP unique de l'application : toutes les requêtes vers l'API passent ici.
// - ajoute automatiquement le jeton d'authentification
// - redirige vers la page de connexion si la session a expiré (401)
import axios from 'axios';
import { API_URL } from '../config';
import { clearSession, getToken } from '../auth/session';

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

    if (status === 401 && !isLoginRequest) {
      clearSession();
      if (window.location.pathname !== '/') {
        window.location.assign('/?session=expiree');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Message lisible à afficher à l'utilisateur : celui renvoyé par l'API, sinon un message par défaut
export const errorMessage = (error, fallback = 'Une erreur est survenue.') =>
  error?.response?.data?.message || fallback;
