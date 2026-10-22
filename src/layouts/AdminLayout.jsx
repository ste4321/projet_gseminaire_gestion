import AppShell from './AppShell';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';
import { InfoProvider } from '../contexts/InfoContext';
import { NiveauProvider } from '../contexts/NiveauContext';
import { SemestreProvider } from '../contexts/SemestreContext';
import { AnneeProvider } from '../contexts/AnneeContext';
import { UserCessionProvider } from '../contexts/UserCessionContext';

// Données partagées par les pages d'administration
const providers = [
  AnneeProvider, SemestreProvider, NiveauProvider,
  AnnonceProvider, ProfProvider, EmploiProvider,
  UserCessionProvider, InfoProvider,
];

const AdminLayout = () =>
  providers.reduceRight((children, Provider) => <Provider>{children}</Provider>, <AppShell />);

export default AdminLayout;
