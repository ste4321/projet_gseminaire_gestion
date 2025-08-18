import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import useScripts from '../hooks/useScripts';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { EtudiantProvider } from '../contexts/EtudiantContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';
import { StatsProvider } from '../contexts/StatsContext';
import { InfoProvider } from '../contexts/InfoContext';
import { NiveauProvider } from '../contexts/NiveauContext';
import { MatiereProvider } from '../contexts/MatiereContext';
import { SemestreProvider } from '../contexts/SemestreContext';
import { AnneeProvider } from '../contexts/AnneeContext';
import { EtudiantParcoursProvider} from '../contexts/EtudiantParcoursContext';
import { UserCessionProvider } from '../contexts/UserCessionContext';


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
  <EtudiantParcoursProvider>
    <AnneeProvider>
      <SemestreProvider>
        <MatiereProvider>
          <NiveauProvider>
            <StatsProvider>
              <AnnonceProvider>
                <ProfProvider>
                  <EmploiProvider>
                    <EtudiantProvider>
                     <UserCessionProvider>  
                        <InfoProvider>
                        <style>
                          {`
                            /* ✅ Transition mobile uniquement */
                            @media (max-width: 1199.98px) {
                              #layout-menu {
                                position: fixed;
                                top: 0;
                                left: 0;
                                height: 100vh;
                                width: 260px;
                                background-color: #fff;
                                z-index: 1060;
                                transition: transform 0.3s ease-in-out;
                                box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                              }

                              /* Menu masqué sur mobile */
                              body:not(.layout-menu-expanded) #layout-menu {
                                transform: translateX(-100%);
                              }

                              /* Menu visible sur mobile */
                              body.layout-menu-expanded #layout-menu {
                                transform: translateX(0);
                              }

                              /* ✅ Le header reste en place, pas de transformation */
                              #layout-navbar {
                                position: relative;
                                z-index: 1030;
                              }

                              /* Overlay visible uniquement en mobile */
                              .layout-overlay {
                                display: block;
                                position: fixed;
                                top: 0;
                                left: 0;
                                height: 100%;
                                width: 100%;
                                background: rgba(0, 0, 0, 0.3);
                                z-index: 1040;
                                opacity: 1;
                                transition: opacity 0.3s ease-in-out;
                              }

                              body:not(.layout-menu-expanded) .layout-overlay {
                                opacity: 0;
                                visibility: hidden;
                                pointer-events: none;
                              }
                            }

                            /* ✅ Desktop : on laisse le comportement Bootstrap/admin-template par défaut */
                            @media (min-width: 1200px) {
                              .layout-overlay {
                                display: none !important;
                              }
                            }
                          `}
                          </style>
                          <div className="layout-wrapper layout-content-navbar">
                            <div className="layout-container">
                              <Sidebar />
                              <div className="layout-page">
                                <Header />
                                <Outlet />
                                <div
                                  className="layout-overlay layout-menu-toggle"
                                  onClick={() => document.body.classList.remove('layout-menu-expanded')}
                                />
                              </div>
                            </div>
                          </div>
                        </InfoProvider>
                      </UserCessionProvider>
                    </EtudiantProvider>
                  </EmploiProvider>
                </ProfProvider>
              </AnnonceProvider>
            </StatsProvider>
          </NiveauProvider>
        </MatiereProvider>
      </SemestreProvider>
    </AnneeProvider>
  </EtudiantParcoursProvider>

  );
}

export default AdminLayout;