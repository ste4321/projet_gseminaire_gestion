import React, { useEffect, useState } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import axios from 'axios';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useEmploi } from '../contexts/EmploiContext';

const EmploiDuTemps = () => {
  const {
    emploiSemestre1,
    emploiSemestre2,
    setEmploiSemestre1,
    setEmploiSemestre2,
    loading
  } = useEmploi();

  const [semestre, setSemestre] = useState(1);
  const [page, setPage] = useState(0);
  const [role, setRole] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const emploiActuel = semestre === 1 ? emploiSemestre1 : emploiSemestre2;
  const totalPages = emploiActuel.length;

  useEffect(() => {
    setRole(localStorage.getItem('role'));
  }, []);

  useEffect(() => {
    setImageLoading(true);
  }, [page, emploiActuel]);

  const handleChangeSemestre = (s) => {
    setSemestre(s);
    setPage(0);
  };

  const handleModifier = () => setShowUploadModal(true);
  const handleSupprimer = () => setShowConfirmModal(true);

  // const handleUpload = async () => {
  //   if (!uploadFile || !emploiActuel[page]) return;

  //   const formData = new FormData();
  //   formData.append('image', uploadFile);
  //   formData.append('semestre', semestre);

  //   try {
  //     const res = await axios.post(
  //       `http://127.0.0.1:8000/api/emplois/${emploiActuel[page].id}/upload`,
  //       formData,
  //       { headers: { 'Content-Type': 'multipart/form-data' } }
  //     );

  //     const updatedList = [...emploiActuel];
  //     updatedList[page].image_url = res.data.image_url;
  //     (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);

  //     setShowUploadModal(false);
  //     setUploadFile(null);
  //   } catch (error) {
  //     console.error('Erreur lors de l\'upload :', error);
  //   }
  // };
  const handleUpload = async () => {
    if (!uploadFile || !emploiActuel[page]) return;
  
    setEnregistrement(true);
    const formData = new FormData();
    formData.append('image', uploadFile);
    formData.append('semestre', semestre);
    formData.append('email', localStorage.getItem('email')); // si tu veux aussi enregistrer l'utilisateur
  
    try {
      const res = await axios.post(`http://127.0.0.1:8000/api/emplois/${emploiActuel[page].id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      const updatedList = [...emploiActuel];
      updatedList[page].image_url = res.data.image_url;
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);
  
      setSuccessMessage("L'image a été mise à jour avec succès !");
      setShowUploadModal(false);
      setUploadFile(null);
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
    } finally {
      setEnregistrement(false);
    }
  };
  
  

  const confirmSupprimer = async () => {
    if (!emploiActuel[page]) return;

    try {
      await axios.delete(`http://127.0.0.1:8000/api/emplois/${emploiActuel[page].id}`);
      const updatedList = emploiActuel.filter((_, i) => i !== page);
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);
      setPage(0);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
    }
  };

  const renderPagination = () => {
    const maxVisiblePages = 5;
    let start = Math.max(0, page - Math.floor(maxVisiblePages / 2));
    let end = start + maxVisiblePages;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(0, end - maxVisiblePages);
    }

    const pages = Array.from({ length: end - start }, (_, i) => start + i);

    return (
      <nav className="mt-4" aria-label="Pagination">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(0)}>
              <FaAngleDoubleLeft />
            </button>
          </li>
          {pages.map(pg => (
            <li key={pg} className={`page-item ${pg === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setPage(pg)}>{pg + 1}</button>
            </li>
          ))}
          <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(totalPages - 1)}>
              <FaAngleDoubleRight />
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement de l'emploi du temps...</p>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Emploi du temps
      </h4>
            {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="row">
        <div className="col-md-12">
          <ul className="nav nav-pills flex-column flex-md-row mb-3">
            <li className="nav-item">
              <button className={`nav-link ${semestre === 1 ? 'active' : ''}`} onClick={() => handleChangeSemestre(1)}>Premier semestre</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${semestre === 2 ? 'active' : ''}`} onClick={() => handleChangeSemestre(2)}>Deuxième semestre</button>
            </li>
          </ul>

          <div className="card mb-4 text-center p-4 pt-5 position-relative">
            {emploiActuel.length > 0 && (
              <>
                {role === 'admin' && (
                  <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={handleModifier}>
                      <i className="bx bx-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={handleSupprimer}>
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                )}

                <div className="position-relative">
                  {imageLoading && (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                    </div>
                  )}

                  <PhotoProvider>
                    <PhotoView src={`http://127.0.0.1:8000${emploiActuel[page].image_url}`}>
                      <img
                        src={`http://127.0.0.1:8000${emploiActuel[page].image_url}`}
                        alt="emploi"
                        className="img-fluid"
                        style={{
                          maxHeight: '60vh',
                          objectFit: 'contain',
                          cursor: 'zoom-in',
                          display: imageLoading ? 'none' : 'block'
                        }}
                        onLoad={() => setImageLoading(false)}
                        onError={(e) => {
                          console.error("Erreur de chargement de l'image:", e);
                          setImageLoading(false); // on arrête le spinner même si erreur
                        }}
                      />
                    </PhotoView>
                  </PhotoProvider>
                </div>


                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Upload */}
      <div className={`modal fade ${showUploadModal ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Modifier l'image</h5></div>
            <div className="modal-body">
              <input type="file" onChange={e => setUploadFile(e.target.files[0])} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={() => setShowUploadModal(false)}>Annuler</button>
              <button
                className="btn btn-primary d-grid w-100 d-flex justify-content-center align-items-center"
                type="button"
                onClick={handleUpload}
                disabled={enregistrement}
              >
                Enregistrer
                {enregistrement && (
                  <span
                    className="spinner-border spinner-border-sm ms-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmation */}
      <div className={`modal fade ${showConfirmModal ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Confirmer la suppression</h5></div>
            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer cet emploi du temps ?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={() => setShowConfirmModal(false)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmSupprimer}>Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmploiDuTemps;
