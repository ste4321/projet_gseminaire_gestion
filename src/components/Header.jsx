import React, { useEffect, useState } from 'react';

const Header = () => {
  const [role, setRole] = useState('');
  const [nom_prenom, setNom_prenom] = useState('');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedNomPrenom = localStorage.getItem('nom_prenom');
    if (storedRole) setRole(storedRole);
    if (storedNomPrenom) setNom_prenom(storedNomPrenom);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const toggleSidebar = () => {
    const body = document.body;
    body.classList.toggle('layout-menu-expanded');
  };

  return (
    <nav
      className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
      id="layout-navbar"
    >
      {/* Bouton menu burger pour mobile */}
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
        <button
          className="nav-item nav-link px-0 me-xl-4 btn border-0 bg-transparent"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="bx bx-menu bx-sm"></i>
        </button>
      </div>

      <div className="navbar-nav-right d-flex align-items-center" id="navbar-collapse">
        <div className="navbar-nav align-items-center">
          <div className="nav-item d-flex align-items-center">
            <i className="bx bx-search fs-4 lh-0"></i>
            <input
              type="text"
              className="form-control border-0 shadow-none"
              placeholder="Search..."
              aria-label="Search..."
            />
          </div>
        </div>

        <ul className="navbar-nav flex-row align-items-center ms-auto">
          <li className="nav-item navbar-dropdown dropdown-user dropdown">
            <button 
              className="nav-link dropdown-toggle hide-arrow btn border-0 bg-transparent"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="User menu"
            >
              <div className="avatar avatar-online">
                <img
                  src="../assets/img/avatars/1.png"
                  alt="User avatar"
                  className="w-px-40 h-auto rounded-circle"
                />
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <div className="dropdown-item">
                  <div className="d-flex">
                    <div className="flex-shrink-0 me-3">
                      <div className="avatar avatar-online">
                        <img
                          src="../assets/img/avatars/1.png"
                          alt=""
                          className="w-px-40 h-auto rounded-circle"
                        />
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <span className="fw-semibold d-block">{nom_prenom}</span>
                      <small className="text-muted text-capitalize">{role}</small>
                    </div>
                  </div>
                </div>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  <i className="bx bx-power-off me-2"></i>
                  <span className="align-middle">Déconnexion</span>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Header;