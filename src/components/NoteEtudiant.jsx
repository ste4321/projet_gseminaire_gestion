import React, { useState, useEffect } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';

const NoteEtudiant = () => {
  const [role] = useState(localStorage.getItem('role'));
  const [selectedAca, setSelectedAca] = useState(null);
  const [niveau, setNiveau] = useState(1); // 1 = L1, 2 = L2, 3 = L3
  const [etudiants, setEtudiants] = useState([]);
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { annees, getEtudiants } = useEtudiant();

  // Initialiser l'année académique si ce n’est pas encore sélectionné
  useEffect(() => {
    if (annees.length && !selectedAca) {
      setSelectedAca(annees[0].id);
    }
  }, [annees, selectedAca]);

  // Récupération des étudiants selon le filtre (année et niveau)
  useEffect(() => {
    if (selectedAca) {
      getEtudiants(selectedAca, niveau).then(setEtudiants);
    }
  }, [selectedAca, niveau, getEtudiants]);

  // Afficher les détails de l'étudiant dans une modale
  const openDetailModal = (etudiant) => {
    setSelectedEtudiant(etudiant);
    new window.bootstrap.Modal(document.getElementById('detailModal')).show();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Notes
      </h4>

      {/* 🔹 Filtre année académique */}
      <div className="mb-3">
        <label>Année académique:</label>
        <select
          className="form-control w-auto d-inline ms-2"
          value={selectedAca || ''}
          onChange={e => setSelectedAca(Number(e.target.value))}
        >
          {annees.map(a => (
            <option key={a.id} value={a.id}>{a.annee_aca}</option>
          ))}
        </select>
      </div>

      {/* 🔹 Sélecteur de niveau (L1–L3) */}
      <ul className="nav nav-pills mb-3">
        {[1, 2, 3].map(i => (
          <li className="nav-item" key={i}>
            <button
              className={`nav-link ${niveau === i ? 'active' : ''}`}
              onClick={() => setNiveau(i)}
            >
              Liste des étudiants en L{i}
            </button>
          </li>
        ))}
      </ul>

      {/* 🔹 Tableau des étudiants */}
      <div className="card">
        <h5 className="card-header">
          Liste des étudiants en L{niveau} — {annees.find(a => a.id === selectedAca)?.annee_aca || ''}
        </h5>
        <div className="px-4 py-3">
            <input 
                type="text"
                className="form-control"
                placeholder="Rechercher par nom ou prénom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Nom & Prénom</th>
                <th>Diocèse</th>
                <th>Niveau</th>
              </tr>
            </thead>
            <tbody>
            {etudiants
                .filter(e =>
                    e.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(e => (
                <tr key={e.numero}>
                  <td>{e.numero}</td>
                  <td>
                    <button
                      className="btn p-0 text-primary"
                      onClick={() => openDetailModal(e)}
                    >
                      {e.nom_prenom}
                    </button>
                  </td>
                  <td>{e.diocese}</td>
                  <td>L{e.annee}</td>
                </tr>
              ))}
              {etudiants.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-3">Chargement en cours ...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 Modal détails étudiant */}
      <div className="modal fade" id="detailModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{selectedEtudiant?.nom_prenom}</h5>
              {/* <button type="button" className="btn-close" data-bs-dismiss="modal"></button> */}
            </div>
            <div className="modal-body">
  {selectedEtudiant ? (
    <>
      <p><strong>Immatricule :</strong> {selectedEtudiant.numero}</p>
      <p><strong>Diocèse :</strong> {selectedEtudiant.diocese}</p>
      <p><strong>Niveau :</strong> L{selectedEtudiant.annee}</p>
      <p><u><strong>Note :</strong></u></p>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Note /20</th>
              <th>Coefficient</th>
              <th>Mention</th>
            </tr>
          </thead>
          <tbody>
            {/* ✅ Données statiques temporaires */}
            {[
              { matiere: "Français", note: 12, coef: 2 },
              { matiere: "Mathématiques", note: 16, coef: 3 },
              { matiere: "Histoire", note: 10, coef: 2 },
              { matiere: "Anglais", note: 14, coef: 1 },
            ].map((m, i) => {
              const mention =
                m.note >= 16 ? "Très bien" :
                m.note >= 14 ? "Bien" :
                m.note >= 12 ? "Assez bien" :
                m.note >= 10 ? "Passable" : "Insuffisant";

              return (
                <tr key={i}>
                  <td>{m.matiere}</td>
                  <td>{m.note}</td>
                  <td>{m.coef}</td>
                  <td>{mention}</td>
                </tr>
              );
            })}

            {/* ✅ Moyenne calculée */}
            {
              (() => {
                const notes = [
                  { note: 12, coef: 2 },
                  { note: 16, coef: 3 },
                  { note: 10, coef: 2 },
                  { note: 14, coef: 1 },
                ];
                const totalCoef = notes.reduce((sum, n) => sum + n.coef, 0);
                const totalNote = notes.reduce((sum, n) => sum + n.note * n.coef, 0);
                const moyenne = (totalNote / totalCoef).toFixed(2);

                const mentionGlobale =
                  moyenne >= 16 ? "Très bien" :
                  moyenne >= 14 ? "Bien" :
                  moyenne >= 12 ? "Assez bien" :
                  moyenne >= 10 ? "Passable" : "Insuffisant";

                return (
                  <>
                    <tr className="table-active">
                      <td colSpan="2"><strong>Total coefficients :</strong> {totalCoef}</td>
                      <td colSpan="2"><strong>Total pondéré :</strong> {totalNote}</td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="text-end">
                        <strong>Moyenne Générale : {moyenne}/20</strong>
                        <span className="ms-3 badge bg-primary">{mentionGlobale}</span>
                      </td>
                    </tr>
                  </>
                );
              })()
            }
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <p>Chargement…</p>
  )}
</div>

            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEtudiant;
