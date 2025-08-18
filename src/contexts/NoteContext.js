import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const NotesContext = createContext();

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export const NotesProvider = ({ children }) => {
  // États pour les matières (cache par niveau)
  const [matieresByNiveau, setMatieresByNiveau] = useState({});
  const [loadingMatieres, setLoadingMatieres] = useState({});

  // États pour les notes (cache par parcours étudiant)
  const [notesByParcours, setNotesByParcours] = useState({});
  const [loadingNotes, setLoadingNotes] = useState({});

  // États pour les moyennes (cache par parcours étudiant)
  const [moyennesByParcours, setMoyennesByParcours] = useState({});
  const [loadingMoyennes, setLoadingMoyennes] = useState({});

  // État général de chargement
  const [globalLoading, setGlobalLoading] = useState(false);

  /**
   * Récupérer les matières par niveau avec mise en cache
   */
  const getMatieresByNiveau = useCallback(async (niveau, force = false) => {
    const cacheKey = `L${niveau}`;
    
    // Si les données sont en cache et on ne force pas le refresh
    if (matieresByNiveau[cacheKey] && !force) {
      return matieresByNiveau[cacheKey];
    }

    // Si une requête est déjà en cours pour ce niveau
    if (loadingMatieres[cacheKey]) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!loadingMatieres[cacheKey]) {
            resolve(matieresByNiveau[cacheKey] || []);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    try {
      setLoadingMatieres(prev => ({ ...prev, [cacheKey]: true }));
      
      const response = await axios.get(`http://127.0.0.1:8000/api/matieres/niveau/${niveau}`);
      const matieres = response.data;

      // Mettre en cache
      setMatieresByNiveau(prev => ({ ...prev, [cacheKey]: matieres }));
      
      return matieres;
    } catch (error) {
      console.error(`Erreur lors de la récupération des matières pour L${niveau}:`, error);
      throw error;
    } finally {
      setLoadingMatieres(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [matieresByNiveau, loadingMatieres]);

  /**
   * Récupérer les notes d'un étudiant par parcours avec mise en cache
   */
  const getNotesByParcours = useCallback(async (parcoursId, force = false) => {
    // Si les données sont en cache et on ne force pas le refresh
    if (notesByParcours[parcoursId] && !force) {
      return notesByParcours[parcoursId];
    }

    // Si une requête est déjà en cours pour ce parcours
    if (loadingNotes[parcoursId]) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!loadingNotes[parcoursId]) {
            resolve(notesByParcours[parcoursId] || []);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    try {
      setLoadingNotes(prev => ({ ...prev, [parcoursId]: true }));
      
      const response = await axios.get(`http://127.0.0.1:8000/api/notes/etudiant-parcours/${parcoursId}`);
      const notes = response.data;

      // Mettre en cache
      setNotesByParcours(prev => ({ ...prev, [parcoursId]: notes }));
      
      return notes;
    } catch (error) {
      console.error(`Erreur lors de la récupération des notes pour le parcours ${parcoursId}:`, error);
      throw error;
    } finally {
      setLoadingNotes(prev => ({ ...prev, [parcoursId]: false }));
    }
  }, [notesByParcours, loadingNotes]);

  /**
   * Récupérer les matières et notes simultanément pour optimiser les performances
   */
  const getNotesAndMatieres = useCallback(async (parcoursId, niveau, force = false) => {
    setGlobalLoading(true);
    
    try {
      // Exécuter les deux requêtes en parallèle
      const [matieres, notes] = await Promise.all([
        getMatieresByNiveau(niveau, force),
        getNotesByParcours(parcoursId, force)
      ]);

      return { matieres, notes };
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, [getMatieresByNiveau, getNotesByParcours]);

  /**
   * Sauvegarder les notes en lot et mettre à jour le cache
   */
  const saveBulkNotes = useCallback(async (parcoursId, notes) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/notes/update-bulk', {
        etudiant_parcours_id: parcoursId,
        notes: notes
      });

      // Mettre à jour le cache avec les nouvelles notes
      setNotesByParcours(prev => ({ ...prev, [parcoursId]: notes }));

      // Invalider le cache des moyennes pour ce parcours
      setMoyennesByParcours(prev => {
        const newMoyennes = { ...prev };
        delete newMoyennes[parcoursId];
        return newMoyennes;
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      throw error;
    }
  }, []);

  /**
   * Calculer la moyenne avec mise en cache
   */
  const calculateMoyenne = useCallback(async (parcoursId, force = false) => {
    // Si la moyenne est en cache et on ne force pas le refresh
    if (moyennesByParcours[parcoursId] && !force) {
      return moyennesByParcours[parcoursId];
    }

    // Si une requête est déjà en cours
    if (loadingMoyennes[parcoursId]) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!loadingMoyennes[parcoursId]) {
            resolve(moyennesByParcours[parcoursId] || null);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    try {
      setLoadingMoyennes(prev => ({ ...prev, [parcoursId]: true }));
      
      const response = await axios.get(`http://127.0.0.1:8000/api/notes/moyenne/${parcoursId}`);
      const moyenne = response.data;

      // Mettre en cache
      setMoyennesByParcours(prev => ({ ...prev, [parcoursId]: moyenne }));
      
      return moyenne;
    } catch (error) {
      console.error(`Erreur lors du calcul de la moyenne pour le parcours ${parcoursId}:`, error);
      throw error;
    } finally {
      setLoadingMoyennes(prev => ({ ...prev, [parcoursId]: false }));
    }
  }, [moyennesByParcours, loadingMoyennes]);

  /**
   * Précharger les matières pour tous les niveaux
   */
  const preloadMatieres = useCallback(async () => {
    const niveaux = [1, 2, 3];
    const promises = niveaux.map(niveau => getMatieresByNiveau(niveau));
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Erreur lors du préchargement des matières:', error);
    }
  }, [getMatieresByNiveau]);

  /**
   * Invalider le cache pour un parcours spécifique
   */
  const invalidateParcoursCache = useCallback((parcoursId) => {
    setNotesByParcours(prev => {
      const newNotes = { ...prev };
      delete newNotes[parcoursId];
      return newNotes;
    });

    setMoyennesByParcours(prev => {
      const newMoyennes = { ...prev };
      delete newMoyennes[parcoursId];
      return newMoyennes;
    });
  }, []);

  /**
   * Invalider le cache des matières pour un niveau
   */
  const invalidateMatieresCache = useCallback((niveau) => {
    const cacheKey = `L${niveau}`;
    setMatieresByNiveau(prev => {
      const newMatieres = { ...prev };
      delete newMatieres[cacheKey];
      return newMatieres;
    });
  }, []);

  /**
   * Vider tout le cache
   */
  const clearCache = useCallback(() => {
    setMatieresByNiveau({});
    setNotesByParcours({});
    setMoyennesByParcours({});
  }, []);

  /**
   * Obtenir une note spécifique pour une matière
   */
  const getNoteForMatiere = useCallback((parcoursId, matiereId) => {
    const notes = notesByParcours[parcoursId] || [];
    const note = notes.find(n => n.id_matiere === matiereId);
    return note ? note.note : '';
  }, [notesByParcours]);

  /**
   * Mettre à jour une note dans le cache local (pour l'UI réactive)
   */
  const updateNoteInCache = useCallback((parcoursId, matiereId, noteValue) => {
    setNotesByParcours(prev => {
      const currentNotes = prev[parcoursId] || [];
      const existingNoteIndex = currentNotes.findIndex(n => n.id_matiere === matiereId);
      
      if (existingNoteIndex >= 0) {
        // Mettre à jour la note existante
        const updatedNotes = [...currentNotes];
        updatedNotes[existingNoteIndex] = {
          ...updatedNotes[existingNoteIndex],
          note: noteValue
        };
        return { ...prev, [parcoursId]: updatedNotes };
      } else {
        // Ajouter une nouvelle note
        const newNote = {
          id_etudiant_parcours: parcoursId,
          id_matiere: matiereId,
          note: noteValue,
          statut: ''
        };
        return { ...prev, [parcoursId]: [...currentNotes, newNote] };
      }
    });

    // Invalider le cache des moyennes
    setMoyennesByParcours(prev => {
      const newMoyennes = { ...prev };
      delete newMoyennes[parcoursId];
      return newMoyennes;
    });
  }, []);

  // Précharger les matières au montage du composant
  useEffect(() => {
    preloadMatieres();
  }, [preloadMatieres]);

  // Statistiques du cache (utile pour le debug)
  const getCacheStats = useCallback(() => {
    return {
      matieres: {
        niveaux_cached: Object.keys(matieresByNiveau).length,
        loading: Object.values(loadingMatieres).some(Boolean)
      },
      notes: {
        parcours_cached: Object.keys(notesByParcours).length,
        loading: Object.values(loadingNotes).some(Boolean)
      },
      moyennes: {
        parcours_cached: Object.keys(moyennesByParcours).length,
        loading: Object.values(loadingMoyennes).some(Boolean)
      }
    };
  }, [matieresByNiveau, loadingMatieres, notesByParcours, loadingNotes, moyennesByParcours, loadingMoyennes]);

  const value = {
    // Données
    matieresByNiveau,
    notesByParcours,
    moyennesByParcours,
    
    // États de chargement
    loadingMatieres,
    loadingNotes,
    loadingMoyennes,
    globalLoading,
    
    // Fonctions principales
    getMatieresByNiveau,
    getNotesByParcours,
    getNotesAndMatieres,
    saveBulkNotes,
    calculateMoyenne,
    
    // Fonctions utilitaires
    getNoteForMatiere,
    updateNoteInCache,
    
    // Gestion du cache
    preloadMatieres,
    invalidateParcoursCache,
    invalidateMatieresCache,
    clearCache,
    getCacheStats,
    
    // Vérifications d'état
    isMatieresLoading: (niveau) => loadingMatieres[`L${niveau}`] || false,
    isNotesLoading: (parcoursId) => loadingNotes[parcoursId] || false,
    isMoyenneLoading: (parcoursId) => loadingMoyennes[parcoursId] || false,
    
    // Vérifications de cache
    hasMatieresInCache: (niveau) => Boolean(matieresByNiveau[`L${niveau}`]),
    hasNotesInCache: (parcoursId) => Boolean(notesByParcours[parcoursId]),
    hasMoyenneInCache: (parcoursId) => Boolean(moyennesByParcours[parcoursId])
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};