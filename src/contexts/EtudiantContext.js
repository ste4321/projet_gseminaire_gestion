import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const EtudiantContext = createContext();

export const EtudiantProvider = ({ children }) => {
  const [annees, setAnnees] = useState([]);
  const [etudiantsParFiltre, setEtudiantsParFiltre] = useState({});

  // Charger les années une seule fois
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/annee_aca')
      .then(res => setAnnees(res.data))
      .catch(console.error);
  }, []);

  const getEtudiants = async (idannee_aca, annee) => {
    const key = `${idannee_aca}_${annee}`;
    if (etudiantsParFiltre[key]) {
      return etudiantsParFiltre[key]; // déjà en cache
    } else {
      const res = await axios.get(`http://127.0.0.1:8000/api/etudiants`, {
        params: { idannee_aca, annee }
      });
      setEtudiantsParFiltre(prev => ({ ...prev, [key]: res.data }));
      return res.data;
    }
  };

  return (
    <EtudiantContext.Provider value={{ annees, getEtudiants }}>
      {children}
    </EtudiantContext.Provider>
  );
};

export const useEtudiant = () => useContext(EtudiantContext);
