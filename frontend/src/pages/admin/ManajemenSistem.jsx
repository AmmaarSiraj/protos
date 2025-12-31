// src/pages/admin/ManajemenSistem.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import FileUploader from '../../components/FileUploader';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const ManajemenSistem = () => {
  const [images, setImages] = useState({ home_background: null, app_logo: null });
  const [loading, setLoading] = useState({ home_background: false, app_logo: false });

  // Load setting saat halaman dibuka
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
        // Endpoint publik (atau buat route khusus admin jika perlu)
        const res = await axios.get(`${API_URL}/api/system-settings`);
        setImages(res.data.data);
    } catch (error) {
        console.error("Gagal memuat pengaturan sistem", error);
    }
  };

  const handleUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    // Set loading state spesifik untuk tipe yang sedang diupload
    setLoading(prev => ({ ...prev, [type]: true }));

    try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/system-settings/upload`, formData, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });
        
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Tampilan sistem berhasil diperbarui.',
            timer: 1500,
            showConfirmButton: false
        });

        fetchSettings(); // Refresh data terbaru
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Upload',
            text: error.response?.data?.message || 'Terjadi kesalahan saat mengupload gambar.',
        });
    } finally {
        setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="p-2 md:p-6">
        <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">Pengaturan Tampilan Sistem</h1>
            <p className="text-gray-500 mt-1">Sesuaikan logo aplikasi dan latar belakang halaman depan.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Box 1: Background Home */}
            <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100">
                <div className="mb-4 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Background Halaman Depan</h3>
                    <p className="text-xs text-gray-400">Gambar ini akan muncul di halaman landing page (Home).</p>
                </div>
                
                <FileUploader 
                    label="Upload Background Baru" 
                    currentImage={images.home_background}
                    onFileSelect={(file) => handleUpload(file, 'home_background')}
                    isLoading={loading.home_background}
                    helpText="Rekomendasi: Resolusi 1920x1080px (Landscape), Max 5MB."
                />
            </div>

            {/* Box 2: Logo Aplikasi */}
            <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100">
                <div className="mb-4 pb-4 border-b border-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Logo Aplikasi</h3>
                    <p className="text-xs text-gray-400">Logo yang muncul di Sidebar Admin dan Header Home.</p>
                </div>

                <FileUploader 
                    label="Upload Logo Baru" 
                    currentImage={images.app_logo}
                    onFileSelect={(file) => handleUpload(file, 'app_logo')}
                    isLoading={loading.app_logo}
                    helpText="Rekomendasi: Format PNG (Transparan), Max 2MB."
                />
            </div>
        </div>
    </div>
  );
};

export default ManajemenSistem;