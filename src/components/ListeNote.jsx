import React, { useState } from 'react';

const ListeNote = () => {
  // Données statiques de démonstration
  const [notes] = useState([
    {
      id: 1,
      matricule: 'ETU001',
      nom: 'Rakoto Jean',
      matiere: 'Mathématiques',
      note: 15,
      niveau: 'L1',
      annee: '2024-2025',
    },
    {
      id: 2,
      matricule: 'ETU002',
      nom: 'Randria Anna',
      matiere: 'Informatique',
      note: 17,
      niveau: 'L1',
      annee: '2024-2025',
    },
  ]);

  // États pour les modales
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Fonctions d’action
  const handleShowDetail = (note) => {
    setSelectedNote(note);
    setShowDetail(true);
  };

  const handleShowEdit = (note) => {
    setSelectedNote(note);
    setShowEdit(true);
  };

  const handleShowDelete = (note) => {
    setSelectedNote(note);
    setShowDelete(true);
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Liste des notes</h3>
      <table className="table table-bordered">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Matricule</th>
            <th>Nom</th>
            <th>Matière</th>
            <th>Note</th>
            <th>Niveau</th>
            <th>Année</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note, index) => (
            <tr key={note.id}>
              <td>{index + 1}</td>
              <td>{note.matricule}</td>
              <td>{note.nom}</td>
              <td>{note.matiere}</td>
              <td>{note.note}</td>
              <td>{note.niveau}</td>
              <td>{note.annee}</td>
              <td>
                <button className="btn btn-sm btn-info me-1" onClick={() => handleShowDetail(note)}>
                  🔍
                </button>
                <button className="btn btn-sm btn-warning me-1" onClick={() => handleShowEdit(note)}>
                  ✏️
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleShowDelete(note)}>
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modale de détail */}
      {showDetail && selectedNote && (
        <div className="modal show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Détail de la note</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Matricule :</strong> {selectedNote.matricule}</p>
                <p><strong>Nom :</strong> {selectedNote.nom}</p>
                <p><strong>Matière :</strong> {selectedNote.matiere}</p>
                <p><strong>Note :</strong> {selectedNote.note}</p>
                <p><strong>Niveau :</strong> {selectedNote.niveau}</p>
                <p><strong>Année :</strong> {selectedNote.annee}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'édition */}
      {showEdit && selectedNote && (
        <div className="modal show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Modifier la note</h5>
                <button type="button" className="btn-close" onClick={() => setShowEdit(false)}></button>
              </div>
              <div className="modal-body">
                <p>Formulaire de modification (à implémenter)</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary">Enregistrer</button>
                <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de suppression */}
      {showDelete && selectedNote && (
        <div className="modal show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Supprimer la note</h5>
                <button type="button" className="btn-close" onClick={() => setShowDelete(false)}></button>
              </div>
              <div className="modal-body">
                <p>Confirmez-vous la suppression de la note de <strong>{selectedNote.nom}</strong> ?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger">Supprimer</button>
                <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeNote;
