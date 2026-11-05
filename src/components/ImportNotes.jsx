import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';

// Même règle que le serveur : NOTES_<CODE>_<NIVEAU>_<SEMESTRE>_<ANNEE>.xlsx (L1…L3, M1, M2 ; S1, S2)
const FORMAT_NOM = /^NOTES_([^_]+)_([A-Z]?[0-9])_(S[0-9]+)_([0-9]{4}-[0-9]{4})\.(xlsx|xls|csv)$/i;

const taille = (octets) => {
  if (!octets) return '0 o';
  const unites = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.min(Math.floor(Math.log(octets) / Math.log(1024)), unites.length - 1);
  return `${parseFloat((octets / 1024 ** i).toFixed(1))} ${unites[i]}`;
};

/**
 * Fenêtre d'import d'un fichier de notes (glisser-déposer ou choix du fichier).
 * Props : ouvert, onClose, url (route d'import), exemple (nom de fichier attendu),
 *         consigne (texte sous les instructions), onImporte(reponse) après un import réussi.
 */
const ImportNotes = ({ ouvert, onClose, url, exemple = 'NOTES_FRS_L1_S1_2025-2026.xlsx', consigne, onImporte }) => {
  const { notify } = useFeedback();
  const [fichier, setFichier] = useState(null);
  const [survol, setSurvol] = useState(false);
  const [progression, setProgression] = useState(0);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) { setFichier(null); setSurvol(false); setProgression(0); }
  }, [ouvert]);

  // Échap ferme la fenêtre, sauf pendant l'envoi
  useEffect(() => {
    if (!ouvert) return undefined;
    const touche = (e) => e.key === 'Escape' && !envoi && onClose();
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  }, [ouvert, envoi, onClose]);

  if (!ouvert) return null;

  const choisir = (f) => { if (f) { setFichier(f); setProgression(0); } };
  const glisser = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setSurvol(true);
    if (e.type === 'dragleave') setSurvol(false);
  };
  const deposer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSurvol(false);
    choisir(e.dataTransfer.files?.[0]);
  };

  const envoyer = async (e) => {
    e.preventDefault();
    if (!fichier) return;
    if (!FORMAT_NOM.test(fichier.name)) {
      notify.error(`Nom de fichier invalide. Format attendu : ${exemple}`, { title: 'Fichier refusé' });
      return;
    }

    const donnees = new FormData();
    donnees.append('file', fichier);
    setEnvoi(true);
    setProgression(0);
    try {
      const res = await api.post(url, donnees, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => p.total && setProgression(Math.round((p.loaded * 100) / p.total)),
      });
      const erreurs = res.data.errors || [];
      if (erreurs.length > 0) {
        const apercu = erreurs.slice(0, 5).join('\n') + (erreurs.length > 5 ? `\n… et ${erreurs.length - 5} autre(s)` : '');
        notify.warning(`${res.data.message}\n${erreurs.length} ligne(s) ignorée(s) :\n${apercu}`, { title: 'Import partiel', duration: 15000 });
      } else {
        notify.success(res.data.message, { title: 'Import terminé' });
      }
      onImporte?.(res.data);
      onClose();
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'importation. Vérifiez le format du fichier et réessayez."), { title: 'Import impossible' });
    } finally {
      setEnvoi(false);
    }
  };

  const ext = fichier?.name.split('.').pop().toLowerCase();

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="import-notes-titre">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <form className="modal-content" onSubmit={envoyer}>
            <div className="modal-header">
              <h5 className="modal-title" id="import-notes-titre">Importer un fichier de notes</h5>
              <button type="button" className="btn-close" aria-label="Fermer" onClick={onClose} disabled={envoi}></button>
            </div>
            <div className="modal-body">
              <div
                className={`border-2 border-dashed rounded p-4 text-center mb-3 ${survol ? 'border-primary bg-light' : 'border-muted'}`}
                onDragEnter={glisser} onDragLeave={glisser} onDragOver={glisser} onDrop={deposer}
              >
                <i className="bx bx-cloud-upload display-4 text-muted d-block mb-3" aria-hidden="true"></i>
                <h6 className="mb-2">Glissez-déposez votre fichier ici</h6>
                <p className="text-muted small mb-3">ou</p>
                <input type="file" className="form-control mb-3" accept=".csv,.xlsx,.xls"
                  onChange={(e) => choisir(e.target.files[0])} disabled={envoi} aria-label="Choisir un fichier" />
                <small className="text-muted">Formats acceptés : CSV, XLSX, XLS</small>
              </div>

              {fichier && (
                <div className="card">
                  <div className="card-body d-flex align-items-center">
                    <i className={`bx ${ext === 'csv' ? 'bx-file-blank' : 'bx-spreadsheet'} text-primary me-3`} style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                    <div className="flex-grow-1 min-w-0">
                      <h6 className="mb-1 text-truncate" title={fichier.name}>{fichier.name}</h6>
                      <small className="text-muted">{taille(fichier.size)}</small>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFichier(null)} disabled={envoi} aria-label="Retirer le fichier">
                      <i className="bx bx-x"></i>
                    </button>
                  </div>
                </div>
              )}

              {envoi && progression > 0 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted">Progression</small>
                    <small className="text-muted">{progression}%</small>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${progression}%` }}></div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h6>Instructions :</h6>
                <ul className="small text-muted mb-0">
                  <li>Nom du fichier doit être comme suit : <strong>{exemple}</strong></li>
                  <li>Colonnes obligatoires : <strong>matricule</strong>, <strong>note</strong></li>
                  {consigne && <li>{consigne}</li>}
                  <li>Taille maximale : 10 Mo</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={envoi}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={!fichier || envoi}>
                {envoi
                  ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Importation…</>
                  : <><i className="bx bx-upload me-1"></i>Importer</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default ImportNotes;
