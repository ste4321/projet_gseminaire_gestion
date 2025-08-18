// src/components/Portal.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';
import { useUserCession } from '../contexts/UserCessionContext';
import axios from 'axios';

const roles = ['admin', 'prof', 'etudiant'];

const Portal = () => {
  const { usersByRole, fetchUsers, updateUserLocal, loadingByRole } = useUserCession();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [togglingId, setTogglingId] = useState(null);
  
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
      const res = await axios.patch(`http://127.0.0.1:8000/api/user-cessions/${user.id}/toggle`);
      updateUserLocal(selectedRole, user.id, { is_verified: res.data.is_verified });
      
      // Update selection if this user was selected
      if (selectedUsers.has(user.id)) {
        setSelectedUsers(prev => new Set([...prev].filter(id => id !== user.id)));
      }
    } catch (err) {
      console.error('toggle error', err);
      alert('Erreur lors de la mise à jour. Réessayez.');
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
      alert('Aucun utilisateur sélectionné');
      return;
    }

    const isActivating = action === 'activate';
    setBulkTogglingType(action);

    try {
      const userIds = Array.from(selectedUsers);
      const res = await axios.patch('http://127.0.0.1:8000/api/user-cessions/bulk-toggle', {
        user_ids: userIds,
        is_verified: isActivating
      });

      // Mise à jour locale des utilisateurs
      userIds.forEach(userId => {
        updateUserLocal(selectedRole, userId, { is_verified: isActivating });
      });

      setSelectedUsers(new Set());
      alert(`${userIds.length} utilisateur(s) ${isActivating ? 'activé(s)' : 'désactivé(s)'} avec succès`);
    } catch (err) {
      console.error('bulk toggle error', err);
      alert('Erreur lors de la mise à jour en lot. Réessayez.');
    } finally {
      setBulkTogglingType(null);
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
    { label: 'Accès', field: 'is_verified' }
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
            disabled={togglingId !== null || bulkTogglingType !== null}
          />
          <label className="form-check-label ms-2">
            {row.is_verified ? 'Activé' : 'Désactivé'}
          </label>
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
              Portal {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <h5 className="card-header d-flex justify-content-between align-items-center">
          <span>Gestion des accès — {selectedRole}</span>
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
    </div>
  );
};

export default Portal;