import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { NAVY, SURFACE, SURFACE2, BORDER } from '@/data/themePalette';

export function Select({ value = '', onValueChange, children, className = '' }) {
  const options = React.Children.toArray(children).filter(Boolean).map((child) => ({
    value: String(child.props.value ?? ''),
    label: child.props.children,
    disabled: child.props.disabled,
  }));
  const normalized = value === '' ? '__empty__' : String(value);
  return (
    <SelectPrimitive.Root value={normalized} onValueChange={(v) => onValueChange?.(v === '__empty__' ? '' : v)}>
      <SelectPrimitive.Trigger className={`w-full h-10 rounded-lg px-3 text-sm outline-none flex items-center justify-between gap-2 ${className}`} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: NAVY }}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon><ChevronDown size={15} /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={5} className="z-[120] min-w-[var(--radix-select-trigger-width)] rounded-lg shadow-xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item key={option.value || '__empty__'} value={option.value || '__empty__'} disabled={option.disabled} className="relative flex items-center rounded-md px-3 py-2 text-sm outline-none cursor-pointer data-[highlighted]:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: NAVY }}>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2"><Check size={14} /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
