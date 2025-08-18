// // import logo from './logo.svg';
// import './App.css';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import PrivateRoute from './auth/PrivateRoute';
// import Layout from './components/Layout'; // wrapper avec Header, Sidebar, etc.

// // import Header from './components/Header';
// // import Sidebar from './components/Sidebar';
// // import Body from './components/Body';
// import useScripts from './hooks/useScripts';
// function App() {
//   useScripts([
//     "/assets/vendor/libs/jquery/jquery.js",
//     "/assets/vendor/libs/popper/popper.js",
//     "/assets/vendor/js/bootstrap.js",
//     "/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js",
//     "/assets/vendor/js/menu.js",
//     "/assets/js/main.js",
//   ]);
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Login />} />
        
//         <Route
//           path="/dashboard"
//           element={
//             <PrivateRoute>
//               <Layout>
//                 <Dashboard />
//               </Layout>
//             </PrivateRoute>
//           }
//         />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Info from './pages/admin/Info';
// import AdminMatieres from './pages/admin/Matieres';

import ProfLayout from './layouts/ProfLayout';
import ProfDashboard from './pages/prof/ProfDashboard';
// idem pour prof...

import EtudiantLayout from './layouts/EtudiantLayout';
import EtudiantDashboard from './pages/etudiant/EtudiantDashboard';
// idem pour étudiant...
import useScripts from './hooks/useScripts';
import EmploiDuTemps from './components/EmploiDuTemps';
import ListeProf from './components/ListeProf';
import InscriptionEtudiant from './pages/admin/InscriptionEtudiant';
import AnnonceAdminProf from './components/AnnonceAdminProf';
import PrivateRoute from './auth/PrivateRoute';
import RoleRoute from './auth/RoleRoute';
import Niveau from './pages/admin/Niveau';
import Matiere from './components/Matiere';
import Semestre from './components/Semestre';
import ListeEtudiants from './components/ListeEtudiants';
import NoteEtudiant from './components/NoteEtudiant';
import Portal from './components/Portal';


function App() {
  useScripts([
        "/assets/vendor/libs/jquery/jquery.js",
        "/assets/vendor/libs/popper/popper.js",
        "/assets/vendor/js/bootstrap.js",
        "/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js",
        "/assets/vendor/js/menu.js",
        "/assets/js/main.js",
      ]);
  return (
    <BrowserRouter>
  <Routes>
    <Route path="/" element={<Login />} />

    <Route element={<PrivateRoute />}>
      <Route element={<RoleRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="info" element={<Info />} />
          <Route path="edt" element={<EmploiDuTemps />} />
          <Route path="listeProf" element={<ListeProf />} />
          <Route path="noteEtudiant" element={<NoteEtudiant />} />
          <Route path="inscriptionEtudiant" element={<InscriptionEtudiant />} />
          <Route path="annonce" element={<AnnonceAdminProf />} />
          <Route path="niveau" element={<Niveau />} />
          <Route path="matiere" element={<Matiere />} />
          <Route path="semestre" element={<Semestre />} />
          <Route path="listeEtudiant" element={<ListeEtudiants />} />
          <Route path="noteEtudiant" element={<NoteEtudiant />} />
          <Route path="portal" element={<Portal />} />

        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={['prof']} />}>
        <Route path="/prof" element={<ProfLayout />}>
          <Route path="dashboard" element={<ProfDashboard />} />
          <Route path="cours" element={<ProfDashboard />} />
          <Route path="annonce" element={<AnnonceAdminProf />} />
        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={['etudiant']} />}>
        <Route path="/etudiant" element={<EtudiantLayout />}>
          <Route path="dashboard" element={<EtudiantDashboard />} />
          <Route path="edt" element={<EmploiDuTemps />} />
          <Route path="listeProf" element={<ListeProf />} />
          <Route path="annonce" element={<AnnonceAdminProf />} />
        </Route>
      </Route>
    </Route>
  </Routes>
</BrowserRouter>

  );
}

export default App;

