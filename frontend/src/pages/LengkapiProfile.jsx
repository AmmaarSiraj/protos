// src/pages/LengkapiProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaUserCircle, FaSave, FaLock, FaEnvelope, FaUser, FaCheckCircle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const LengkapiProfile = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confPassword: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Ambil data user dari LocalStorage saat load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData({
        username: parsedUser.username || '',
        email: parsedUser.email || '',
        password: '',
        confPassword: ''
      });
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi Password
    if (formData.password && formData.password !== formData.confPassword) {
      return Swal.fire('Gagal', 'Password baru dan konfirmasi tidak cocok!', 'error');
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Payload hanya kirim yang diubah
      const payload = {
        username: formData.username,
      };
      // Jika password diisi, masukkan ke payload
      if (formData.password) {
        payload.password = formData.password;
      }

      // 2. Request Update ke Backend
      await axios.put(`${API_URL}/api/users/${user.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 3. Update LocalStorage dengan data baru (kecuali password)
      const updatedUser = { ...user, username: formData.username };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Reset field password
      setFormData(prev => ({ ...prev, password: '', confPassword: '' }));

      Swal.fire({
        title: 'Berhasil!',
        text: 'Profil Anda berhasil diperbarui.',
        icon: 'success',
        confirmButtonColor: '#1A2A80'
      });
      
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || "Terjadi kesalahan saat memperbarui profil.", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center text-gray-500">Memuat profil...</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl animate-fade-in-up">
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">
        
        {/* SISI KIRI: INFO STATIC */}
        <div className="bg-[#1A2A80] text-white p-10 md:w-1/3 flex flex-col items-center justify-center text-center">
          <div className="mb-4 relative">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-5xl text-white backdrop-blur-sm border-2 border-white/30">
                <FaUserCircle />
            </div>
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-[#1A2A80]"></div>
          </div>
          <h2 className="text-xl font-bold">{user.username}</h2>
          <p className="text-blue-200 text-sm mb-6">{user.email}</p>
          
          <div className="bg-white/10 rounded-lg p-4 w-full text-sm space-y-2 border border-white/10">
            <div className="flex justify-between">
              <span className="text-blue-200">Role:</span>
              <span className="font-bold uppercase tracking-wider">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-200">Status:</span>
              <span className="font-bold flex items-center gap-1 text-green-300"><FaCheckCircle /> Aktif</span>
            </div>
          </div>
        </div>

        {/* SISI KANAN: FORM EDIT */}
        <div className="p-10 md:w-2/3 bg-white">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Edit Profil</h1>
            <p className="text-gray-500 text-sm">Perbarui informasi akun dan kata sandi Anda di sini.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input Username */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaUser className="text-[#1A2A80]" /> Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#1A2A80] focus:ring-2 focus:ring-blue-100 outline-none transition bg-gray-50 focus:bg-white"
                placeholder="Masukkan username baru"
              />
            </div>

            {/* Input Email (Read Only) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaEnvelope className="text-[#1A2A80]" /> Email (Login)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">*Email tidak dapat diubah secara langsung.</p>
            </div>

            <hr className="border-dashed border-gray-200 my-4" />

            {/* Input Password Baru */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <FaLock className="text-[#1A2A80]" /> Password Baru
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#1A2A80] focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Kosongkan jika tetap"
                />
              </div>
              
              {/* Konfirmasi Password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <FaLock className="text-[#1A2A80]" /> Konfirmasi Password
                </label>
                <input
                  type="password"
                  name="confPassword"
                  value={formData.confPassword}
                  onChange={handleChange}
                  disabled={!formData.password}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#1A2A80] focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Ulangi password"
                />
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Menyimpan...' : <><FaSave /> Simpan Perubahan</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default LengkapiProfile;