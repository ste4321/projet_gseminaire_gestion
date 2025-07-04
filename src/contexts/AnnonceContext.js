// contexts/AnnonceContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AnnonceContext = createContext();

export const AnnonceProvider = ({ children }) => {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnonces = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/annonces');
      setAnnonces(res.data);
    } catch (err) {
      console.error('Erreur fetch annonces:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAnnonces();
  }, []);

  return (
    <AnnonceContext.Provider value={{ annonces, loading, fetchAnnonces }}>
      {children}
    </AnnonceContext.Provider>
  );
};

export const useAnnonce = () => useContext(AnnonceContext);
