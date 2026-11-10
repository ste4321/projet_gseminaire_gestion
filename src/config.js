// URL de l'API Laravel (projet_gseminaire_backend).
// Définie par environnement dans .env.development / .env.production
// (ou surchargée localement dans .env.local, non versionné).
const API_URL_CONFIG = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

// Adresse locale (127.0.0.1 / localhost) : elle ne désigne que la machine qui l'appelle.
// Si l'application est ouverte depuis un autre appareil du réseau (ex : téléphone sur
// http://192.168.1.230:3000), on vise le même PC que celui qui sert la page.
const ADRESSES_LOCALES = ['127.0.0.1', 'localhost'];
export const versHoteDeLaPage = (hote) =>
  ADRESSES_LOCALES.includes(hote) && !ADRESSES_LOCALES.includes(window.location.hostname)
    ? window.location.hostname
    : hote;

const adapterAuReseau = (url) => {
  try {
    const u = new URL(url);
    u.hostname = versHoteDeLaPage(u.hostname);
    return u.toString().replace(/\/+$/, '');
  } catch {
    return url;
  }
};

export const API_URL = adapterAuReseau(API_URL_CONFIG);

// Racine du backend, pour les fichiers publics (ex : /storage/edt/xxx.jpg)
export const BACKEND_URL = API_URL.replace(/\/api$/, '');

// Chemin enregistré par le serveur (« /storage/annonces/x.pdf ») → adresse complète sur le serveur de l'API.
// Une adresse déjà complète (anciennes annonces) est gardée telle quelle.
export const storageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
