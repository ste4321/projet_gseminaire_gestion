// src/components/Portal.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';
import { useUserCession } from '../contexts/UserCessionContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { getUser } from '../auth/session';
import MotDePasseProvisoire from './MotDePasseProvisoire';

const roles = ['admin', 'prof', 'etudiant'];
const ROLE_TABS = { admin: 'Administrateurs', prof: 'Enseignants', etudiant: 'Étudiants' };

const Portal = () => {
  const { notify, confirm } = useFeedback();
  const { usersByRole, fetchUsers, updateUserLocal, loadingByRole } = useUserCession();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [togglingId, setTogglingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois
  const currentUserId = getUser()?.id;

  // États pour la sélection multiple
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkTogglingType, setBulkTogglingType] = useState(null); // 'activate' | 'deactivate'

  useEffect(() => {
    fetchUsers(selectedRole);
  }, [selectedRole, fetchUsers]);

  // Optimisation: mémorisation du filtrage
  const filtered = useMemo(() => {
    const usersForRole = usersByRole[selectedRole] || [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return usersForRole;

    return usersForRole.filter(u => {
      return (
        (u.email || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        (u.nom_prenom || '').toLowerCase().includes(term)
      );
    });
  }, [usersByRole, selectedRole, searchTerm]);

  // Optimisation: mémorisation de la pagination
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentUsers = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    return { totalPages, currentUsers };
  }, [filtered, currentPage, itemsPerPage]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(0);
    setSelectedUsers(new Set()); // Reset selection when searching
  }, []);

  const handleRoleChange = useCallback((role) => {
    setSelectedRole(role);
    setCurrentPage(0);
    setSelectedUsers(new Set()); // Reset selection when changing role
  }, []);

  // Toggle individual user
  const handleToggle = async (user) => {
    setTogglingId(user.id);
    try {
      const res = await api.patch(`/user-cessions/${user.id}/toggle`);
      updateUserLocal(selectedRole, user.id, { is_verified: res.data.is_verified });
      notify.success(`${user.nom_prenom || user.email} : accès ${res.data.is_verified ? 'activé' : 'désactivé'}.`);

      // Update selection if this user was selected
      if (selectedUsers.has(user.id)) {
        setSelectedUsers(prev => new Set([...prev].filter(id => id !== user.id)));
      }
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la mise à jour. Réessayez.'));
    } finally {
      setTogglingId(null);
    }
  };

  // Gestion de la sélection
  const handleSelectUser = (userId, isSelected) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedUsers(new Set(paginationData.currentUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Actions en lot
  const handleBulkToggle = async (action) => {
    if (selectedUsers.size === 0) {
      notify.warning('Aucun utilisateur sélectionné.');
      return;
    }

    const isActivating = action === 'activate';
    if (!isActivating && !(await confirm({
      title: 'Désactiver les comptes ?',
      message: `${selectedUsers.size} compte(s) ne pourront plus se connecter jusqu'à leur réactivation.`,
      confirmLabel: 'Désactiver',
      danger: true,
    }))) {
      return;
    }
    setBulkTogglingType(action);

    try {
      const userIds = Array.from(selectedUsers);
      const res = await api.patch('/user-cessions/bulk-toggle', {
        user_ids: userIds,
        is_verified: isActivating
      });

      // Mise à jour locale (le serveur ignore toujours le compte de l'admin connecté)
      userIds.filter(userId => userId !== currentUserId).forEach(userId => {
        updateUserLocal(selectedRole, userId, { is_verified: isActivating });
      });

      setSelectedUsers(new Set());
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la mise à jour en lot. Réessayez.'));
    } finally {
      setBulkTogglingType(null);
    }
  };

  const handleResetPassword = async (user) => {
    const nom = user.nom_prenom || user.email;
    const ok = await confirm({
      title: 'Réinitialiser le mot de passe ?',
      message: `Un nouveau mot de passe provisoire sera généré pour ${nom}.\nSon mot de passe actuel ne fonctionnera plus et ses sessions ouvertes seront fermées.`,
      confirmLabel: 'Réinitialiser',
      danger: true,
    });
    if (!ok) return;

    setResettingId(user.id);
    try {
      const res = await api.post(`/user-cessions/${user.id}/reset-password`);
      updateUserLocal(selectedRole, user.id, { must_change_password: true });
      setIdentifiants({ nom: user.nom_prenom, email: res.data.email, mot_de_passe: res.data.mot_de_passe });
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la réinitialisation du mot de passe.'));
    } finally {
      setResettingId(null);
    }
  };

  const loading = !!loadingByRole[selectedRole];
  const { totalPages, currentUsers } = paginationData;

  const tableHeaders = [
    {
      label: (
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedUsers.size > 0 && selectedUsers.size === currentUsers.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            disabled={loading || currentUsers.length === 0}
          />
        </div>
      ),
      field: 'select'
    },
    { label: 'Nom', field: 'nom_prenom' },
    { label: 'Email', field: 'email' },
    { label: 'Créé', field: 'created_at' },
    { label: 'Accès', field: 'is_verified' },
    { label: 'Mot de passe', field: 'password' }
  ];

  const renderCell = (row, field) => {
    if (field === 'select') {
      return (
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedUsers.has(row.id)}
            onChange={(e) => handleSelectUser(row.id, e.target.checked)}
            disabled={togglingId !== null || bulkTogglingType !== null}
          />
        </div>
      );
    }

    if (field === 'is_verified') {
      if (togglingId === row.id) {
        return (
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <small>En cours...</small>
          </div>
        );
      }
      return (
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            checked={!!row.is_verified}
            onChange={() => handleToggle(row)}
            style={{ cursor: 'pointer' }}
            disabled={togglingId !== null || bulkTogglingType !== null || row.id === currentUserId}
            title={row.id === currentUserId ? 'Vous ne pouvez pas désactiver votre propre compte' : undefined}
          />
          <label className="form-check-label ms-2">
            {row.is_verified ? 'Activé' : 'Désactivé'}
          </label>
        </div>
      );
    }

    if (field === 'password') {
      return (
        <div className="d-flex align-items-center gap-2">
          {row.must_change_password ? (
            <span className="badge bg-label-warning" title="L'utilisateur doit le changer à sa prochaine connexion">Provisoire</span>
          ) : (
            <span className="badge bg-label-success">Personnel</span>
          )}
          {row.id !== currentUserId && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => handleResetPassword(row)}
              disabled={resettingId !== null}
              title="Générer un nouveau mot de passe provisoire"
            >
              {resettingId === row.id ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <><i className="bx bx-reset me-1"></i>Réinitialiser</>
              )}
            </button>
          )}
        </div>
      );
    }

    if (field === 'created_at' || field === 'updated_at') {
      return row[field] ? new Date(row[field]).toLocaleString() : '--';
    }

    return row[field] ?? '--';
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">Admin /</span> Portail
      </h4>

      <ul className="nav nav-pills mb-3">
        {roles.map(r => (
          <li className="nav-item" key={r}>
            <button
              className={`nav-link ${selectedRole === r ? 'active' : ''}`}
              onClick={() => handleRoleChange(r)}
            >
              {ROLE_TABS[r]}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <h5 className="card-header d-flex justify-content-between align-items-center">
          <span>Comptes — {ROLE_TABS[selectedRole]}</span>
        </h5>

        <div className="card-body pb-0">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            placeholder="Rechercher..."
          />
        </div>

        <div className="table-responsive text-nowrap">
        {selectedUsers.size > 0 && (
            <div className="btn-group mb-3 ms-4" role="group">
              <span className="text-secondary display-8 mb-0 me-2">
                {selectedUsers.size} sélectionné{selectedUsers.size > 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                onClick={() => handleBulkToggle('activate')}
                disabled={bulkTogglingType !== null}
              >
                {bulkTogglingType === 'activate' && (
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                )}
                Activer
              </button>
              <button
                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                onClick={() => handleBulkToggle('deactivate')}
                disabled={bulkTogglingType !== null}
              >
                {bulkTogglingType === 'deactivate' && (
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                )}
                Désactiver
              </button>
            </div>
          )}
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 mb-0">Chargement des comptes...</p>
            </div>
          ) : (
            <DataTable
              headers={tableHeaders}
              data={currentUsers}
              role="admin"
              showActions={false}
              renderCell={renderCell}
            />
          )}
        </div>

        {!loading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default Portal;