import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import CompteConnexion from '../../components/CompteConnexion';
import StatutResultat from '../../components/StatutResultat';
import { telechargerBulletin } from '../../utils/bulletin';

// Profil d'un étudiant vu par l'administration : identité, compte, inscriptions et notes
// (y compris celles que l'étudiant ne voit pas encore), sans se connecter à son compte.
const format = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));
const initiales = (nom = '') => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

const BadgeNote = ({ valeur }) => {
  if (valeur === null || valeur === undefined) return <span className="text-muted" title="Note pas encore saisie">—</span>;
  const classe = valeur < 10 ? 'bg-label-danger' : valeur >= 14 ? 'bg-label-success' : 'bg-label-secondary';
  return <span className={`badge ${classe} fs-6`}>{format(valeur)}</span>;
};

const ProfilEtudiant = () => {
  const { id } = useParams();
  const { notify } = useFeedback();
  const [profil, setProfil] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [parcoursId, setParcoursId] = useState(null);
  const [releve, setReleve] = useState(null);
  const [chargementNotes, setChargementNotes] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  useEffect(() => {
    setProfil(null);
    setErreur(null);
    api.get(`/etudiants/${id}/profil`)
      .then((res) => {
        setProfil(res.data);
        setParcoursId(res.data.parcours[0]?.id ?? null);
      })
      .catch((err) => setErreur(errorMessage(err, "Impossible de charger le profil de l'étudiant.")));
  }, [id]);

  const chargerNotes = useCallback(async (pid) => {
    if (!pid) {
      setReleve(null);
      return;
    }
    setChargementNotes(true);
    try {
      const res = await api.get(`/notes/releve/${pid}`);
      setReleve(res.data);
    } catch (err) {
      setReleve(null);
      notify.error(errorMessage(err, 'Impossible de charger les notes.'));
    } finally {
      setChargementNotes(false);
    }
  }, [notify]);

  useEffect(() => {
    chargerNotes(parcoursId);
  }, [parcoursId, chargerNotes]);

  const bulletin = async () => {
    setPdfEnCours(true);
    try {
      await telechargerBulletin(releve);
    } catch (e) {
      notify.error("Le bulletin n'a pas pu être généré.");
    } finally {
      setPdfEnCours(false);
    }
  };

  if (erreur) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        <Link to="/admin/listeEtudiant" className="btn btn-link px-0 mb-3"><i className="bx bx-arrow-back me-1"></i>Étudiants</Link>
        <div className="alert alert-danger">{erreur}</div>
      </div>
    );
  }
  if (!profil) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y text-center py-5" role="status">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Chargement du profil…</p>
      </div>
    );
  }

  const { etudiant, compte, parcours } = profil;
  const actuel = parcours.find((p) => p.id === parcoursId) || parcours[0];
  const general = releve?.general;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <Link to="/admin/listeEtudiant" className="btn btn-link px-0 mb-2"><i className="bx bx-arrow-back me-1"></i>Étudiants</Link>

      {/* Identité */}
      <div className="card mb-4">
        <div className="card-body gstf-profil-entete">
          <div className="gstf-profil-avatar" aria-hidden="true">{initiales(etudiant.nom_prenom)}</div>
          <div className="flex-grow-1">
            <h4 className="fw-bold mb-1">{etudiant.nom_prenom}</h4>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <span className="badge bg-label-primary">Matricule {etudiant.matricule}</span>
              {actuel && <span className="badge bg-label-secondary">{actuel.niveau} · {actuel.annee}</span>}
            </div>
            <ul className="gstf-profil-infos">
              <li><i className="bx bx-church"></i>Diocèse : {etudiant.diocese || '—'}</li>
              <li><i className="bx bx-envelope"></i>{etudiant.email || 'Pas d\'email'}</li>
              <li><i className="bx bx-phone"></i>{etudiant.telephone || 'Pas de téléphone'}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4 mb-4">
          <CompteConnexion compte={compte} nom={etudiant.nom_prenom}
            onMisAJour={(c) => setProfil((p) => ({ ...p, compte: c }))} />
        </div>

        {/* Notes */}
        <div className="col-lg-8 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title gstf-section-title mb-0">Notes</h5>
              <div className="d-flex flex-wrap gap-2">
                {parcours.length > 1 && (
                  <select className="form-select form-select-sm w-auto" aria-label="Inscription" value={parcoursId || ''}
                    onChange={(e) => setParcoursId(Number(e.target.value))}>
                    {parcours.map((p) => <option key={p.id} value={p.id}>{p.annee} · {p.niveau}</option>)}
                  </select>
                )}
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={bulletin} disabled={!releve || pdfEnCours}>
                  <i className="bx bx-download me-1"></i>{pdfEnCours ? 'Préparation…' : 'Bulletin PDF'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {parcours.length === 0 ? (
                <p className="text-muted mb-0">Cet étudiant n'est inscrit à aucune année académique.</p>
              ) : chargementNotes && !releve ? (
                <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>
              ) : releve && (
                <>
                  <div className="gstf-notes-bilan gstf-notes-bilan--carte mb-4">
                    <div><span>Moyenne générale</span><strong>{general.moyenne === null ? '—' : `${format(general.moyenne)} / 20`}</strong></div>
                    <div><span>Notes saisies</span><strong>{general.notes_saisies} / {general.matieres_total}</strong></div>
                    <div><span>Résultat</span><strong><StatutResultat statut={general.statut} attente="Notes incomplètes" /></strong></div>
                  </div>
                  {releve.semestres.length === 0 && <p className="text-muted mb-0">Aucune matière n'est enregistrée pour ce niveau.</p>}
                  {releve.semestres.map((s) => (
                    <section key={s.id ?? 'hors'} className="mb-4">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                        <h6 className="mb-0">{s.semestre}</h6>
                        {s.publie
                          ? <span className="badge bg-label-success">Publié · visible par l'étudiant</span>
                          : <span className="badge bg-label-secondary">Non publié · invisible pour l'étudiant</span>}
                        <span className="ms-auto small text-muted d-flex align-items-center gap-2">
                          Moyenne : <strong className="text-body">{s.moyenne === null ? '—' : `${format(s.moyenne)} / 20`}</strong>
                          {s.statut && <StatutResultat statut={s.statut} />}
                        </span>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover mb-0">
                          <thead>
                            <tr>
                              <th scope="col">Matière</th>
                              <th scope="col" className="text-center">Coef.</th>
                              <th scope="col" className="text-center text-nowrap">Note /20</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.matieres.map((m) => (
                              <tr key={m.id}>
                                <td>{m.matiere} <small className="text-muted">· {m.code}</small></td>
                                <td className="text-center">{m.coefficient}</td>
                                <td className="text-center"><BadgeNote valeur={m.note} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                  <Link to="/admin/noteEtudiant" className="small"><i className="bx bx-edit me-1"></i>Saisir ou modifier les notes dans la page Notes</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inscriptions */}
      {parcours.length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><h5 className="card-title gstf-section-title mb-0">Inscriptions</h5></div>
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr><th scope="col">Année académique</th><th scope="col">Niveau</th><th scope="col">Statut</th><th scope="col">Inscrit le</th></tr>
              </thead>
              <tbody>
                {parcours.map((p) => (
                  <tr key={p.id}>
                    <td>{p.annee}</td>
                    <td>{p.niveau}</td>
                    <td className="text-capitalize">{p.statut || '—'}</td>
                    <td>{p.date_inscription ? new Date(p.date_inscription).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilEtudiant;
