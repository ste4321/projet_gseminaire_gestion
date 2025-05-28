import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
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
          <NavLink to="/admin/dashboard" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-home-circle"></i>
            <div>Tableau de bord</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/info" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>Info</div>
          </NavLink>
        </li>
        {/* Ajoute d'autres items ici */}
      </ul>
    </aside>
  );
};

export default AdminSidebar;
