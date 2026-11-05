// Affichage des leçons (espace étudiant)

export const dateCourte = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Extension d'un nom de fichier, en minuscules (« Cours.PDF » → « pdf ») */
export const extension = (nom) => {
  const m = /\.([a-z0-9]+)$/i.exec(String(nom || ''));
  return m ? m[1].toLowerCase() : '';
};

/** Icône Boxicons selon le type de fichier joint */
export const iconeFichier = (nom) => {
  const ext = extension(nom);
  if (ext === 'pdf') return 'bxs-file-pdf';
  if (['doc', 'docx'].includes(ext)) return 'bxs-file-doc';
  if (['ppt', 'pptx'].includes(ext)) return 'bxs-slideshow';
  if (['xls', 'xlsx'].includes(ext)) return 'bxs-spreadsheet';
  if (ext === 'zip') return 'bxs-file-archive';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'bxs-file-image';
  return 'bxs-file';
};

/** Fichiers que le navigateur sait afficher directement dans la page */
export const apercuPossible = (nom) => ['pdf', 'jpg', 'jpeg', 'png'].includes(extension(nom));
