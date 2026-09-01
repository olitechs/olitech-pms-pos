import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ERR } from '@/data/themePalette';

export default function PrintWarn({ message }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(154,102,22,0.12)', color: ERR, border: `1px solid ${ERR}55` }}>
      <AlertTriangle size={14} style={{ flexShrink: 0 }} /> <span>{message}</span>
    </div>
  );
}