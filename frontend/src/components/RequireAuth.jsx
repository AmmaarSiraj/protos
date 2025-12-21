// src/components/RequireAuth.jsx
import { useLocation, Navigate, Outlet } from "react-router-dom";

const RequireAuth = ({ allowedRoles }) => {
    const location = useLocation();
    
    // Ambil data dari LocalStorage
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    let user = null;

    try {
        user = JSON.parse(userString);
    } catch (error) {
        user = null;
    }

    // 1. Cek apakah user login (ada token & data user)
    if (!token || !user) {
        // Jika belum login, tendang ke halaman Login (/)
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 2. Cek Role (Jika halaman butuh role khusus, misal 'admin')
    // Jika allowedRoles disediakan, dan role user tidak ada di dalamnya
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Jika user memaksa masuk halaman admin tapi dia bukan admin
        // Kita bisa tendang ke halaman Home User atau kembali ke Login
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Jika lolos semua cek, tampilkan halaman yang diminta
    return <Outlet />;
};

export default RequireAuth;