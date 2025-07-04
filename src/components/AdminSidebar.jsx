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
        <li className="menu-item">
          <NavLink to="/admin/edt" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-calendar"></i>
            <div>Emploi du temps</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/listeProf" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-user"></i>
            <div>Enseignant</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/noteEtudiant" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bxs-edit-alt"></i>
            <div>Notes</div>
          </NavLink>
        </li>
        {/* <li className="menu-item">
          <NavLink to="/admin/inscriptionEtudiant" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bx-group"></i>
            <div>Inscription</div>
          </NavLink>
        </li> */}
        {/* Ajoute d'autres items ici */}
        <li className="menu-item">
          <NavLink to="/admin/annonce" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <i className="menu-icon tf-icons bx bxs-message-detail"></i>
            <div>Annonce</div>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};

export default AdminSidebar;
