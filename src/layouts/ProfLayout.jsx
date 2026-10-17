import AppShell from './AppShell';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';
import { NiveauProvider } from '../contexts/NiveauContext';
import { AnneeProvider } from '../contexts/AnneeContext';

// Niveaux et années : utilisés par la page Annonces (filtres et formulaires)
const ProfLayout = () => (
  <AnneeProvider>
    <NiveauProvider>
      <AnnonceProvider>
        <ProfProvider>
          <AppShell />
        </ProfProvider>
      </AnnonceProvider>
    </NiveauProvider>
  </AnneeProvider>
);

export default ProfLayout;
