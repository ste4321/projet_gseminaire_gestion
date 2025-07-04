import React from 'react';
import { NavLink } from 'react-router-dom';

const ProfSidebar = () => {
  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
      <div className="app-brand demo">
        <a className="app-brand-link">
          <span className="app-brand-logo demo">
            <img src="/images/Sainte.jpg" alt="Logo de G.S.T.F" width="40" />
          </span>
          <span className="app-brand-text demo menu-text fw-bolder ms-2">G.S.T.F</span>
        </a>
      </div>

      <ul className="menu-inner py-1">
        <li className="menu-item">
          <NavLink to="/prof/dashboard" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-home-circle"></i>
            <div>Accueil Prof</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/prof/cours" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>Mes Cours</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/prof/annonce" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-group"></i>
            <div>Annonce</div>
          </NavLink>
        </li>
        {/* Ajoute d'autres items ici */}
      </ul>
    </aside>
  );
};

export default ProfSidebar;
