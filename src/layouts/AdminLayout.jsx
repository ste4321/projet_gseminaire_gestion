import AppShell from './AppShell';
import { EmploiProvider } from '../contexts/EmploiContext';
import { ProfProvider } from '../contexts/ProfContext';
import { AnnonceProvider } from '../contexts/AnnonceContext';
import { InfoProvider } from '../contexts/InfoContext';
import { CalendrierProvider } from '../contexts/CalendrierContext';
import { NiveauProvider } from '../contexts/NiveauContext';
import { SemestreProvider } from '../contexts/SemestreContext';
import { AnneeProvider } from '../contexts/AnneeContext';
import { UserCessionProvider } from '../contexts/UserCessionContext';
import { MessagesSiteProvider } from '../contexts/MessagesSiteContext';

// Données partagées par les pages d'administration
// (MessagesSiteProvider : messages du site en direct, pour la cloche, le menu et la page Messages)
const providers = [
  AnneeProvider, SemestreProvider, NiveauProvider,
  AnnonceProvider, ProfProvider, EmploiProvider,
  UserCessionProvider, InfoProvider, CalendrierProvider,
  MessagesSiteProvider,
];

const AdminLayout = () =>
  providers.reduceRight((children, Provider) => <Provider>{children}</Provider>, <AppShell />);

export default AdminLayout;
