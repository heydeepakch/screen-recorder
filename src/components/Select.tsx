'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { forwardRef } from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onValueChange, options, placeholder, disabled, className = '' }, ref) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={`
            inline-flex items-center justify-between w-full px-4 py-2.5 
            bg-muted hover:bg-muted/90 rounded-lg text-sm text-foreground 
            border border-border transition-all duration-200 
            focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 
            disabled:opacity-50 disabled:cursor-not-allowed
            data-[placeholder]:text-muted-foreground
            ${className}
          `}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            {selectedOption?.label || placeholder}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="text-muted-foreground">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="
              overflow-hidden bg-muted rounded-lg border border-border shadow-lg
              z-50 min-w-[var(--radix-select-trigger-width)] max-h-[300px]
            "
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-muted text-foreground cursor-default">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="
                    relative flex items-center pl-8 pr-3 py-2 rounded-md text-sm text-foreground
                    cursor-pointer select-none outline-none
                    data-[disabled]:opacity-50 data-[disabled]:pointer-events-none
                    data-[highlighted]:bg-accent data-[highlighted]:text-black
                    focus:bg-accent focus:text-black
                  "
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-muted text-foreground cursor-default">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

Select.displayName = 'Select';
