import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import useScripts from '../hooks/useScripts';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { EtudiantProvider } from '../contexts/EtudiantContext';

function AdminLayout() {
  useScripts([
    "/assets/vendor/libs/jquery/jquery.js",
    "/assets/vendor/libs/popper/popper.js",
    "/assets/vendor/js/bootstrap.js",
    "/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js",
    "/assets/vendor/js/menu.js",
    "/assets/vendor/libs/apex-charts/apexcharts.js",
    "/assets/js/main.js",
    "/assets/js/dashboards-analytics.js",
  ]);

  return (
    <ProfProvider>
      <EmploiProvider>
        <EtudiantProvider>
          <div className="layout-wrapper layout-content-navbar">
            <div className="layout-container">
              <Sidebar />
              <div className="layout-page">
                <Header />
                <Outlet />
                <div className="layout-overlay layout-menu-toggle"></div>
              </div>
            </div>
          </div>
        </EtudiantProvider>
      </EmploiProvider>
    </ProfProvider>
  );
}

export default AdminLayout;
