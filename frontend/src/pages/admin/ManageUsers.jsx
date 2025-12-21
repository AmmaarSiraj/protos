// src/pages/admin/ManageUsers.jsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; 
import { FaDownload, FaFileUpload, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const API_URL = 'https://makinasik.sidome.id/api';
const getToken = () => localStorage.getItem('token');

const ManageUsers = () => {
    // 1. STATE MANAGEMENT
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // 2. FETCH USERS (READ)
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Perbaikan Logika Data: Ambil dari response.data.data
            const fetchedData = response.data.data || response.data;
            
            if (Array.isArray(fetchedData)) {
                setUsers(fetchedData);
            } else {
                setUsers([]);
            }
            
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                setError('Akses ditolak. Silakan login kembali.');
                navigate('/login');
            } else {
                setError('Gagal memuat data pengguna.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 3. DELETE USER
    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Data pengguna ini akan dihapus permanen!",
            icon: 'warning',
            showCancelButton: true,
            // Style Asli (Tombol Hapus di Kanan)
            reverseButtons: true, 
            confirmButtonColor: '#d33', 
            cancelButtonColor: '#3085d6', 
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const token = getToken();
                await axios.delete(`${API_URL}/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                await Swal.fire('Terhapus!', 'Data pengguna berhasil dihapus.', 'success');
                fetchUsers(); // Refresh data
            } catch (err) {
                Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus pengguna.', 'error');
            }
        }
    };

    // 4. DOWNLOAD TEMPLATE EXCEL
    const handleDownloadTemplate = async () => {
        try {
            const token = getToken();
            setLoading(true); // Opsional: Tampilkan loading jika perlu

            const response = await axios.get(`${API_URL}/users/template`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // <--- PENTING: Agar dibaca sebagai file binary
            });

            // Membuat link virtual untuk men-trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Nama file saat didownload user
            link.setAttribute('download', 'template_import_users.xlsx'); 
            
            document.body.appendChild(link);
            link.click();
            
            // Bersihkan memori
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            setLoading(false);

        } catch (err) {
            console.error(err);
            setLoading(false);
            Swal.fire(
                'Gagal!', 
                'Gagal mendownload template dari server. Pastikan file tersedia.', 
                'error'
            );
        }
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    // 5. IMPORT FILE (EXCEL/CSV)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const token = getToken();
            // Endpoint import yang baru ditambahkan
            const response = await axios.post(`${API_URL}/users/import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            const { successCount, failCount, errors } = response.data;
            
            // Format Pesan Notifikasi
            let msgHTML = `<b>Sukses:</b> ${successCount}<br/><b>Gagal:</b> ${failCount}`;
            if (errors && errors.length > 0) {
                msgHTML += `<br/><br/><div style="text-align:left; max-height:100px; overflow-y:auto; font-size:12px; background:#f9f9f9; padding:5px;">${errors.slice(0, 3).join('<br/>')}${errors.length > 3 ? '<br/>...' : ''}</div>`;
            }

            Swal.fire({
                title: 'Import Selesai',
                html: msgHTML,
                icon: failCount > 0 ? 'warning' : 'success'
            });

            fetchUsers(); // Refresh tabel setelah import

        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.response?.data?.message || "Gagal import user.", 'error');
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input file
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Helper: Format Tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Memuat data...</div>;
    if (error) return <div className="text-center py-10 text-red-600">Error: {error}</div>;

    return (
        <div className="w-full">
            {/* Input File Tersembunyi (Support Excel & CSV) */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv, .xlsx, .xls" 
                className="hidden" 
            />

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-gray-500 text-sm">
                    Kelola akun untuk admin dan mitra statistik.
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 transition shadow-sm"
                    >
                        <FaDownload /> Template Excel
                    </button>
                    <button 
                        onClick={handleImportClick}
                        disabled={uploading}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50"
                    >
                        <FaFileUpload /> {uploading ? '...' : 'Import Excel'}
                    </button>
                    <button
                        onClick={() => navigate('/admin/users/add')}
                        className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm"
                    >
                        <FaPlus /> Tambah Manual
                    </button>
                </div>
            </div>

            {/* Tabel Data User */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Daftar</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr 
                                key={user.id} 
                                onClick={() => navigate(`/admin/users/${user.id}/detail`)} 
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{user.username}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'} capitalize`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                    {formatDate(user.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit-user/${user.id}`); }}
                                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition"
                                            title="Edit User"
                                        >
                                            <FaEdit size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition"
                                            title="Hapus User"
                                        >
                                            <FaTrash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="p-10 text-center text-gray-400 italic">Belum ada data pengguna.</div>
                )}
            </div>
        </div>
    );
};

export default ManageUsers;