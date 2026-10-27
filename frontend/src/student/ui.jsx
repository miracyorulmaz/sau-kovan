import React, { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';

export function Action({ children, busy, className = '', ...props }) {
  return <button {...props} className={`kv-button ${className}`} aria-busy={busy || undefined}>
    {busy ? <LoaderCircle className="kv-spin" size={19} aria-hidden="true" /> : null}{children}
  </button>;
}

export function Modal({ open, onClose, title, children, id, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`kv-modal ${className}`} aria-labelledby={`${id}-title`} onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="kv-modal-head"><h2 id={`${id}-title`}>{title}</h2>
      <button className="kv-icon-button" aria-label="Pencereyi kapat" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>;
}
