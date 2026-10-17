import AppShell from './AppShell';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';

const ProfLayout = () => (
  <AnnonceProvider>
    <ProfProvider>
      <AppShell />
    </ProfProvider>
  </AnnonceProvider>
);

export default ProfLayout;
