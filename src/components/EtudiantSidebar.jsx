import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAnnonce } from '../contexts/AnnonceContext';

const EtudiantSidebar = () => {
  const { unreadCount } = useAnnonce();

  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
      <div className="app-brand demo">
        <a className="app-brand-link">
          <span className="app-brand-logo demo">
            <img src="/images/sainte.jpg" alt="Logo de G.S.T.F" width="40" />
          </span>
          <span className="app-brand-text demo menu-text fw-bolder ms-2">G.S.T.F</span>
        </a>
      </div>

      <ul className="menu-inner py-1">
        <li className="menu-item">
          <NavLink to="/etudiant/dashboard" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-home-circle"></i>
            <div>Accueil Étudiant</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/etudiant/edt" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>Emploi du temps</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/etudiant/listeProf" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>Enseignant</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/etudiant/annonce" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>
              Annonces
              {unreadCount > 0 && <span className="badge bg-danger ms-2">{unreadCount}</span>}
            </div>
          </NavLink>
        </li>
        {/* Ajoute d'autres items ici */}
      </ul>
    </aside>
  );
};

export default EtudiantSidebar;
