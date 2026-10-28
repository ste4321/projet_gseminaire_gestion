import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { SORTIES } from '../utils/parcours';

// Départ d'un étudiant en cours d'année : diplômé, abandon, transfert, exclusion.
// Le dossier n'est jamais supprimé (notes et bulletins restent consultables) ;
// sauf pour un diplômé, son compte est désactivé et ses sessions ouvertes sont fermées.

// Date du jour à l'heure locale (toISOString donnerait la date UTC : la veille avant 3 h à Madagascar)
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SortieEtudiant = ({ modalId, etudiant, onEnregistre }) => {
  const { notify } = useFeedback();
  const [statut, setStatut] = useState('abandon');
  const [date, setDate] = useState(aujourdhui);
  const [motif, setMotif] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  // Nouvel étudiant : formulaire vierge
  useEffect(() => {
    setStatut('abandon');
    setDate(aujourdhui());
    setMotif('');
  }, [etudiant?.id]);

  const choix = SORTIES.find((s) => s.valeur === statut);

  const enregistrer = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    try {
      const res = await api.post(`/etudiants/${etudiant.id}/sortie`, { statut, date, motif: motif.trim() || null });
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId)).hide();
      notify.success(res.data.message);
      onEnregistre?.();
    } catch (err) {
      notify.error(errorMessage(err, "Le départ n'a pas pu être enregistré."));
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-labelledby={`${modalId}-titre`} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content" onSubmit={enregistrer} noValidate>
          <div className="modal-header">
            <h5 className="modal-title" id={`${modalId}-titre`}>Départ de {etudiant?.nom_prenom}</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
          </div>
          <div className="modal-body">
            <fieldset className="mb-3">
              <legend className="form-label fs-6">Raison</legend>
              <div className="d-grid gap-2">
                {SORTIES.map((s) => (
                  <label key={s.valeur} className={`gstf-choix${statut === s.valeur ? ' is-actif' : ''}`}>
                    <input type="radio" className="form-check-input mt-0" name={`${modalId}-statut`} value={s.valeur}
                      checked={statut === s.valeur} onChange={() => setStatut(s.valeur)} />
                    <span>
                      <strong className="d-block text-body">{s.libelle}</strong>
                      <small className="text-muted">{s.aide}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-3">
              <label className="form-label" htmlFor={`${modalId}-date`}>Date de départ</label>
              <input id={`${modalId}-date`} type="date" className="form-control" max={aujourdhui()} required
                value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label className="form-label" htmlFor={`${modalId}-motif`}>
                Motif <span className="text-muted fw-normal">(facultatif)</span>
              </label>
              <textarea id={`${modalId}-motif`} className="form-control" rows={2} maxLength={500}
                placeholder="ex. Raisons familiales, entrée dans un autre séminaire…"
                value={motif} onChange={(e) => setMotif(e.target.value)} />
              <div className="form-text">Son dossier, ses notes et ses bulletins sont conservés.</div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
            <button type="submit" className={`btn ${statut === 'diplome' ? 'btn-primary' : 'btn-danger'}`} disabled={enregistrement || !date}>
              {enregistrement ? 'Patientez…' : `Enregistrer${choix && statut !== 'diplome' ? ' et désactiver le compte' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SortieEtudiant;
