// src/pages/admin/DetailUser.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
// 1. IMPORT ICON
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaUserShield, 
  FaCalendarAlt,
  FaClock
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';
const getToken = () => localStorage.getItem('token');

const DetailUser = () => {
  const { id } = useParams(); 
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(response.data.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Gagal mengambil data user');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchUserDetails();
  }, [id]);

  if (loading) return <div className="text-center py-10 text-gray-500">Memuat data user...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
  if (!userData) return <div className="text-center py-10 text-gray-500">User tidak ditemukan.</div>;

  return (
    <div className="max-w-3xl mx-auto w-full">
      
      {/* Tombol Kembali */}
      <div className="mb-6">
        <Link 
          to="/admin/manage-users" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-medium"
        >
          <FaArrowLeft size={14} /> Kembali ke Manajemen User
        </Link>
      </div>

      {/* Card Utama */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header Card */}
        <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[#1A2A80] text-2xl shadow-sm border border-blue-100">
                <FaUser />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">{userData.username}</h1>
                <p className="text-sm text-gray-500">Detail Akun Pengguna</p>
            </div>
        </div>

        {/* Konten Detail */}
        <div className="p-8">
            <div className="grid grid-cols-1 gap-6">
                
                {/* Email */}
                <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-100 transition-colors shadow-sm">
                    <div className="p-3 bg-blue-50 text-[#1A2A80] rounded-lg">
                        <FaEnvelope />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">Alamat Email</label>
                        <p className="text-base font-medium text-gray-900">{userData.email}</p>
                    </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-100 transition-colors shadow-sm">
                    <div className={`p-3 rounded-lg ${userData.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        <FaUserShield />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">Role / Hak Akses</label>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${userData.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {userData.role}
                        </span>
                    </div>
                </div>

                {/* Tanggal Bergabung */}
                <div className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-100 transition-colors shadow-sm">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <FaCalendarAlt />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">Tanggal Bergabung</label>
                        <p className="text-base font-medium text-gray-900 font-mono">
                            {new Date(userData.created_at).toLocaleDateString('id-ID', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <FaClock size={10} /> 
                            {new Date(userData.created_at).toLocaleTimeString('id-ID')}
                        </div>
                    </div>
                </div>

            </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-xs text-gray-400 text-right">
             User ID: <span className="font-mono font-bold">{userData.id}</span>
        </div>

      </div>
    </div>
  );
};

export default DetailUser;