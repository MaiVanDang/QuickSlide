// frontend/hooks/useAuthContext.tsx
'use client'
import * as React from 'react';
import { useAuth } from './useAuth'; // Hook logic đã tạo trước đó

interface AuthContextType {
    isAuthenticated: boolean;
    user: { id: number; username: string; email: string } | null;
    isLoading: boolean;
    login: ReturnType<typeof useAuth>['login'];
    logout: ReturnType<typeof useAuth>['logout'];
}

// 1. Tạo Context
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// 2. Provider Component (Bao bọc logic và cung cấp trạng thái)
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Lấy logic trạng thái từ hook useAuth.ts
    const auth = useAuth(); 
    
    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Hook tiêu thụ (Consumer Hook)
export function useAuthContext() {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext は AuthProvider 内で使用してください');
    }
    return context;
}