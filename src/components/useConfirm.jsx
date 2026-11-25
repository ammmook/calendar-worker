import React, { useCallback, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

// const [confirm, confirmDialog] = useConfirm();
// const ok = await confirm({ tone, title, text, confirmLabel, cancelLabel });  → true/false
// ต้องเรนเดอร์ {confirmDialog} ไว้ใน JSX ของ component ที่เรียก hook
export default function useConfirm() {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((o) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={!!opts}
      {...opts}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );
  return [confirm, dialog];
}
