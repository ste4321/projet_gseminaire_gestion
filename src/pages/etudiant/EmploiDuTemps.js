import React, { useState } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

const EmploiDuTemps = () => {
  const emploiSemestre1 = [
    '/images/edt/edt1.jpg',
    '/images/edt/edt2.jpg',
    '/images/edt/edt3.jpg',
    // '/images/edt/edt4.jpg',
    // '/images/edt/edt5.jpg'
  ];
  const emploiSemestre2 = [
    '/images/edt/edt1.jpg',
    '/images/edt/edt2.jpg',
    '/images/edt/edt3.jpg',
    '/images/edt/edt2.jpg',

  ];

  const [semestre, setSemestre] = useState(1);
  const [page, setPage] = useState(0);

  const emploiActuel = semestre === 1 ? emploiSemestre1 : emploiSemestre2;
  const totalPages = emploiActuel.length;

  const handleChangeSemestre = (s) => {
    setSemestre(s);
    setPage(0);
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">Étudiant /</span> Emploi du temps
      </h4>

      <div className="row">
        <div className="col-md-12">
          <ul className="nav nav-pills flex-column flex-md-row mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${semestre === 1 ? 'active' : ''}`}
                onClick={() => handleChangeSemestre(1)}
              >
                 Premier semestre
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${semestre === 2 ? 'active' : ''}`}
                onClick={() => handleChangeSemestre(2)}
              >
                Deuxième semestre
              </button>
            </li>
          </ul>

          <div
            className="card mb-4 text-center p-4"
            style={{
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div
              style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PhotoProvider>
                <PhotoView src={emploiActuel[page]}>
                  <img
                    src={emploiActuel[page]}
                    alt={`Emploi du temps S${semestre} page ${page + 1}`}
                    className="img-fluid"
                    style={{
                      maxHeight: '60vh',
                      objectFit: 'contain',
                      cursor: 'zoom-in',
                      width: '100%',
                      height: 'auto'
                    }}
                  />
                </PhotoView>
              </PhotoProvider>
            </div>

            <div className="mt-3 d-flex flex-column flex-md-row justify-content-center align-items-center gap-2">
              <div>
                <button
                  className="btn btn-secondary me-2"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précédent
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </button>
              </div>
              <p className="mt-2">Page {page + 1} sur {totalPages}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmploiDuTemps;
