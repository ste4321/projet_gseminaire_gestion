import React, { useEffect, useRef, useState } from 'react';
import { THEMES, useTheme } from '../utils/theme';

/**
 * Bouton soleil / lune ouvrant le choix du thème : Clair, Sombre, Comme le système.
 * Utilisé dans la barre du haut et sur la page de connexion.
 * Ouverture gérée ici et non par Bootstrap (data-bs-toggle) : bootstrap.js n'est chargé
 * qu'une fois connecté (AppShell), le menu doit aussi marcher sur la page de connexion.
 */
const ChoixTheme = ({ className = '' }) => {
  const { preference, mode, choisir } = useTheme();
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef(null);

  // Fermeture : clic ailleurs ou Échap
  useEffect(() => {
    if (!ouvert) return undefined;
    const clicDehors = (e) => !racine.current?.contains(e.target) && setOuvert(false);
    const echap = (e) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('pointerdown', clicDehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', clicDehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  return (
    <div className={`dropdown ${className}`} ref={racine}>
      <button
        type="button"
        className={`btn btn-icon border-0 bg-transparent nav-link px-2 ${ouvert ? 'show' : ''}`}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="true"
        title="Thème d'affichage"
        aria-label={`Thème d'affichage : ${THEMES.find((t) => t.valeur === preference)?.label}`}
      >
        <i className={`bx ${mode === 'sombre' ? 'bx-moon' : 'bx-sun'} bx-sm`}></i>
      </button>
      <ul className={`dropdown-menu dropdown-menu-end gstf-choix-theme ${ouvert ? 'show' : ''}`}>
        <li><h6 className="dropdown-header">Thème d'affichage</h6></li>
        {THEMES.map((t) => (
          <li key={t.valeur}>
            <button
              type="button"
              className={`dropdown-item d-flex align-items-center ${preference === t.valeur ? 'active' : ''}`}
              aria-pressed={preference === t.valeur}
              onClick={() => {
                choisir(t.valeur);
                setOuvert(false);
              }}
            >
              <i className={`bx ${t.icone} me-2`}></i>
              <span className="flex-grow-1">{t.label}</span>
              {preference === t.valeur && <i className="bx bx-check ms-2"></i>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChoixTheme;
