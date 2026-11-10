// Menus de l'application, par rôle. Source unique pour la barre latérale et le titre des onglets.
// Une entrée { section } ouvre un groupe ; les autres sont des liens.
// badge : compteur affiché à côté du lien (voir Sidebar).

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
    { to: '/admin/calendrier', label: 'Calendrier académique', icon: 'bx-calendar-event' },
    { to: '/admin/messages', label: 'Messages du site', icon: 'bx-envelope', badge: 'messages' },

    { section: 'Paramètres' },
    { to: '/admin/portal', label: 'Comptes et accès', icon: 'bx-lock-open-alt' },
    { to: '/admin/annees', label: 'Années académiques', icon: 'bx-calendar-alt' },
    { to: '/admin/niveau', label: 'Niveaux', icon: 'bx-layer' },
    { to: '/admin/semestre', label: 'Semestres', icon: 'bx-calendar-check' },
  ],

  prof: [
    { to: '/prof/dashboard', label: 'Accueil', icon: 'bx-home-circle' },
    { to: '/prof/matieres', label: 'Mes matières', icon: 'bx-book' },
    { to: '/prof/notes', label: 'Saisie des notes', icon: 'bx-spreadsheet' },
    { to: '/prof/lecons', label: 'Mes leçons', icon: 'bx-book-open' },
    { to: '/prof/edt', label: 'Emploi du temps', icon: 'bx-calendar' },
    { to: '/prof/annonce', label: 'Annonces', icon: 'bx-message-square-dots' },
  ],

  etudiant: [
    { to: '/etudiant/dashboard', label: 'Accueil', icon: 'bx-home-circle' },
    { to: '/etudiant/notes', label: 'Mes notes', icon: 'bx-spreadsheet' },
    { to: '/etudiant/cours', label: 'Mes cours', icon: 'bx-book-open' },
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
