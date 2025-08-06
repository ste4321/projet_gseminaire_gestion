import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const NoteContext = createContext();

export const NoteProvider = ({ children }) => {
  const [matiereParNiveau, setMatiereParNiveau] = useState({});
  const [notesParEtudiant, setNotesParEtudiant] = useState({});

  // 🔹 Obtenir et mettre en cache les matières d’un niveau
  const getMatieresByNiveau = async (niveau) => {
    if (matiereParNiveau[niveau]) {
      return matiereParNiveau[niveau];
    }
    const response = await axios.get(`http://127.0.0.1:8000/api/matieres/niveau/${niveau}`);
    setMatiereParNiveau(prev => ({ ...prev, [niveau]: response.data }));
    return response.data;
  };

  // 🔹 Obtenir et mettre en cache les notes d’un étudiant
  const getNotesByParcours = async (parcoursId) => {
    if (notesParEtudiant[parcoursId]) {
      return notesParEtudiant[parcoursId];
    }
    const response = await axios.get(`http://127.0.0.1:8000/api/notes/etudiant-parcours/${parcoursId}`);
    setNotesParEtudiant(prev => ({ ...prev, [parcoursId]: response.data }));
    return response.data;
  };

  // 🔹 Mettre à jour les notes localement
  const updateNotesLocal = (parcoursId, newNotes) => {
    setNotesParEtudiant(prev => ({ ...prev, [parcoursId]: newNotes }));
  };

  return (
    <NoteContext.Provider value={{ getMatieresByNiveau, getNotesByParcours, updateNotesLocal }}>
      {children}
    </NoteContext.Provider>
  );
};

export const useNote = () => useContext(NoteContext);
