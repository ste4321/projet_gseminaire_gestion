import AppShell from './AppShell';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';

const EtudiantLayout = () => (
  <AnnonceProvider>
    <ProfProvider>
      <EmploiProvider>
        <AppShell />
      </EmploiProvider>
    </ProfProvider>
  </AnnonceProvider>
);

export default EtudiantLayout;
