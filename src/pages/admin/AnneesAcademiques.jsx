import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnnee } from '../../contexts/AnneeContext';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { ListeChargement, FenetreFormulaire, ActionsLigne, fenetre, pluriel } from '../../components/Referentiel';

// Années académiques (« 2026-2027 »). L'année en cours est la plus récente qui a des inscrits (calculée par le serveur) :
// une année créée à l'avance est « préparée » jusqu'aux premières réinscriptions.
// Création : l'année reprend le programme de la précédente. Suppression : seulement une année sans inscription,
// annonce ni publication de notes (le serveur le vérifie aussi).

const FORMAT = /^(\d{4})-(\d{4})$/;
const normaliser = (texte) => String(texte ?? '').replace(/\s+/g, '');
const suivante = (annee) => {
  const m = FORMAT.exec(annee || '');
  return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
};
// Message de saisie : null si valide
const erreurAnnee = (texte, existantes) => {
  const m = FORMAT.exec(texte);
  if (!texte) return null;
  if (!m) return 'Format attendu : 2026-2027.';
  if (Number(m[2]) !== Number(m[1]) + 1) return 'La deuxième année doit suivre la première.';
  if (existantes.has(texte)) return 'Cette année existe déjà.';
  return null;
};

const AnneesAcademiques = () => {
  const { notify, confirm } = useFeedback();
  const { annees, loading, fetchAnnees } = useAnnee();
  const [saisie, setSaisie] = useState('');
  const [enEdition, setEnEdition] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Relu à chaque ouverture de la page : la liste gardée en mémoire par l'espace admin peut dater (chiffres périmés)
  useEffect(() => {
    fetchAnnees();
  }, [fetchAnnees]);

  const triees = useMemo(() => [...annees].sort((a, b) => b.annee_aca.localeCompare(a.annee_aca)), [annees]);
  const courante = triees.find((a) => a.courante) || null;

  const situation = (a) => {
    if (a.courante) return { classe: 'is-accent', badge: <span className="gstf-ref-badge gstf-ref-badge--accent">En cours</span> };
    if (!courante || a.annee_aca > courante.annee_aca) return { classe: '', badge: <span className="gstf-ref-badge">Préparée</span> };
    return { classe: 'is-passe', badge: <span className="gstf-ref-badge">Passée</span> };
  };

  // ---------- Formulaire ----------
  const texte = normaliser(saisie);
  const existantes = useMemo(() => new Set(triees.filter((a) => a.id !== enEdition?.id).map((a) => a.annee_aca)), [triees, enEdition]);
  const erreur = erreurAnnee(texte, existantes);
  const valide = Boolean(texte) && !erreur && texte !== enEdition?.annee_aca;

  const ouvrir = (annee = null) => {
    setEnEdition(annee);
    setSaisie(annee ? annee.annee_aca : suivante(triees[0]?.annee_aca));
    fenetre('anneeModal').show();
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setEnCours(true);
    try {
      const res = enEdition
        ? await api.put(`/annee_aca/${enEdition.id}`, { annee_aca: texte })
        : await api.post('/annee_aca', { annee_aca: texte });
      await fetchAnnees();
      fenetre('anneeModal').hide();
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (annee) => {
    const ok = await confirm({
      title: `Supprimer l'année ${annee.annee_aca} ?`,
      message: `Son programme (${pluriel(annee.matieres_count ?? 0, 'matière')}) sera supprimé avec elle. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api.delete(`/annee_aca/${annee.id}`);
      await fetchAnnees();
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Années académiques
          </h4>
          <small className="text-muted">Chaque inscription, programme, annonce et publication de notes appartient à une année.</small>
        </div>
        <button className="btn btn-primary" onClick={() => ouvrir()} disabled={loading}>
          <i className="bx bx-plus me-1"></i>Nouvelle année
        </button>
      </div>

      <div className="card">
        {!loading && triees.length > 0 && (
          <div className="gstf-ref-info">
            <i className="bx bx-info-circle" aria-hidden="true"></i>
            {courante ? (
              <span>
                Année en cours : <strong>{courante.annee_aca}</strong>, la plus récente qui a des étudiants inscrits.
                Une année préparée le devient dès les premières <Link to="/admin/reinscription">réinscriptions</Link>.
              </span>
            ) : (
              <span>Aucune année n'a encore d'inscrits : l'année en cours sera la plus récente dès les premières inscriptions.</span>
            )}
          </div>
        )}

        {loading ? (
          <ListeChargement large />
        ) : triees.length === 0 ? (
          <div className="gstf-empty">
            <i className="bx bx-calendar d-block"></i>
            Aucune année académique n'est encore créée.
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => ouvrir()}>Créer la première année</button>
            </div>
          </div>
        ) : (
          <ul className="gstf-ref-liste">
            {triees.map((a) => {
              const s = situation(a);
              const inscrits = a.inscrits_count ?? 0;
              const annonces = a.annonces_count ?? 0;
              const motif = (inscrits > 0 || annonces > 0)
                && `Impossible de supprimer : ${[inscrits && pluriel(inscrits, 'inscription'), annonces && pluriel(annonces, 'annonce')].filter(Boolean).join(' et ')} y sont rattachées`;
              return (
                <li key={a.id} className={`gstf-ref-ligne ${s.classe}`}>
                  <span className="gstf-ref-pastille gstf-ref-pastille--large" aria-hidden="true">{a.annee_aca}</span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="gstf-ref-titre">
                      Année {a.annee_aca}
                      {s.badge}
                    </div>
                    <div className="gstf-ref-meta">
                      <span><i className="bx bx-group" aria-hidden="true"></i>{pluriel(inscrits, 'inscrit')}</span>
                      <span><i className="bx bx-book" aria-hidden="true"></i>{pluriel(a.matieres_count ?? 0, 'matière')} au programme</span>
                      <span><i className="bx bx-message-square-dots" aria-hidden="true"></i>{pluriel(annonces, 'annonce')}</span>
                    </div>
                  </div>
                  <ActionsLigne
                    nom={`l'année ${a.annee_aca}`}
                    onModifier={() => ouvrir(a)}
                    onSupprimer={() => supprimer(a)}
                    suppressionImpossible={motif}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FenetreFormulaire
        id="anneeModal"
        titre={enEdition ? `Renommer l'année ${enEdition.annee_aca}` : 'Nouvelle année académique'}
        onSubmit={enregistrer}
        valide={valide}
        enCours={enCours}
        libelleValider={enEdition ? 'Renommer' : 'Créer'}
      >
        <label className="gstf-ref-champ" htmlFor="annee-libelle">Année académique</label>
        <input id="annee-libelle" type="text" inputMode="numeric" className={`form-control ${erreur ? 'is-invalid' : ''}`} required
          placeholder="2026-2027" maxLength={11} autoComplete="off"
          value={saisie} onChange={(e) => setSaisie(e.target.value)} />
        <div className="invalid-feedback">{erreur}</div>

        {enEdition ? (
          <div className="form-text mt-2">
            Pour corriger une faute de saisie. {(enEdition.inscrits_count ?? 0) > 0
              ? `Ses ${pluriel(enEdition.inscrits_count, 'inscription')}, ses notes et son programme restent rattachés.`
              : 'Son programme reste rattaché.'}
          </div>
        ) : (
          <div className="gstf-ref-apercu">
            {triees[0]
              ? <>Le programme de <strong>{triees[0].annee_aca}</strong> ({pluriel(triees[0].matieres_count ?? 0, 'matière')}) sera repris ; ajustez-le ensuite dans le menu Matières.</>
              : 'Le programme est vide : ajoutez-y les matières ensuite.'}
            <div className="text-muted small mt-1">L'année sera « préparée » jusqu'aux premières inscriptions.</div>
          </div>
        )}
      </FenetreFormulaire>
    </div>
  );
};

export default AnneesAcademiques;
