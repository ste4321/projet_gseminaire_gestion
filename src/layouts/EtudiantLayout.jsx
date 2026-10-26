import AppShell from './AppShell';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';
import { NiveauProvider } from '../contexts/NiveauContext';
import { AnneeProvider } from '../contexts/AnneeContext';
import { EspaceEtudiantProvider } from '../contexts/EspaceEtudiantContext';
import { NotificationsEtudiantProvider } from '../contexts/NotificationsEtudiantContext';

// Niveaux et années : utilisés par la page Annonces (filtres et formulaires).
// Relevé de notes et inscriptions : gardés en mémoire d'une page à l'autre (EspaceEtudiantContext).
// Notes publiées et emploi du temps : reçus en direct et comptés sur la cloche (NotificationsEtudiantContext).
const EtudiantLayout = () => (
  <AnneeProvider>
    <NiveauProvider>
      <AnnonceProvider>
        <ProfProvider>
          <EmploiProvider>
            <EspaceEtudiantProvider>
              <NotificationsEtudiantProvider>
                <AppShell />
              </NotificationsEtudiantProvider>
            </EspaceEtudiantProvider>
          </EmploiProvider>
        </ProfProvider>
      </AnnonceProvider>
    </NiveauProvider>
  </AnneeProvider>
);

export default EtudiantLayout;
