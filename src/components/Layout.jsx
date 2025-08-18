import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import useScripts from '../hooks/useScripts';

const Layout = ({ children }) => {
    useScripts([
        "/assets/vendor/libs/jquery/jquery.js",
        "/assets/vendor/libs/popper/popper.js",
        "/assets/vendor/js/bootstrap.js",
        "/assets/vendor/libs/perfect-scrollbar/perfect-scrollbar.js",
        "/assets/vendor/js/menu.js",
        "/assets/vendor/libs/apex-charts/apexcharts.js",
        "/assets/js/main.js",
        "/assets/js/dashboards-analytics.js",
      ]);
  return (
    <div class="layout-wrapper layout-content-navbar">
      <div class="layout-container">
        <div class="layout-page">
          <Header />
          <Sidebar />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
