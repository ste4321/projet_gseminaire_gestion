import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import PrivateRoute from './auth/PrivateRoute';
import RoleRoute from './auth/RoleRoute';
import { FeedbackProvider } from './contexts/FeedbackContext';
import ChangerMotDePasse from './pages/ChangerMotDePasse';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Info from './pages/admin/Info';
import Niveau from './pages/admin/Niveau';

import ProfLayout from './layouts/ProfLayout';
import ProfDashboard from './pages/prof/ProfDashboard';

import EtudiantLayout from './layouts/EtudiantLayout';
import EtudiantDashboard from './pages/etudiant/EtudiantDashboard';
import MesNotes from './pages/etudiant/MesNotes';

import EmploiDuTemps from './components/EmploiDuTemps';
import ListeProf from './components/ListeProf';
import AnnonceAdminProf from './components/AnnonceAdminProf';
import Matiere from './components/Matiere';
import Semestre from './components/Semestre';
import ListeEtudiants from './components/ListeEtudiants';
import NoteEtudiant from './components/NoteEtudiant';
import Portal from './components/Portal';

function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<PrivateRoute />}>
            <Route path="/changer-mot-de-passe" element={<ChangerMotDePasse />} />

            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="listeEtudiant" element={<ListeEtudiants />} />
                <Route path="noteEtudiant" element={<NoteEtudiant />} />
                <Route path="matiere" element={<Matiere />} />
                <Route path="edt" element={<EmploiDuTemps />} />
                <Route path="listeProf" element={<ListeProf />} />
                <Route path="annonce" element={<AnnonceAdminProf />} />
                <Route path="info" element={<Info />} />
                <Route path="portal" element={<Portal />} />
                <Route path="niveau" element={<Niveau />} />
                <Route path="semestre" element={<Semestre />} />
              </Route>
            </Route>

            <Route element={<RoleRoute allowedRoles={['prof']} />}>
              <Route path="/prof" element={<ProfLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ProfDashboard />} />
                <Route path="annonce" element={<AnnonceAdminProf />} />
              </Route>
            </Route>

            <Route element={<RoleRoute allowedRoles={['etudiant']} />}>
              <Route path="/etudiant" element={<EtudiantLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<EtudiantDashboard />} />
                <Route path="notes" element={<MesNotes />} />
                <Route path="edt" element={<EmploiDuTemps />} />
                <Route path="listeProf" element={<ListeProf />} />
                <Route path="annonce" element={<AnnonceAdminProf />} />
              </Route>
            </Route>
          </Route>

          {/* Adresse inconnue : retour à l'accueil (redirigé vers son espace si connecté) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FeedbackProvider>
  );
}

export default App;
