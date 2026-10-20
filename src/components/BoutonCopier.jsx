import React, { useEffect, useState } from 'react';

// Copie dans le presse-papiers. navigator.clipboard n'existe qu'en HTTPS (ou localhost) :
// sinon, repli sur l'ancienne méthode via un champ temporaire.
const copierTexte = async (texte) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texte);
    return;
  }
  const champ = document.createElement('textarea');
  champ.value = texte;
  champ.setAttribute('readonly', '');
  champ.style.position = 'fixed';
  champ.style.opacity = '0';
  document.body.appendChild(champ);
  champ.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(champ);
  if (!ok) throw new Error('copie refusée');
};

/** Petit bouton icône : copie `texte`, affiche une coche pendant un instant */
const BoutonCopier = ({ texte, libelle = 'Copier', className = '' }) => {
  const [etat, setEtat] = useState(null); // null | 'ok' | 'erreur'

  useEffect(() => {
    if (!etat) return undefined;
    const t = setTimeout(() => setEtat(null), 1500);
    return () => clearTimeout(t);
  }, [etat]);

  const copier = async (e) => {
    e.stopPropagation(); // dans un tableau : ne pas ouvrir la fiche de la ligne
    try {
      await copierTexte(texte);
      setEtat('ok');
    } catch {
      setEtat('erreur');
    }
  };

  const titre = etat === 'ok' ? 'Copié !' : etat === 'erreur' ? 'Copie impossible' : libelle;

  return (
    <button
      type="button"
      className={`gstf-copier ${etat ? `is-${etat}` : ''} ${className}`}
      onClick={copier}
      title={titre}
      aria-label={titre}
    >
      <i className={`bx ${etat === 'ok' ? 'bx-check' : etat === 'erreur' ? 'bx-error' : 'bx-copy'}`} aria-hidden="true"></i>
      <span className="visually-hidden" aria-live="polite">{etat === 'ok' ? 'Copié' : ''}</span>
    </button>
  );
};

export default BoutonCopier;
