import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar, { closeSidebar } from '../components/Sidebar';
import Footer from '../components/Footer';
import BandeauConsultation from '../components/BandeauConsultation';
import { NotificationAnnonceProvider } from '../contexts/NotificationAnnonceContext';
import useScripts from '../hooks/useScripts';
import { getRole } from '../auth/session';
import { pageTitle } from '../navigation';

// Scripts du thème (menus déroulants, modales Bootstrap, défilement du menu)
const THEME_SCRIPTS = [
  '/assets/vendor/libs/jquery/jquery.js',
  '/assets/vendor/libs/popper/popper.js',
  '/assets/vendor/js/bootstrap.js',
  '/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js',
  '/assets/vendor/js/menu.js',
  '/assets/js/main.js',
];

/** Structure commune aux trois espaces (admin, prof, étudiant) : menu, en-tête, contenu, pied de page. */
const AppShell = () => {
  useScripts(THEME_SCRIPTS);
  const { pathname } = useLocation();

  // Titre de l'onglet du navigateur
  useEffect(() => {
    const titre = pageTitle(getRole(), pathname);
    document.title = titre ? `${titre} · GSTF` : 'GSTF | Grand Séminaire de Théologie Faliarivo';
    closeSidebar();
  }, [pathname]);

  return (
    // Notifications d'annonces en direct (enseignants et étudiants)
    <NotificationAnnonceProvider>
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <Sidebar />
          <div className="layout-page">
            <BandeauConsultation />
            <Header />
            <div className="content-wrapper">
              <main className="flex-grow-1">
                <Outlet />
              </main>
              <Footer />
            </div>
          </div>
          <div className="layout-overlay layout-menu-toggle" onClick={closeSidebar} aria-hidden="true" />
        </div>
      </div>
    </NotificationAnnonceProvider>
  );
};

export default AppShell;
