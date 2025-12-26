// src/pages/admin/EditMitra.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  FaArrowLeft, FaUserTie, FaIdCard, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaSave, FaVenusMars, FaGraduationCap, FaBriefcase, FaIdBadge
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';

const EditMitra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Data Profil
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
    deskripsi_pekerjaan_lain: ''
  });

  // Fetch Data Mitra
  useEffect(() => {
    const fetchMitra = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/mitra/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Ambil data dari .data.data (sesuai struktur backend Laravel)
        const m = res.data.data || res.data;

        setFormData({
          nama_lengkap: m.nama_lengkap || '',
          nik: m.nik || '',
          sobat_id: m.sobat_id || '',
          alamat: m.alamat || '',
          nomor_hp: m.nomor_hp || '',
          email: m.email || '',
          jenis_kelamin: m.jenis_kelamin || '',
          pendidikan: m.pendidikan || '',
          pekerjaan: m.pekerjaan || '',
          deskripsi_pekerjaan_lain: m.deskripsi_pekerjaan_lain || ''
        });

      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memuat data mitra.', 'error');
        navigate('/admin/manajemen-mitra');
      } finally {
        setLoading(false);
      }
    };
    fetchMitra();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- UPDATE PROFIL ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/mitra/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        title: 'Berhasil',
        text: 'Data profil mitra berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        // REVISI PATH: Redirect ke halaman manajemen mitra yang benar
        navigate('/admin/manajemen-mitra');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.error || 'Gagal update profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Memuat data...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">

      <div className="flex items-center gap-4 mb-6">
        {/* REVISI PATH: Link tombol kembali diperbaiki */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-[#1A2A80] transition p-2 rounded-full hover:bg-gray-100"
        >
          {/* Pastikan Ikon FaArrowLeft atau sejenisnya ada di sini */}
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Master Mitra</h1>
          <p className="text-sm text-gray-500">Perbarui data profil biodata mitra.</p>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="px-8 py-5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-[#1A2A80]">
          <FaUserTie className="text-xl" />
          <h3 className="font-bold text-gray-700">Informasi Profil</h3>
        </div>

        <div className="p-8 space-y-6">

          {/* Nama & NIK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaUserTie /></span>
                <input
                  type="text" name="nama_lengkap"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                  value={formData.nama_lengkap} onChange={handleChange} required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIK</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaIdCard /></span>
                <input
                  type="text" name="nik"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono"
                  value={formData.nik}
                  readOnly
                  title="NIK tidak dapat diubah sembarangan"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">*NIK tidak dapat diubah (Master Key).</p>
            </div>
          </div>

          {/* Kontak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. HP</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaPhone size={14} /></span>
                <input
                  type="text" name="nomor_hp"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                  value={formData.nomor_hp} onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaEnvelope size={14} /></span>
                <input
                  type="email" name="email"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                  value={formData.email} onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Domisili</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400"><FaMapMarkerAlt size={14} /></span>
              <textarea
                name="alamat" rows="2"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition resize-none"
                value={formData.alamat} onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Lainnya */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Sobat</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaIdBadge size={14} /></span>
                <input
                  type="text" name="sobat_id"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                  value={formData.sobat_id} onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaVenusMars size={14} /></span>
                <select
                  name="jenis_kelamin"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition bg-white"
                  value={formData.jenis_kelamin} onChange={handleChange}
                >
                  <option value="">- Pilih -</option>
                  <option value="Lk">Laki-laki</option>
                  <option value="Pr">Perempuan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pekerjaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pendidikan</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaGraduationCap size={14} /></span>
                <select
                  name="pendidikan"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition bg-white"
                  value={formData.pendidikan} onChange={handleChange}
                >
                  <option value="">- Pilih -</option>
                  <option value="Tamat SMA/Sederajat">SMA/Sederajat</option>
                  <option value="Tamat D4/S1">D4/S1</option>
                  <option value="Tamat D1/D2/D3">D1/D2/D3</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pekerjaan</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaBriefcase size={14} /></span>
                <input
                  type="text" name="pekerjaan"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition"
                  value={formData.pekerjaan} onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi Pekerjaan Lain</label>
            <textarea
              name="deskripsi_pekerjaan_lain" rows="2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none transition resize-none"
              value={formData.deskripsi_pekerjaan_lain} onChange={handleChange}
            ></textarea>
          </div>

        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {/* REVISI PATH: Tombol Batal diperbaiki */}
          <button
            type="button"
            onClick={() => navigate('/admin/manajemen-mitra')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#1A2A80] text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-900 transition flex items-center gap-2 shadow-md disabled:opacity-70"
          >
            {saving ? 'Menyimpan...' : <><FaSave /> Simpan Perubahan</>}
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditMitra;