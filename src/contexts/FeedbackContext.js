// Retours visuels de l'application : notifications (toasts) et confirmations.
// Remplace window.alert / window.confirm, qui bloquent la page et ne s'intègrent pas au design.
//
//   const { notify, confirm } = useFeedback();
//   notify.success('Étudiant ajouté.');
//   notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
//   if (await confirm({ title: 'Supprimer ?', message: '…', confirmLabel: 'Supprimer', danger: true })) { … }
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const FeedbackContext = createContext(null);

const STYLES = {
  success: { icon: 'bx-check-circle', className: 'gstf-toast--success', title: 'Succès' },
  error: { icon: 'bx-error-circle', className: 'gstf-toast--error', title: 'Erreur' },
  warning: { icon: 'bx-error', className: 'gstf-toast--warning', title: 'Attention' },
  info: { icon: 'bx-info-circle', className: 'gstf-toast--info', title: 'Information' },
};

const DUREE = { success: 4000, info: 5000, warning: 7000, error: 8000 };

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, options = {}) => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-4), { id, type, message, title: options.title }]);
    setTimeout(() => dismiss(id), options.duration ?? DUREE[type]);
    return id;
  }, [dismiss]);

  const notify = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
  }), [push]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve });
  }), []);

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="gstf-toasts" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const style = STYLES[t.type];
          return (
            <div key={t.id} className={`gstf-toast ${style.className}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <i className={`bx ${style.icon} gstf-toast__icon`} aria-hidden="true"></i>
              <div className="gstf-toast__body">
                <strong>{t.title || style.title}</strong>
                <div className="gstf-toast__message">{t.message}</div>
              </div>
              <button type="button" className="btn-close" aria-label="Fermer" onClick={() => dismiss(t.id)}></button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="gstf-confirm-title"
            onKeyDown={(e) => e.key === 'Escape' && closeDialog(false)}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="gstf-confirm-title">
                    {dialog.danger && <i className="bx bx-error text-danger me-2" aria-hidden="true"></i>}
                    {dialog.title || 'Confirmation'}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Fermer" onClick={() => closeDialog(false)}></button>
                </div>
                {dialog.message && <div className="modal-body" style={{ whiteSpace: 'pre-line' }}>{dialog.message}</div>}
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => closeDialog(false)}>
                    {dialog.cancelLabel || 'Annuler'}
                  </button>
                  <button type="button" autoFocus className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => closeDialog(true)}>
                    {dialog.confirmLabel || 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback doit être utilisé dans <FeedbackProvider>');
  }
  return context;
};
