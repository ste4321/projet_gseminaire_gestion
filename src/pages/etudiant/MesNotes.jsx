import React, { useCallback, useEffect, useState } from 'react';
import api, { errorMessage, estAnnulee } from '../../api/client';
import useDerniereRequete from '../../hooks/useDerniereRequete';
import { useFeedback } from '../../contexts/FeedbackContext';
import { telechargerBulletin } from '../../utils/bulletin';
import StatutResultat from '../../components/StatutResultat';

const format = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));

const BadgeNote = ({ valeur }) => {
  if (valeur === null || valeur === undefined) {
    return <span className="text-muted" title="Note pas encore saisie">—</span>;
  }
  const classe = valeur < 10 ? 'bg-label-danger' : valeur >= 14 ? 'bg-label-success' : 'bg-label-secondary';
  return <span className={`badge ${classe} fs-6`}>{format(valeur)}</span>;
};

const MesNotes = () => {
  const { notify } = useFeedback();
  const [parcours, setParcours] = useState([]);
  const [parcoursId, setParcoursId] = useState('');
  const [releve, setReleve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  useEffect(() => {
    const controle = new AbortController();
    api.get('/etudiant/parcours', { signal: controle.signal })
      .then((res) => setParcours(res.data))
      .catch(() => setParcours([])); // sans la liste, seul le parcours en cours est proposé
    return () => controle.abort();
  }, []);

  const nouvelleRequete = useDerniereRequete();

  const charger = useCallback(async (id) => {
    const signal = nouvelleRequete(); // changement de parcours rapide : seule la dernière réponse compte
    setLoading(true);
    setErreur(null);
    try {
      const res = await api.get('/etudiant/releve', { params: id ? { parcours: id } : {}, signal });
      setReleve(res.data);
    } catch (err) {
      if (estAnnulee(err)) return;
      setReleve(null);
      setErreur(errorMessage(err, 'Impossible de charger vos notes.'));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [nouvelleRequete]);

  useEffect(() => {
    charger(parcoursId);
  }, [parcoursId, charger]);

  const telecharger = async () => {
    setPdfEnCours(true);
    try {
      await telechargerBulletin(releve, { publiesSeulement: true });
      notify.success('Bulletin téléchargé.');
    } catch (e) {
      notify.error("Le bulletin n'a pas pu être généré.");
    } finally {
      setPdfEnCours(false);
    }
  };

  const general = releve?.general;
  const progression = general?.matieres_total ? Math.round((general.notes_saisies / general.matieres_total) * 100) : 0;
  const aucunePublication = general && general.semestres_publies === 0;
  const publicationPartielle = general && general.semestres_publies > 0 && general.semestres_publies < general.semestres_total;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold">Mes notes</h4>
          {releve && <small className="text-muted">{releve.niveau} · Année académique {releve.annee}</small>}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {parcours.length > 1 && (
            <select
              className="form-select w-auto"
              aria-label="Année académique"
              value={parcoursId || releve?.parcours_id || ''}
              onChange={(e) => setParcoursId(e.target.value)}
              disabled={loading}
            >
              {parcours.map((p) => <option key={p.id} value={p.id}>{p.annee} · {p.niveau}</option>)}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={telecharger} disabled={!releve || aucunePublication || pdfEnCours || loading}
            title={aucunePublication ? 'Disponible dès la publication de vos notes' : undefined}>
            <i className="bx bx-download me-1"></i>
            {pdfEnCours ? 'Préparation…' : 'Télécharger mon bulletin'}
          </button>
        </div>
      </div>

      {loading && !releve ? (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2 text-muted">Chargement de vos notes…</p>
        </div>
      ) : erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-info-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => charger(parcoursId)}>Réessayer</button>
          </div>
        </div>
      ) : releve && (
        <>
          <div className="row">
            <div className="col-sm-6 col-xl-4 mb-4">
              <div className="card h-100">
                <div className="card-body gstf-stat">
                  <div className="gstf-stat__icon" aria-hidden="true"><i className="bx bx-medal"></i></div>
                  <div>
                    <div className="gstf-stat__value">{general.moyenne === null ? '—' : `${format(general.moyenne)} / 20`}</div>
                    <div className="gstf-stat__label">{publicationPartielle ? 'Moyenne des semestres publiés' : 'Moyenne générale'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-4 mb-4">
              <div className="card h-100">
                <div className="card-body gstf-stat">
                  <div className="gstf-stat__icon gstf-stat__icon--gold" aria-hidden="true"><i className="bx bx-spreadsheet"></i></div>
                  <div className="flex-grow-1">
                    <div className="gstf-stat__value">{general.notes_saisies} / {general.matieres_total}</div>
                    <div className="gstf-stat__label">Notes disponibles</div>
                    <div className="gstf-bar mt-2" role="progressbar" aria-valuenow={progression} aria-valuemin="0" aria-valuemax="100" aria-label="Notes disponibles">
                      <span style={{ width: `${progression}%` }}></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-4 mb-4">
              <div className="card h-100">
                <div className="card-body gstf-stat">
                  <div className="gstf-stat__icon" aria-hidden="true"><i className="bx bx-check-shield"></i></div>
                  <div>
                    <div className="gstf-stat__value fs-5">
                      <StatutResultat statut={general.statut} attente={general.semestres_publies < general.semestres_total ? 'Après publication' : 'Notes incomplètes'} />
                    </div>
                    <div className="gstf-stat__label">Résultat de l'année</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {aucunePublication && general.matieres_total > 0 && (
            <div className="alert alert-info d-flex gap-2" role="status">
              <i className="bx bx-time-five fs-4"></i>
              <div>
                <strong>Vos notes ne sont pas encore publiées.</strong><br />
                Elles apparaîtront ici dès que l'administration aura publié les résultats du semestre.
              </div>
            </div>
          )}

          {general.matieres_total === 0 ? (
            <div className="card">
              <div className="gstf-empty">
                <i className="bx bx-book d-block"></i>
                Aucune matière n'est encore au programme de votre niveau pour cette année.
              </div>
            </div>
          ) : (
            releve.semestres.map((s) => (
              <div className="card mb-4" key={s.id ?? 'hors'}>
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h5 className="card-title gstf-section-title mb-0">{s.semestre}</h5>
                  {s.publie ? (
                    <span className="text-muted d-flex align-items-center gap-2">
                      Moyenne : <strong className="text-body">{s.moyenne === null ? '—' : `${format(s.moyenne)} / 20`}</strong>
                      {s.statut && <StatutResultat statut={s.statut} />}
                    </span>
                  ) : (
                    <span className="badge bg-label-secondary">Pas encore publié</span>
                  )}
                </div>
                {!s.publie ? (
                  <div className="card-body pt-0 text-muted">
                    <i className="bx bx-lock-alt me-1"></i>
                    Les notes de ce semestre ({s.matieres.length} matière{s.matieres.length > 1 ? 's' : ''}) seront visibles après leur publication.
                  </div>
                ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Matière</th>
                        <th scope="col" className="text-center text-nowrap" title="Coefficient">Coef.</th>
                        <th scope="col" className="text-center text-nowrap">Note /20</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.matieres.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span className="fw-semibold">{m.matiere}</span>
                            <small className="text-muted d-block">{m.code} · {m.heures} h</small>
                          </td>
                          <td className="text-center">{m.coefficient}</td>
                          <td className="text-center"><BadgeNote valeur={m.note} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            ))
          )}

          <p className="small text-muted">
            <i className="bx bx-info-circle me-1"></i>
            La moyenne est pondérée par les coefficients et ne tient compte que des matières déjà notées.
            Le résultat (Validé à partir de 10/20, sinon Rattrapage) s'affiche quand toutes les notes sont publiées.
            Une question sur une note ? Adressez-vous au secrétariat des études.
          </p>
        </>
      )}
    </div>
  );
};

export default MesNotes;
