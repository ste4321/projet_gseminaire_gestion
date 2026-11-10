import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getRole } from '../auth/session';
import { MENUS } from '../navigation';

// Ferme le menu en mobile. La classe est posée à deux endroits : sur <body> par le bouton du Header,
// et sur <html> par le script du thème (assets/js/main.js, branché sur tout .layout-menu-toggle).
// Il faut retirer les deux, sinon le menu reste ouvert après avoir choisi une page.
export const closeSidebar = () => {
  document.body.classList.remove('layout-menu-expanded');
  document.documentElement.classList.remove('layout-menu-expanded');
};

const Sidebar = () => {
  const menu = MENUS[getRole()] || [];

  // Échap ferme le menu mobile
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeSidebar();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme" aria-label="Menu principal">
      <div className="app-brand demo">
        <div className="app-brand-link">
          <span className="app-brand-logo demo">
            <img src="/images/Sainte.jpg" alt="" width="40" height="40" className="rounded-circle gstf-avatar-sainte" />
          </span>
          <span className="app-brand-text demo menu-text fw-bolder ms-2 gstf-brand">
            GSTF
            <span className="gstf-brand-sub">Grand Séminaire Faliarivo</span>
          </span>
        </div>
        <button
          type="button"
          className="layout-menu-toggle menu-link text-large ms-auto d-xl-none btn border-0 bg-transparent"
          onClick={closeSidebar}
          aria-label="Fermer le menu"
        >
          <i className="bx bx-chevron-left bx-sm align-middle"></i>
        </button>
      </div>

      <div className="menu-inner-shadow"></div>

      <ul className="menu-inner py-1">
        {menu.map((item) =>
          item.section ? (
            <li key={item.section} className="menu-header small text-uppercase">
              <span className="menu-header-text">{item.section}</span>
            </li>
          ) : (
            <li key={item.to} className="menu-item">
              <NavLink
                to={item.to}
                className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <i className={`menu-icon tf-icons bx ${item.icon}`} aria-hidden="true"></i>
                <div>{item.label}</div>
              </NavLink>
            </li>
          )
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;
