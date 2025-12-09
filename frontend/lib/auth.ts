

export const getToken = (): string | null => {
    // Trả về token từ localStorage
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const isAuthenticated = (): boolean => {
    // Kiểm tra xem token có tồn tại hay không 
    const token = getToken();
    return !!token;
};

export const logout = () => {
 
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login'; 
    }
};