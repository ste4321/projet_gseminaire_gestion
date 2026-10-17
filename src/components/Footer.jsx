import React from 'react';

const Footer = () => (
  <footer className="content-footer footer bg-footer-theme">
    <div className="container-xxl d-flex flex-wrap justify-content-between py-3 flex-md-row flex-column gstf-footer">
      <div className="mb-2 mb-md-0">
        © {new Date().getFullYear()} Grand Séminaire de Théologie Faliarivo
      </div>
      <div>
        <a href="https://www.gstf-faliarivo.ovh/" target="_blank" rel="noopener noreferrer" className="footer-link">
          Site du séminaire
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
