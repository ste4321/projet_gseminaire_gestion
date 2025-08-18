import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
  const closeSidebar = () => {
    const body = document.body;
    const menu = document.getElementById('layout-menu');

    if (body.classList.contains('layout-menu-expanded')) {
      body.classList.remove('layout-menu-expanded');
      menu?.classList.remove('show');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const menu = document.getElementById('layout-menu');
      const toggle = document.querySelector('.layout-menu-toggle');

      if (
        window.innerWidth < 1200 &&
        !menu?.contains(e.target) &&
        !toggle?.contains(e.target)
      ) {
        closeSidebar();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
      <div className="app-brand demo">
        <div className="app-brand-link">
          <span className="app-brand-logo demo">
            <img src="/images/Sainte.jpg" alt="Logo de G.S.T.F" width="40" />
          </span>
          <span className="app-brand-text demo menu-text fw-bolder ms-2">G.S.T.F</span>
        </div>
      </div>

      <ul className="menu-inner py-1">
        <li className="menu-item">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-home"></i>
            <div>Tableau de bord</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/info" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-info-circle"></i>
            <div>Info</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/edt" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-calendar-event"></i>
            <div>Emploi du temps</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/listeProf" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-user"></i>
            <div>Enseignant</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/noteEtudiant" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-spreadsheet"></i>
            <div>Notes</div>
          </NavLink>
        </li>
        {/* <li className="menu-item">
          <NavLink to="/admin/niveau" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-layer"></i>
            <div>Niveau</div>
          </NavLink>
        </li> */}
        <li className="menu-item">
          <NavLink to="/admin/annonce" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-message-square-dots"></i>
            <div>Annonce</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/matiere" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-book"></i>
            <div>Matière</div>
          </NavLink>
        </li>
        {/* <li className="menu-item">
          <NavLink to="/admin/semestre" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-calendar-check"></i>
            <div>Semestre</div>
          </NavLink>
        </li> */}
        <li className="menu-item">
          <NavLink to="/admin/listeEtudiant" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-group"></i>
            <div>Etudiant</div>
          </NavLink>
        </li>
        <li className="menu-item">
          <NavLink to="/admin/portal" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="menu-icon tf-icons bx bx-door-open"></i>
            <div>Portal</div>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};

export default AdminSidebar;
