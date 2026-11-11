import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import PrivateRoute from './auth/PrivateRoute';
import RoleRoute from './auth/RoleRoute';
import { FeedbackProvider } from './contexts/FeedbackContext';
import ChargementEspace from './components/ChargementEspace';

// Tous les écrans après la connexion sont chargés à la demande (voir pages/chargement.js)
import {
  ChangerMotDePasse,
  AdminLayout, AdminDashboard, Info, AnneesAcademiques, Calendrier, Messages, Reinscription, Niveau,
  ListeEtudiants, NoteEtudiant, Matiere, Semestre, Portal,
  ProfLayout, ProfDashboard, MesMatieres, SaisieNotes, MesLecons, LeconProf,
  EtudiantLayout, EtudiantDashboard, MesNotes, MesCours, LeconDetail,
  EmploiDuTemps, ListeProf, AnnonceAdminProf,
} from './pages/chargement';

function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        {/* Structure de l'espace en cours de téléchargement (juste après la connexion) */}
        <Suspense fallback={<ChargementEspace />}>
          <Routes>
            <Route path="/" element={<Login />} />

            <Route element={<PrivateRoute />}>
              <Route path="/changer-mot-de-passe" element={<ChangerMotDePasse />} />

              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="listeEtudiant" element={<ListeEtudiants />} />
                  <Route path="reinscription" element={<Reinscription />} />
                  <Route path="noteEtudiant" element={<NoteEtudiant />} />
                  <Route path="matiere" element={<Matiere />} />
                  <Route path="edt" element={<EmploiDuTemps />} />
                  <Route path="listeProf" element={<ListeProf />} />
                  <Route path="annonce" element={<AnnonceAdminProf />} />
                  <Route path="info" element={<Info />} />
                  <Route path="calendrier" element={<Calendrier />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="portal" element={<Portal />} />
                  <Route path="annees" element={<AnneesAcademiques />} />
                  <Route path="niveau" element={<Niveau />} />
                  <Route path="semestre" element={<Semestre />} />
                </Route>
              </Route>

              <Route element={<RoleRoute allowedRoles={['prof']} />}>
                <Route path="/prof" element={<ProfLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<ProfDashboard />} />
                  <Route path="matieres" element={<MesMatieres />} />
                  <Route path="notes" element={<SaisieNotes />} />
                  <Route path="lecons" element={<MesLecons />} />
                  <Route path="lecons/:id" element={<LeconProf />} />
                  <Route path="edt" element={<EmploiDuTemps />} />
                  <Route path="annonce" element={<AnnonceAdminProf />} />
                </Route>
              </Route>

              <Route element={<RoleRoute allowedRoles={['etudiant']} />}>
                <Route path="/etudiant" element={<EtudiantLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<EtudiantDashboard />} />
                  <Route path="notes" element={<MesNotes />} />
                  <Route path="cours" element={<MesCours />} />
                  <Route path="cours/:id" element={<LeconDetail />} />
                  <Route path="edt" element={<EmploiDuTemps />} />
                  <Route path="listeProf" element={<ListeProf />} />
                  <Route path="annonce" element={<AnnonceAdminProf />} />
                </Route>
              </Route>
            </Route>

            {/* Adresse inconnue : retour à l'accueil (redirigé vers son espace si connecté) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </FeedbackProvider>
  );
}

export default App;
