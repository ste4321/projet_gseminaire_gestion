import AppShell from './AppShell';
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
import { EtudiantParcoursProvider } from '../contexts/EtudiantParcoursContext';
import { UserCessionProvider } from '../contexts/UserCessionContext';

// Données partagées par les pages d'administration
const providers = [
  EtudiantParcoursProvider, AnneeProvider, SemestreProvider, MatiereProvider, NiveauProvider,
  StatsProvider, AnnonceProvider, ProfProvider, EmploiProvider, EtudiantProvider,
  UserCessionProvider, InfoProvider,
];

const AdminLayout = () =>
  providers.reduceRight((children, Provider) => <Provider>{children}</Provider>, <AppShell />);

export default AdminLayout;
