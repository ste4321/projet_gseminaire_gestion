import React, { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';

// Publication des notes par semestre (année + niveau).
// Tant qu'un semestre n'est pas publié, le serveur n'envoie pas ses notes aux étudiants.
const dateCourte = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

const PublicationNotes = ({ anneeId, niveau, version }) => {
  const { notify, confirm } = useFeedback();
  const [semestres, setSemestres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enCours, setEnCours] = useState(null);

  const charger = useCallback(async () => {
    if (!anneeId || !niveau?.id) {
      setSemestres([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/notes/publications', { params: { annee: anneeId, niveau: niveau.id } });
      setSemestres(res.data);
    } catch (error) {
      setSemestres([]);
      notify.error(errorMessage(error, "L'état de publication des notes est indisponible."));
    } finally {
      setLoading(false);
    }
  }, [anneeId, niveau?.id, notify]);

  useEffect(() => {
    charger();
  }, [charger, version]);

  const basculer = async (s) => {
    const manquantes = s.notes_attendues - s.notes_saisies;
    const ok = await confirm(s.publie ? {
      title: `Retirer la publication du ${s.semestre} ?`,
      message: `Les étudiants de ${niveau.niveau} ne verront plus leurs notes du ${s.semestre}.`,
      confirmLabel: 'Retirer la publication',
      danger: true,
    } : {
      title: `Publier les notes du ${s.semestre} ?`,
      message: `Les ${s.etudiants} étudiant(s) de ${niveau.niveau} pourront consulter leurs notes et leur résultat du ${s.semestre}.`
        + (manquantes > 0 ? ` Attention : ${manquantes} note(s) ne sont pas encore saisies.` : ''),
      confirmLabel: 'Publier',
    });
    if (!ok) return;

    const cible = { id_annee_aca: Number(anneeId), id_niveau: niveau.id, id_semestre: s.id };
    setEnCours(s.id);
    try {
      const res = s.publie
        ? await api.delete('/notes/publications', { data: cible })
        : await api.post('/notes/publications', cible);
      notify.success(res.data.message);
      await charger();
    } catch (error) {
      notify.error(errorMessage(error, "L'opération n'a pas abouti."));
    } finally {
      setEnCours(null);
    }
  };

  if (!niveau) return null;

  return (
    <div className="card mb-4 gstf-publication">
      <div className="card-header">
        <h5 className="card-title mb-1">Publication des notes · {niveau.niveau}</h5>
        <small className="text-muted">Les étudiants ne voient les notes d'un semestre qu'après sa publication.</small>
      </div>
      <div className="card-body">
        {loading && semestres.length === 0 ? (
          <div className="text-center py-2"><span className="spinner-border spinner-border-sm text-primary" role="status"></span></div>
        ) : semestres.length === 0 ? (
          <p className="text-muted mb-0">Aucune matière de ce niveau n'est rattachée à un semestre.</p>
        ) : (
          <div className="gstf-publication__liste">
            {semestres.map((s) => {
              const pct = s.notes_attendues ? Math.round((s.notes_saisies * 100) / s.notes_attendues) : 0;
              return (
                <div className="gstf-publication__item" key={s.id}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <strong>{s.semestre}</strong>
                      <div className="small text-muted">{s.matieres} matière(s) · {s.etudiants} étudiant(s)</div>
                    </div>
                    {s.publie
                      ? <span className="badge bg-label-success">Publié</span>
                      : <span className="badge bg-label-secondary">Non publié</span>}
                  </div>
                  <div className="small mt-3 d-flex justify-content-between">
                    <span>Notes saisies</span>
                    <span className="fw-semibold">{s.notes_saisies} / {s.notes_attendues}</span>
                  </div>
                  <div className="gstf-bar mt-1" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={`Notes saisies du ${s.semestre}`}>
                    <span style={{ width: `${pct}%` }}></span>
                  </div>
                  <br />
                  {/* <div className="small text-muted mt-2">
                    {s.publie ? `Publié le ${dateCourte(s.publie_le)} par ${s.publie_par}` : 'Invisible pour les étudiants'}
                  </div> */}
                  <button
                    type="button"
                    className={`btn btn-sm w-100 mt-3 ${s.publie ? 'btn-outline-secondary' : 'btn-primary'}`}
                    disabled={enCours === s.id || (!s.publie && s.etudiants === 0)}
                    onClick={() => basculer(s)}
                  >
                    <i className={`bx ${s.publie ? 'bx-hide' : 'bx-send'} me-1`}></i>
                    {enCours === s.id ? 'Patientez…' : s.publie ? 'Retirer la publication' : 'Publier les notes'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicationNotes;
