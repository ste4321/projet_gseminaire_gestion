import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  // const navigate = useNavigate();

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    const storedRole = localStorage.getItem('role');

    if (storedEmail) setEmail(storedEmail);
    if (storedRole) setRole(storedRole);
  }, []);

  const handleLogout = () => {
    // Supprimer les infos stockées
    localStorage.clear();
    // Rediriger vers la page de login
    window.location.href = '/';
  };


  return (
    <>
    <nav
            className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
            id="layout-navbar"
          >
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
              <a className="nav-item nav-link px-0 me-xl-4" href="javascript:void(0)">
                <i className="bx bx-menu bx-sm"></i>
              </a>
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
        {/* ... */}
        <li className="nav-item navbar-dropdown dropdown-user dropdown">
          <a className="nav-link dropdown-toggle hide-arrow" href="#" data-bs-toggle="dropdown">
            <div className="avatar avatar-online">
              <img src="../assets/img/avatars/1.png" alt="avatar" className="w-px-40 h-auto rounded-circle" />
            </div>
          </a>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <a className="dropdown-item" href="#">
                <div className="d-flex">
                  <div className="flex-shrink-0 me-3">
                    <div className="avatar avatar-online">
                      <img src="../assets/img/avatars/1.png" alt className="w-px-40 h-auto rounded-circle" />
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <span className="fw-semibold d-block">{email}</span>
                    <small className="text-muted text-capitalize">{role}</small>
                  </div>
                </div>
              </a>
            </li>

            {/* ... autres éléments du menu ... */}

            <li>
              <div className="dropdown-divider"></div>
            </li>
            <li>
              <button className="dropdown-item" onClick={handleLogout}>
                <i className="bx bx-power-off me-2"></i>
                <span className="align-middle">Log Out</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
            </div>
          </nav>
        </>
  );
};

export default Header;