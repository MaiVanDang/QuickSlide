// frontend/components/ui/theme-provider.tsx
'use client';
import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
// LỖI ĐÃ ĐƯỢC KHẮC PHỤC: Bắt buộc phải có từ khóa 'type'
import { type ThemeProviderProps } from 'next-themes'; 

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
}