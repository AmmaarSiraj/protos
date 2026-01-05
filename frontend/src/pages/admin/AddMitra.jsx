import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FaArrowLeft, FaUserTie, FaIdCard, FaPhone, FaEnvelope, 
  FaMapMarkerAlt, FaCheck, FaVenusMars, FaGraduationCap, FaBriefcase, FaIdBadge,
  FaCalendarAlt, FaChevronDown
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const AddMitra = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const selectedYearRef = useRef(null);

  // 1. LOGIKA GENERATE TAHUN (50 thn lalu - 50 thn depan)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i); 

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nik: '',
    sobat_id: '',
    alamat: '',
    nomor_hp: '',
    email: '',
    jenis_kelamin: '',
    pendidikan: '',
    pekerjaan: '',
    deskripsi_pekerjaan_lain: '',
    tahun_daftar: currentYear
  });

  // --- EFEK AUTO SCROLL KE TENGAH ---
  useEffect(() => {
    if (showYearDropdown && selectedYearRef.current) {
      selectedYearRef.current.scrollIntoView({ block: 'center' });
    }
  }, [showYearDropdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectYear = (year) => {
    setFormData({ ...formData, tahun_daftar: year });
    setShowYearDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.nama_lengkap || !formData.nik || !formData.nomor_hp || !formData.tahun_daftar) {
        setLoading(false);
        return Swal.fire('Gagal', 'Nama Lengkap, NIK, No HP, dan Tahun wajib diisi.', 'warning');
    }

    if (!/^\d{4}$/.test(formData.tahun_daftar)) {
        setLoading(false);
        return Swal.fire('Gagal', 'Format tahun harus 4 digit angka (misal: 2025).', 'warning');
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/mitra`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        title: 'Berhasil!',
        text: response.data.message || 'Mitra berhasil didaftarkan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/admin/manajemen-mitra');
      });

    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || 'Terjadi kesalahan saat menyimpan.';
      
      if (err.response?.status === 409) {
          Swal.fire('Duplikat', errorMsg, 'warning');
      } else {
          Swal.fire('Gagal', errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      
      <div className="flex items-center gap-4 mb-6">
        <Link 
          to="/admin/manajemen-mitra" 
          className="text-gray-500 hover:text-[#1A2A80] transition p-2 rounded-full hover:bg-gray-100"
        >
          <FaArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tambah Mitra Baru</h1>
          <p className="text-sm text-gray-500">Pendaftaran mitra statistik manual untuk tahun tertentu.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="px-8 py-5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3 text-[#1A2A80]">
            <FaUserTie className="text-xl" />
            <h3 className="font-bold text-gray-700">Identitas & Latar Belakang Mitra</h3>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* --- KOLOM KIRI --- */}
            <div className="space-y-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">Data Pribadi</h4>
                
                {/* --- COMBOBOX TAHUN AKTIF --- */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 relative">
                    <label className="block text-sm font-bold text-blue-800 mb-1">Tahun Aktif <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-blue-400 z-10 pointer-events-none"><FaCalendarAlt /></span>
                        <input 
                            type="number" 
                            name="tahun_daftar"
                            className="w-full pl-10 pr-10 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition font-bold text-blue-900 bg-white"
                            placeholder="YYYY"
                            value={formData.tahun_daftar} 
                            onChange={handleChange}
                            onFocus={() => setShowYearDropdown(true)}
                            onBlur={() => setTimeout(() => setShowYearDropdown(false), 200)}
                            required
                        />
                        <FaChevronDown className="absolute right-3 top-4 text-blue-400 pointer-events-none text-xs" />

                        {/* LIST DROPDOWN */}
                        {showYearDropdown && (
                            <ul className="absolute z-50 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
                                {years.map(year => {
                                    const isSelected = year === parseInt(formData.tahun_daftar);
                                    return (
                                        <li 
                                            key={year}
                                            ref={isSelected ? selectedYearRef : null}
                                            onMouseDown={() => handleSelectYear(year)}
                                            className={`px-4 py-2 cursor-pointer text-sm font-medium transition ${isSelected ? 'bg-blue-100 text-[#1A2A80]' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {year}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                        *Jika NIK sudah ada, data profil akan diperbarui & diaktifkan untuk tahun ini.
                    </p>
                </div>
                {/* ----------------------------------- */}

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaUserTie /></span>
                        <input 
                            type="text" name="nama_lengkap" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                            placeholder="Contoh: Budi Santoso"
                            value={formData.nama_lengkap} onChange={handleChange} required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">NIK <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400"><FaIdCard /></span>
                            <input 
                                type="text" name="nik" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                                placeholder="16 digit NIK"
                                value={formData.nik} onChange={handleChange} required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID Sobat</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400"><FaIdBadge /></span>
                            <input 
                                type="text" name="sobat_id" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                                placeholder="ID Aplikasi Sobat"
                                value={formData.sobat_id} onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Kelamin</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaVenusMars /></span>
                        <select 
                            name="jenis_kelamin"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition bg-white"
                            value={formData.jenis_kelamin} onChange={handleChange}
                        >
                            <option value="">-- Pilih --</option>
                            <option value="Lk">Laki-laki</option>
                            <option value="Pr">Perempuan</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Alamat Domisili</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaMapMarkerAlt /></span>
                        <textarea 
                            name="alamat" rows="3"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition resize-none"
                            placeholder="Jalan, RT/RW, Kelurahan, Kecamatan..."
                            value={formData.alamat} onChange={handleChange} required
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* --- KOLOM KANAN --- */}
            <div className="space-y-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">Kontak & Latar Belakang</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">No. Handphone <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400"><FaPhone /></span>
                            <input 
                                type="text" name="nomor_hp" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                                placeholder="0812..."
                                value={formData.nomor_hp} onChange={handleChange} required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400"><FaEnvelope /></span>
                            <input 
                                type="email" name="email" 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                                placeholder="email@example.com"
                                value={formData.email} onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Pendidikan Terakhir</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaGraduationCap /></span>
                        <select
                            name="pendidikan"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition bg-white"
                            value={formData.pendidikan} onChange={handleChange}
                        >
                            <option value="">-- Pilih Pendidikan --</option>
                            <option value="Tamat SMA/Sederajat">Tamat SMA/Sederajat</option>
                            <option value="Tamat D4/S1">Tamat D4/S1</option>
                            <option value="Tamat SD/Sederajat">Tamat SD/Sederajat</option>
                            <option value="Tamat SMP/Sederajat">Tamat SMP/Sederajat</option>
                            <option value="Tamat D1/D2/D3">Tamat D1/D2/D3</option>
                            <option value="Tamat S2">Tamat S2</option>
                            <option value="Tamat S3">Tamat S3</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Pekerjaan Utama</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaBriefcase /></span>
                        <input 
                            type="text" name="pekerjaan" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                            placeholder="Contoh: Wiraswasta / Mahasiswa"
                            value={formData.pekerjaan} onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan Pekerjaan Lain</label>
                    <textarea 
                        name="deskripsi_pekerjaan_lain" rows="2"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition resize-none"
                        placeholder="Detail pekerjaan jika ada..."
                        value={formData.deskripsi_pekerjaan_lain} onChange={handleChange}
                    ></textarea>
                </div>
            </div>

        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button 
                type="button"
                onClick={() => navigate('/admin/manajemen-mitra')}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition"
            >
                Batal
            </button>
            <button 
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 rounded-lg bg-[#1A2A80] text-white font-bold hover:bg-blue-900 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
                {loading ? 'Menyimpan...' : <><FaCheck /> Simpan & Aktifkan</>}
            </button>
        </div>

      </form>
    </div>
  );
};

export default AddMitra;