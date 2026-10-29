// Menus de l'application, par rôle. Source unique pour la barre latérale et le titre des onglets.
// Une entrée { section } ouvre un groupe ; les autres sont des liens.

export const ROLE_LABELS = {
  admin: 'Administration',
  prof: 'Enseignant',
  etudiant: 'Étudiant',
};

export const MENUS = {
  admin: [
    { to: '/admin/dashboard', label: 'Tableau de bord', icon: 'bx-home-circle' },

    { section: 'Scolarité' },
    { to: '/admin/listeEtudiant', label: 'Étudiants', icon: 'bx-group' },
    { to: '/admin/reinscription', label: 'Réinscriptions', icon: 'bx-transfer-alt' },
    { to: '/admin/noteEtudiant', label: 'Notes', icon: 'bx-spreadsheet' },
    { to: '/admin/matiere', label: 'Matières', icon: 'bx-book' },
    { to: '/admin/edt', label: 'Emploi du temps', icon: 'bx-calendar' },
    { to: '/admin/listeProf', label: 'Enseignants', icon: 'bx-user-voice' },

    { section: 'Communication' },
    { to: '/admin/annonce', label: 'Annonces', icon: 'bx-message-square-dots' },
    { to: '/admin/info', label: 'Actualités du site', icon: 'bx-globe' },

    { section: 'Paramètres' },
    { to: '/admin/portal', label: 'Comptes et accès', icon: 'bx-lock-open-alt' },
    { to: '/admin/niveau', label: 'Niveaux', icon: 'bx-layer' },
    { to: '/admin/semestre', label: 'Semestres', icon: 'bx-calendar-check' },
  ],

  prof: [
    { to: '/prof/dashboard', label: 'Accueil', icon: 'bx-home-circle' },
    { to: '/prof/annonce', label: 'Annonces', icon: 'bx-message-square-dots' },
  ],

  etudiant: [
    { to: '/etudiant/dashboard', label: 'Accueil', icon: 'bx-home-circle' },
    { to: '/etudiant/notes', label: 'Mes notes', icon: 'bx-spreadsheet' },
    { to: '/etudiant/edt', label: 'Emploi du temps', icon: 'bx-calendar' },
    { to: '/etudiant/listeProf', label: 'Enseignants', icon: 'bx-user-voice' },
    { to: '/etudiant/annonce', label: 'Annonces', icon: 'bx-message-square-dots' },
  ],
};

export const pageTitle = (role, pathname) => {
  const item = (MENUS[role] || []).find((i) => i.to && pathname.startsWith(i.to));
  if (pathname === '/changer-mot-de-passe') return 'Changer mon mot de passe';
  return item?.label;
};
