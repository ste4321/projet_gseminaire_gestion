import React from 'react';
import { THEMES, useTheme } from '../utils/theme';

/**
 * Bouton soleil / lune ouvrant le choix du thème : Clair, Sombre, Comme le système.
 * Utilisé dans la barre du haut et sur la page de connexion.
 */
const ChoixTheme = ({ className = '' }) => {
  const { preference, mode, choisir } = useTheme();

  return (
    <div className={`dropdown ${className}`}>
      <button
        type="button"
        className="btn btn-icon border-0 bg-transparent nav-link px-2"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title="Thème d'affichage"
        aria-label={`Thème d'affichage : ${THEMES.find((t) => t.valeur === preference)?.label}`}
      >
        <i className={`bx ${mode === 'sombre' ? 'bx-moon' : 'bx-sun'} bx-sm`}></i>
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li><h6 className="dropdown-header">Thème d'affichage</h6></li>
        {THEMES.map((t) => (
          <li key={t.valeur}>
            <button
              type="button"
              className={`dropdown-item d-flex align-items-center ${preference === t.valeur ? 'active' : ''}`}
              aria-pressed={preference === t.valeur}
              onClick={() => choisir(t.valeur)}
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
