// src/pages/admin/AddUser.jsx
import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaUserShield, 
  FaPlus, 
  FaExclamationCircle 
} from 'react-icons/fa';

const AddUser = () => {
  const navigate = useNavigate(); 
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!username || !email || !password) {
      setError('Semua field wajib diisi.');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error("Token tidak ditemukan. Silakan login ulang.");
      }

      await axios.post(
        'https://makinasik.web.bps.id/api/users', 
        {
          username,
          email,
          password,
          role
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json' // Tambahan header agar response pasti JSON
          }
        }
      );

      // Berhasil
      Swal.fire('Sukses', 'User berhasil ditambahkan', 'success');
      navigate('/admin/manage-users');

    } catch (err) {
      console.error("Gagal menambah user:", err);
      
      // --- LOGIC PENANGANAN ERROR VALIDASI (422) ---
      if (err.response && err.response.status === 422) {
          // Struktur dari Controller: { status, message, errors: { username: [...], email: [...] } }
          const errorData = err.response.data.errors;
          
          if (errorData) {
              // Menggabungkan semua pesan error menjadi satu string
              const errorMessages = Object.values(errorData).flat().join('\n');
              setError(errorMessages); 
          } else {
              // Fallback jika tidak ada field 'errors'
              setError(err.response.data.message || "Validasi gagal. Cek input Anda.");
          }
      } 
      else if (err.response && err.response.status === 401) {
          setError("Sesi Anda telah berakhir. Silakan login kembali.");
      } 
      else {
          setError(err.response?.data?.message || "Gagal menambah user. Silakan coba lagi.");
      }
      
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      
      <div className="mb-6">
        <Link 
          to="/admin/manage-users" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-medium"
        >
          <FaArrowLeft size={14} /> Kembali ke Manajemen User
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Tambah User Baru</h2>
            <p className="text-sm text-gray-500 mt-1">Buat akun untuk admin atau mitra baru.</p>
        </div>

        <div className="p-8">
            {/* Menampilkan Error dengan format baris baru (whitespace-pre-line) */}
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 border border-red-100 text-sm flex items-start gap-2 whitespace-pre-line">
                    <FaExclamationCircle className="mt-1 flex-shrink-0" /> 
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                    <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <FaUser className="text-[#1A2A80]" /> Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white"
                        placeholder="Contoh: budi_santoso"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <FaEnvelope className="text-[#1A2A80]" /> Alamat Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <FaLock className="text-[#1A2A80]" /> Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] focus:border-[#1A2A80] transition outline-none bg-gray-50 focus:bg-white"
                        placeholder="Minimal 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

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

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Menyimpan...' : <><FaPlus /> Tambah User</>}
                    </button>
                </div>

            </form>
        </div>
      </div>
    </div>
  );
};

export default AddUser;