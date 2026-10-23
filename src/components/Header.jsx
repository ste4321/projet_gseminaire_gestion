import React from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { clearSession, getRole } from '../auth/session';
import { getConsultation, quitterConsultation } from '../auth/consultation';
import { ROLE_LABELS } from '../navigation';
import ChoixTheme from './ChoixTheme';
import ClocheAnnonces from './ClocheAnnonces';
import { fermerConnexion } from '../realtime';

const initiales = (nom) =>
  (nom || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('');

const Header = () => {
  const role = getRole();
  const nomPrenom = localStorage.getItem('nom_prenom') || '';

  const handleLogout = async () => {
    fermerConnexion();
    if (getConsultation()) {
      quitterConsultation();
      return;
    }
    try {
      // Révoque le jeton côté serveur
      await api.post('/logout');
    } catch (e) {
      // Jeton déjà expiré ou serveur injoignable : on déconnecte quand même
    } finally {
      clearSession();
      window.location.href = '/';
    }
  };

  const toggleSidebar = () => document.body.classList.toggle('layout-menu-expanded');

  return (
    <nav
      className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
      id="layout-navbar"
    >
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
        <button
          type="button"
          className="nav-item nav-link px-0 me-xl-4 btn border-0 bg-transparent"
          onClick={toggleSidebar}
          aria-label="Ouvrir le menu"
        >
          <i className="bx bx-menu bx-sm"></i>
        </button>
      </div>

      <div className="navbar-nav-right d-flex align-items-center" id="navbar-collapse">
        <ul className="navbar-nav flex-row align-items-center ms-auto">
          <li className="nav-item me-2">
            <ChoixTheme />
          </li>
          <li className="nav-item me-2">
            <ClocheAnnonces />
          </li>
          <li className="nav-item navbar-dropdown dropdown-user dropdown">
            <button
              className="nav-link dropdown-toggle hide-arrow btn border-0 bg-transparent d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Menu du compte"
            >
              <span className="d-none d-md-block text-end lh-sm">
                <span className="d-block fw-semibold text-body">{nomPrenom}</span>
                <small className="text-muted">{ROLE_LABELS[role]}</small>
              </span>
              <span className="avatar avatar-online">
                <span className="avatar-initial rounded-circle bg-label-primary">{initiales(nomPrenom)}</span>
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li className="d-md-none">
                <div className="dropdown-item-text">
                  <span className="fw-semibold d-block">{nomPrenom}</span>
                  <small className="text-muted">{ROLE_LABELS[role]}</small>
                </div>
              </li>
              <li className="d-md-none"><hr className="dropdown-divider" /></li>
              <li>
                <Link className="dropdown-item" to="/changer-mot-de-passe">
                  <i className="bx bx-lock-alt me-2"></i>
                  <span className="align-middle">Changer mon mot de passe</span>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button type="button" className="dropdown-item" onClick={handleLogout}>
                  <i className="bx bx-power-off me-2"></i>
                  <span className="align-middle">Se déconnecter</span>
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
