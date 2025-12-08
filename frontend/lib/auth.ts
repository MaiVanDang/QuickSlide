// File này thường chứa các hàm helper để quản lý token và trạng thái đăng nhập
// Ví dụ:

export const getToken = (): string | null => {
    // Trả về token từ localStorage
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const isAuthenticated = (): boolean => {
    // Kiểm tra xem token có tồn tại hay không (kiểm tra token hết hạn phức tạp hơn)
    const token = getToken();
    return !!token;
};

export const logout = () => {
    // Xóa token và chuyển hướng
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Sau khi logout, nên chuyển hướng đến trang đăng nhập
        window.location.href = '/login'; 
    }
};