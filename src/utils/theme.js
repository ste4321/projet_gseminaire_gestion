import { useEffect, useState } from 'react';

// Thème de l'application : 'clair', 'sombre' ou 'systeme' (suit le réglage de l'ordinateur / du téléphone).
// Le choix est gardé dans ce navigateur. Il s'applique par <html data-theme-mode="dark|light">,
// que lit styles/sombre.css. public/index.html applique le même choix avant le premier affichage
// (pas de flash blanc) : garder CLE et la logique alignées avec ce script.

export const CLE_THEME = 'gstf-theme';
export const THEMES = [
  { valeur: 'clair', label: 'Clair', icone: 'bx-sun' },
  { valeur: 'sombre', label: 'Sombre', icone: 'bx-moon' },
  { valeur: 'systeme', label: 'Comme le système', icone: 'bx-desktop' },
];
const EVENEMENT = 'gstf-theme';
const COULEUR_BARRE = { clair: '#8c2f39', sombre: '#18171d' };

const media = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export const lirePreference = () => {
  try {
    const valeur = localStorage.getItem(CLE_THEME);
    return THEMES.some((t) => t.valeur === valeur) ? valeur : 'systeme';
  } catch {
    return 'systeme'; // stockage bloqué (navigation privée…) : on suit le système
  }
};

/** Mode réellement affiché : 'clair' ou 'sombre' */
export const modeEffectif = (preference = lirePreference()) =>
  preference === 'systeme' ? (media()?.matches ? 'sombre' : 'clair') : preference;

const appliquer = (preference) => {
  const mode = modeEffectif(preference);
  const html = document.documentElement;
  // Pas de transitions pendant le basculement : tout change d'un coup, sans clignotement
  html.classList.add('gstf-theme-transition');
  html.setAttribute('data-theme-mode', mode === 'sombre' ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[mode]);
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('gstf-theme-transition')));
};

export const choisirTheme = (preference) => {
  try {
    localStorage.setItem(CLE_THEME, preference);
  } catch {
    // stockage bloqué : le choix vaut pour cette visite seulement
  }
  appliquer(preference);
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: preference }));
};

/** À appeler une fois au démarrage : applique le choix et suit les changements du système */
export const initialiserTheme = () => {
  appliquer(lirePreference());
  media()?.addEventListener?.('change', () => {
    if (lirePreference() === 'systeme') appliquer('systeme');
  });
  // Choix fait dans un autre onglet : appliqué ici aussi
  window.addEventListener('storage', (e) => {
    if (e.key === CLE_THEME) {
      appliquer(lirePreference());
      window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: lirePreference() }));
    }
  });
};

/** { preference, mode, choisir } — se met à jour quand le thème change (ici, autre onglet ou système) */
export const useTheme = () => {
  const [preference, setPreference] = useState(lirePreference);
  const [mode, setMode] = useState(() => modeEffectif());

  useEffect(() => {
    const maj = () => {
      setPreference(lirePreference());
      setMode(modeEffectif());
    };
    window.addEventListener(EVENEMENT, maj);
    const m = media();
    m?.addEventListener?.('change', maj);
    return () => {
      window.removeEventListener(EVENEMENT, maj);
      m?.removeEventListener?.('change', maj);
    };
  }, []);

  return { preference, mode, choisir: choisirTheme };
};
