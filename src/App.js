// import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './auth/PrivateRoute';
import Layout from './components/Layout'; // wrapper avec Header, Sidebar, etc.

// import Header from './components/Header';
// import Sidebar from './components/Sidebar';
// import Body from './components/Body';
import useScripts from './hooks/useScripts';
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
        
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
