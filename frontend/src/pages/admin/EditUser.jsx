// src/pages/admin/EditUser.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaUserShield, 
  FaSave,
  FaExclamationCircle 
} from 'react-icons/fa';

const EditUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State Form
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [password, setPassword] = useState('');

    // State UI
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoadError("Autentikasi gagal. Silakan login kembali.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await axios.get(
                    `http://makinasik.web.bps.go.id/api/users/${id}`, 
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                // --- PERBAIKAN DI SINI ---
                // Respons Laravel: { status: 'success', data: { ...user... } }
                // Axios membungkusnya dalam .data
                // Jadi kita butuh: response.data.data
                const userData = response.data.data;

                if (userData) {
                    setUsername(userData.username);
                    setEmail(userData.email);
                    setRole(userData.role);
                } else {
                    setLoadError("Data user tidak ditemukan dalam respons.");
                }

            } catch (err) {
                console.error("Gagal mengambil data user:", err);
                setLoadError(err.response?.data?.message || "Gagal memuat data user.");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const token = localStorage.getItem('token');
        
        const updateData = {
            username,
            email,
            role,
        };

        // Hanya kirim password jika diisi (tidak kosong)
        if (password) {
            updateData.password = password;
        }

        try {
            await axios.put(
                `http://makinasik.web.bps.go.id/api/users/${id}`, 
                updateData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            navigate('/admin/manage-users');

        } catch (err) {
            console.error("Gagal update user:", err);
            setError(err.response?.data?.message || "Gagal update user.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Memuat data user...</div>;

    if (loadError) {
        return (
            <div className="text-center py-10">
                <div className="text-red-600 mb-4 flex items-center justify-center gap-2">
                    <FaExclamationCircle /> {loadError}
                </div>
                <Link to="/admin/manage-users" className="text-[#1A2A80] hover:underline font-bold">
                    &larr; Kembali ke Daftar User
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto w-full">
            
            {/* Tombol Kembali */}
            <div className="mb-6">
                <Link 
                    to="/admin/manage-users" 
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-medium"
                >
                    <FaArrowLeft size={14} /> Kembali ke Manajemen User
                </Link>
            </div>

            {/* Card Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                
                {/* Header Card */}
                <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Edit Data Pengguna</h2>
                    <p className="text-sm text-gray-500 mt-1">Perbarui informasi akun pengguna di sini.</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 border border-red-100 text-sm flex items-center gap-2">
                            <FaExclamationCircle /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <FaUser className="text-[#1A2A80]" /> Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <FaEnvelope className="text-[#1A2A80]" /> Alamat Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <FaLock className="text-[#1A2A80]" /> Password Baru (Opsional)
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white placeholder-gray-400"
                                placeholder="Biarkan kosong jika tidak ingin mengubah password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label htmlFor="role" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                <FaUserShield className="text-[#1A2A80]" /> Role / Hak Akses
                            </label>
                            <div className="relative">
                                <select
                                    id="role"
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-white appearance-none"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="user">User (Mitra)</option>
                                    <option value="admin">Admin (Pengelola)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Menyimpan...' : <><FaSave /> Simpan Perubahan</>}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditUser;