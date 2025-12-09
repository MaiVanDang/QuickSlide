


interface AuthState {
    isLoggedIn: boolean;
    user: { id: string; name: string } | null;
 
}

// Giả định logic của AuthStore 
export const AuthStore = {
    
    getState: (): AuthState => {
        return {
            isLoggedIn: true,
            user: { id: "1", name: "Guest Editor" },
        };
    },
    subscribe: (listener: (state: AuthState) => void) => {
        return () => {};
    }
};