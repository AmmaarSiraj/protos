import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaSave, FaTimes, FaInfoCircle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';

const ModalSPKSetting = ({ isOpen, onClose, periode, onSuccess }) => {
  const [formData, setFormData] = useState({
    id: null, // Tambahkan ID untuk tracking update
    nama_ppk: '',
    nip_ppk: '',
    jabatan_ppk: 'Pejabat Pembuat Komitmen',
    tanggal_surat: '',
    nomor_surat_format: '000/33730/SPK.MITRA/MM/YYYY',
    komponen_honor: 'biaya pajak, bea materai, dan jasa pelayanan keuangan',
    template_id: null // Penting: simpan state template_id agar tidak hilang saat save
  });
  
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (isOpen) {
      const initData = async () => {
        try {
          // Fetch data existing
          const res = await axios.get(`${API_URL}/api/spk-setting/periode/${periode}`, { headers: getAuthHeader() });
          const data = res.data.data || res.data;
          
          if (data) {
            setFormData({
                ...data, // Spread data DB ke state (termasuk id dan template_id)
                tanggal_surat: data.tanggal_surat ? data.tanggal_surat.split('T')[0] : ''
            });
          }
        } catch (err) {
            // Jika 404 (belum ada), biarkan default values
            if (err.response && err.response.status !== 404) console.error(err);
        }
      };
      initData();
    }
  }, [isOpen, periode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Payload wajib menyertakan template_id yang ada di state formData
    // agar backend tidak meresetnya jadi null.
    const payload = { ...formData, periode };

    try {
      // LOGIKA PUT vs POST
      if (formData.id) {
          // UPDATE
          await axios.put(`${API_URL}/api/spk-setting/${formData.id}`, payload, { headers: getAuthHeader() });
      } else {
          // CREATE
          await axios.post(`${API_URL}/api/spk-setting`, payload, { headers: getAuthHeader() });
      }

      Swal.fire('Tersimpan', 'Detail administratif surat berhasil disimpan.', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Pengaturan Detail Surat</h3>
            <p className="text-xs text-gray-500">Periode: <span className="font-mono font-bold text-[#1A2A80]">{periode}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><FaTimes size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="form-spk" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2"><FaInfoCircle /> Pihak Pertama (PPK)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap & Gelar</label>
                        <input type="text" name="nama_ppk" value={formData.nama_ppk} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nama PPK" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">NIP</label>
                        <input type="text" name="nip_ppk" value={formData.nip_ppk} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="NIP" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Jabatan</label>
                        <input type="text" name="jabatan_ppk" value={formData.jabatan_ppk} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Surat</label>
                    <input type="date" name="tanggal_surat" value={formData.tanggal_surat} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Format Nomor Surat</label>
                    <input type="text" name="nomor_surat_format" value={formData.nomor_surat_format} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 font-mono" placeholder=".../SPK..." />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Rincian Komponen Honor</label>
                <textarea name="komponen_honor" value={formData.komponen_honor} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} type="button" className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-100">Batal</button>
            <button form="form-spk" type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg bg-[#1A2A80] text-white text-sm font-bold hover:bg-blue-900 shadow-lg disabled:opacity-50"><FaSave /> Simpan Detail</button>
        </div>

      </div>
    </div>
  );
};

export default ModalSPKSetting;