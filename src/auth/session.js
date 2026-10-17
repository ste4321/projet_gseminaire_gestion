// Gestion de la session côté navigateur.
// Le jeton ne donne aucun droit à lui seul : le backend vérifie le rôle à chaque requête.
// Les valeurs stockées ici ne servent qu'à l'affichage et à la navigation.

const KEYS = ['token', 'user', 'role', 'nom_prenom', 'expires_at', 'loginTime'];

export const saveSession = ({ access_token, expires_at, user }) => {
  localStorage.setItem('token', access_token);
  localStorage.setItem('expires_at', expires_at || '');
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('role', user.role);
  localStorage.setItem('nom_prenom', user.nom_prenom || '');
  localStorage.setItem('loginTime', new Date().toISOString());
};

export const clearSession = () => {
  KEYS.forEach((k) => localStorage.removeItem(k));
};

export const getToken = () => localStorage.getItem('token');

export const getRole = () => localStorage.getItem('role');

export const isSessionValid = () => {
  const token = getToken();
  if (!token) return false;

  const expiresAt = localStorage.getItem('expires_at');
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearSession();
    return false;
  }
  return true;
};

export const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  prof: '/prof/dashboard',
  etudiant: '/etudiant/dashboard',
};

export const CHANGE_PASSWORD_PATH = '/changer-mot-de-passe';

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch (e) {
    return null;
  }
};

// Mot de passe provisoire : l'utilisateur doit le remplacer avant d'accéder à son espace
export const mustChangePassword = () => !!getUser()?.must_change_password;

export const setMustChangePassword = (value) => {
  const user = getUser();
  if (user) {
    localStorage.setItem('user', JSON.stringify({ ...user, must_change_password: value }));
  }
};
