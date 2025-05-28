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
import EmploiDuTemps from './pages/etudiant/EmploiDuTemps';

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

        <Route path="/admin" element={<AdminLayout />}>
          {/* <Route index element={<AdminDashboard />} /> */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="info" element={<Info />} />
        </Route>

        <Route path="/prof" element={<ProfLayout />}>
          <Route path="dashboard" element={<ProfDashboard />} />
          <Route path="cours" element={<ProfDashboard />} />
          {/* autres routes */}
        </Route>

        <Route path="/etudiant" element={<EtudiantLayout />}>
          <Route path="dashboard" element={<EtudiantDashboard />} />
          <Route path="edt" element={<EmploiDuTemps />} />

          {/* autres routes */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

