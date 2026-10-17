// URL de l'API Laravel (projet_gseminaire_backend).
// Définie par environnement dans .env.development / .env.production
// (ou surchargée localement dans .env.local, non versionné).
export const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

// Racine du backend, pour les fichiers publics (ex : /storage/edt/xxx.jpg)
export const BACKEND_URL = API_URL.replace(/\/api$/, '');

export const storageUrl = (path) => (path ? `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}` : '');
