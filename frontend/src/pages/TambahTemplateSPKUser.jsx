import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaCopy, FaFileAlt, FaInfoCircle, FaTable, FaTimes } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const VARIABLES = [
  { code: '{{NAMA_MITRA}}', desc: 'Nama Lengkap Mitra' },
  { code: '{{NIK}}', desc: 'NIK Mitra' },
  { code: '{{ALAMAT_MITRA}}', desc: 'Alamat Mitra' },
  { code: '{{NAMA_PPK}}', desc: 'Nama Pejabat (PPK)' },
  { code: '{{JABATAN_PPK}}', desc: 'Jabatan PPK' },
  { code: '{{NIP_PPK}}', desc: 'NIP PPK' },
  { code: '{{TOTAL_HONOR}}', desc: 'Total Honor (Rp)' },
  { code: '{{TERBILANG}}', desc: 'Terbilang Honor' },
  { code: '{{TANGGAL_SURAT}}', desc: 'Tanggal Surat (ex: 01 Januari 2025)' },
  { code: '{{HARI_INI}}', desc: 'Hari saat ini (Senin, dst)' },
  { code: '{{TANGGAL_TERBILANG}}', desc: 'Tanggal saat ini (Satu, dst)' },
  { code: '{{BULAN_INI}}', desc: 'Bulan saat ini (Januari, dst)' },
  { code: '{{TAHUN_TERBILANG}}', desc: 'Tahun saat ini (Dua Ribu...)' },
  { code: '{{TAHUN}}', desc: 'Tahun Anggaran (Angka)' },
  { code: '{{NOMOR_SURAT}}', desc: 'Nomor Surat SPK' },
  { code: '{{Break_Space}}', desc: 'Paksa Pindah Halaman' },
  { code: '{{Lampiran}}', desc: 'Tabel Rincian Tugas (Otomatis)' },
];

const DEFAULT_CONTENT = {
  parts: {
    pembuka: "Pada hari ini {{HARI_INI}}, tanggal {{TANGGAL_TERBILANG}}, bulan {{BULAN_INI}} tahun {{TAHUN_TERBILANG}}, bertempat di BPS Kota Salatiga, yang bertandatangan di bawah ini:",
    
    pihak_pertama: "{{JABATAN_PPK}} Badan Pusat Statistik Kota Salatiga, berkedudukan di BPS Kota Salatiga, bertindak untuk dan atas nama Badan Pusat Statistik Kota Salatiga berkedudukan di Jl. Hasanudin KM 01, Dukuh, Sidomukti, Salatiga, selanjutnya disebut sebagai PIHAK PERTAMA.",
    
    pihak_kedua: "Mitra Statistik, berkedudukan di {{ALAMAT_MITRA}}, bertindak untuk dan atas nama diri sendiri, selanjutnya disebut PIHAK KEDUA.",
    
    kesepakatan: "Bahwa PIHAK PERTAMA dan PIHAK KEDUA yang secara bersama-sama disebut PARA PIHAK, sepakat untuk mengikatkan diri dalam Perjanjian Kerja Petugas Pendataan Lapangan Kegiatan Survei/Sensus Tahun {{TAHUN}}, dengan ketentuan-ketentuan sebagai berikut:",
    
    penutup: "Demikian Perjanjian ini dibuat dan ditandatangani oleh PARA PIHAK dalam 2 (dua) rangkap asli bermeterai cukup, tanpa paksaan dari PIHAK manapun dan untuk dilaksanakan oleh PARA PIHAK."
  },
  articles: [
    { 
        nomor_pasal: 1, 
        judul_pasal: '', 
        isi_pasal: "PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA menerima pekerjaan dari PIHAK PERTAMA sebagai Petugas Pendataan Lapangan, dengan lingkup pekerjaan yang ditetapkan oleh PIHAK PERTAMA." 
    },
    { 
        nomor_pasal: 2, 
        judul_pasal: '', 
        isi_pasal: "Ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 1 meliputi kegiatan pendataan lapangan sesuai dengan tugas dan target yang ditetapkan." 
    },
    { 
        nomor_pasal: 3, 
        judul_pasal: '', 
        isi_pasal: "Jangka Waktu Perjanjian terhitung sejak tanggal {{TANGGAL_SURAT}} sampai dengan selesainya periode kegiatan bulan ini. {{Break_Space}}" 
    },
    { 
        nomor_pasal: 4, 
        judul_pasal: '', 
        isi_pasal: "PIHAK KEDUA berkewajiban melaksanakan seluruh pekerjaan yang diberikan oleh PIHAK PERTAMA sampai selesai, sesuai ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 2 di wilayah kerja masing-masing." 
    },
    { 
        nomor_pasal: 5, 
        judul_pasal: '', 
        isi_pasal: "(1) PIHAK KEDUA berhak untuk mendapatkan honorarium petugas dari PIHAK PERTAMA sebesar {{TOTAL_HONOR}} ({{TERBILANG}}) untuk pekerjaan sebagaimana dimaksud dalam Pasal 2, termasuk biaya pulsa dan transport.\n(2) PIHAK KEDUA tidak diberikan honorarium tambahan apabila melakukan kunjungan di luar jadwal atau terdapat tambahan waktu pelaksanaan pekerjaan lapangan." 
    },
    { 
        nomor_pasal: 6, 
        judul_pasal: '', 
        isi_pasal: "(1) Pembayaran honorarium sebagaimana dimaksud dalam Pasal 5 dilakukan setelah PIHAK KEDUA menyelesaikan dan menyerahkan seluruh hasil pekerjaan sebagaimana dimaksud dalam Pasal 2 kepada PIHAK PERTAMA.\n(2) Pembayaran sebagaimana dimaksud pada ayat (1) dilakukan oleh PIHAK PERTAMA kepada PIHAK KEDUA sesuai dengan ketentuan peraturan perundang-undangan." 
    },
    { 
        nomor_pasal: 7, 
        judul_pasal: '', 
        isi_pasal: "Penyerahan hasil pekerjaan lapangan sebagaimana dimaksud dalam Pasal 2 dilakukan secara bertahap dan selambat-lambatnya seluruh hasil pekerjaan lapangan diserahkan sesuai jadwal yang tercantum dalam Lampiran, yang dinyatakan dalam Berita Acara Serah Terima Hasil Pekerjaan yang ditandatangani oleh PARA PIHAK." 
    },
    { 
        nomor_pasal: 8, 
        judul_pasal: '', 
        isi_pasal: "PIHAK PERTAMA dapat memutuskan Perjanjian ini secara sepihak sewaktu-waktu dalam hal PIHAK KEDUA tidak dapat melaksanakan kewajibannya sebagaimana dimaksud dalam Pasal 4, dengan menerbitkan Surat Pemutusan Perjanjian Kerja." 
    },
    { 
        nomor_pasal: 9, 
        judul_pasal: '', 
        isi_pasal: "(1) Apabila PIHAK KEDUA mengundurkan diri pada saat/setelah pelaksanaan pekerjaan lapangan dengan tidak menyelesaikan pekerjaan yang menjadi tanggungjawabnya, maka PIHAK PERTAMA akan memberikan Surat Pemutusan Perjanjian Kerja kepada PIHAK KEDUA.\n(2) Dalam hal terjadi peristiwa sebagaimana dimaksud pada ayat (1), PIHAK PERTAMA membayarkan honorarium kepada PIHAK KEDUA secara proporsional sesuai pekerjaan yang telah dilaksanakan. {{Break_Space}}" 
    },
    { 
        nomor_pasal: 10, 
        judul_pasal: '', 
        isi_pasal: "(1) Apabila terjadi Keadaan Kahar, yang meliputi bencana alam dan bencana sosial, PIHAK KEDUA memberitahukan kepada PIHAK PERTAMA dalam waktu paling lambat 7 (tujuh) hari sejak mengetahui atas kejadian Keadaan Kahar dengan menyertakan bukti.\n(2) Pada saat terjadi Keadaan Kahar, pelaksanaan pekerjaan oleh PIHAK KEDUA dihentikan sementara dan dilanjutkan kembali setelah Keadaan Kahar berakhir, namun apabila akibat Keadaan Kahar tidak memungkinkan dilanjutkan/diselesaikannya pelaksanaan pekerjaan, PIHAK KEDUA berhak menerima honorarium secara proporsional sesuai pekerjaan yang telah dilaksanakan." 
    },
    { 
        nomor_pasal: 11, 
        judul_pasal: '', 
        isi_pasal: "Segala sesuatu yang belum atau tidak cukup diatur dalam Perjanjian ini, dituangkan dalam perjanjian tambahan/addendum dan merupakan bagian tidak terpisahkan dari perjanjian ini." 
    },
    { 
        nomor_pasal: 12, 
        judul_pasal: '', 
        isi_pasal: "(1) Segala perselisihan atau perbedaan pendapat yang timbul sebagai akibat adanya Perjanjian ini akan diselesaikan secara musyawarah untuk mufakat.\n(2) Apabila perselisihan tidak dapat diselesaikan sebagaimana dimaksud pada ayat (1), PARA PIHAK sepakat menyelesaikan perselisihan dengan memilih kedudukan/domisili hukum di Panitera Pengadilan Negeri Kota Salatiga." 
    }
  ]
};

// Komponen Textarea Auto-Resize
const AutoResizeTextarea = ({ value, onChange, placeholder, className, style }) => {
  const textareaRef = useRef(null);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; 
    }
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={`w-full bg-transparent resize-none outline-none overflow-hidden transition-colors border border-transparent hover:border-gray-200 focus:border-blue-300 rounded px-1 ${className}`}
      style={style}
    />
  );
};

const TambahTemplate = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const draft = location.state; 

  const [header, setHeader] = useState(draft?.header || { nama_template: '' });
  
  const [parts, setParts] = useState(
    draft?.parts || (id ? { pembuka: '', pihak_pertama: '', pihak_kedua: '', kesepakatan: '', penutup: '' } : DEFAULT_CONTENT.parts)
  );
  
  const [articles, setArticles] = useState(
    draft?.articles || (id ? [] : DEFAULT_CONTENT.articles)
  );

  // --- HELPER UNTUK HEADER AUTH ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        Swal.fire('Sesi Habis', 'Silakan login kembali', 'warning').then(() => navigate('/'));
        return null;
    }
    return { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    if (id && !draft?.fromPreview) {
      const fetchData = async () => {
        setLoading(true);
        const headers = getAuthHeaders();
        if (!headers) return; // Stop jika tidak ada token

        try {
          const res = await axios.get(`${API_URL}/api/template-spk/${id}`, { headers });
          
          // Struktur data: { status: "success", data: { ... } }
          const data = res.data.data; 

          // 1. Set Header
          setHeader({ nama_template: data.nama_template });

          // 2. Mapping Bagian Teks (Array dari DB) ke Parts (Object di State)
          const backendParts = data.bagian_teks || [];
          const mappedParts = { ...DEFAULT_CONTENT.parts }; 
          
          backendParts.forEach(item => {
            if (mappedParts.hasOwnProperty(item.jenis_bagian)) {
              mappedParts[item.jenis_bagian] = item.isi_teks;
            }
          });
          setParts(mappedParts);

          // 3. Set Pasal
          setArticles(data.pasal || []);

        } catch (err) {
          console.error(err);
          if (err.response?.status === 401) {
             Swal.fire('Unauthorized', 'Sesi anda telah berakhir', 'error').then(() => navigate('/'));
          } else {
             Swal.fire('Error', 'Gagal memuat template', 'error');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id, draft, navigate]);

  const handlePartChange = (key, value) => setParts(prev => ({ ...prev, [key]: value }));
  
  const handleArticleChange = (index, field, value) => {
    const newArticles = [...articles];
    newArticles[index][field] = value;
    setArticles(newArticles);
  };

  const addArticle = () => {
    setArticles([...articles, { nomor_pasal: articles.length + 1, judul_pasal: '', isi_pasal: '' }]);
  };

  const removeArticle = (index) => {
    const newArticles = articles.filter((_, i) => i !== index);
    const reindexed = newArticles.map((a, i) => ({ ...a, nomor_pasal: i + 1 }));
    setArticles(reindexed);
  };

  const handleCopyVariable = (code) => {
    navigator.clipboard.writeText(code);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
    Toast.fire({ icon: 'success', title: 'Disalin: ' + code });
  };

  // --- LOGIKA LAMPIRAN ---
  const hasLampiran = parts.penutup.includes('{{Lampiran}}');

  const toggleLampiran = () => {
    if (hasLampiran) {
        // Hapus Lampiran
        const newPenutup = parts.penutup.replace(/(\n\n{{Break_Space}}\n{{Lampiran}}|{{Lampiran}})/g, '');
        setParts(prev => ({ ...prev, penutup: newPenutup }));
    } else {
        // Tambah Lampiran
        const suffix = "\n\n{{Lampiran}}";
        setParts(prev => ({ ...prev, penutup: prev.penutup + suffix }));
    }
  };

  const handleSave = async () => {
    if (!header.nama_template) return Swal.fire('Gagal', 'Nama Template (Metadata) wajib diisi', 'warning');
    
    const headers = getAuthHeaders();
    if (!headers) return;

    setLoading(true);
    try {
      const payload = {
        nama_template: header.nama_template,
        parts: parts,
        articles: articles
      };

      if (id) {
        // UPDATE
        await axios.put(`${API_URL}/api/template-spk/${id}`, payload, { headers });
      } else {
        // CREATE HEADER
        const resCreate = await axios.post(`${API_URL}/api/template-spk`, { nama_template: header.nama_template }, { headers });
        const newId = resCreate.data.data.id; 
        
        // UPDATE DETAIL
        await axios.put(`${API_URL}/api/template-spk/${newId}`, payload, { headers });
      }

      Swal.fire('Berhasil', 'Template berhasil disimpan', 'success').then(() => {
        navigate('/spk'); 
      });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
         Swal.fire('Gagal', 'Sesi login berakhir.', 'error');
         navigate('/');
      } else {
         Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    navigate('/spk/templates/preview', { 
        state: { header, parts, articles, id, fromPreview: true } 
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-800">
      
      {/* --- SIDEBAR KIRI: VARIABEL --- */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg flex-shrink-0">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Kamus Variabel</h3>
            <p className="text-xs text-gray-400 mt-1">Klik kode untuk menyalin.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {VARIABLES.map((v) => (
                <div 
                    key={v.code} 
                    onClick={() => handleCopyVariable(v.code)}
                    className="p-3 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg cursor-pointer group transition duration-200 shadow-sm"
                >
                    <div className="flex justify-between items-center">
                        <code className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{v.code}</code>
                        <FaCopy className="text-gray-300 group-hover:text-blue-500 text-xs" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{v.desc}</p>
                </div>
            ))}

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-bold text-yellow-800 mb-1 flex items-center gap-1">
                  <FaInfoCircle /> Info Lampiran:
                </p>
                <p className="text-[10px] text-gray-700 leading-relaxed">
                  Gunakan variabel <code className="font-bold text-red-600 bg-red-50 px-1 rounded">{'{{Lampiran}}'}</code> di bagian paling akhir atau di pasal khusus untuk menampilkan 
                  <b> Tabel Rincian Tugas & Honor</b> secara otomatis.
                </p>
            </div>
        </div>
      </div>

      {/* --- AREA UTAMA (EDITOR SURAT) --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Toolbar Atas */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-30">
            <div className="flex items-center gap-4">
                <Link to="/spk" className="text-gray-400 hover:text-gray-700 transition flex items-center gap-2 text-sm font-bold">
                    <FaArrowLeft /> Kembali
                </Link>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <div className="flex items-center gap-2">
                    <FaFileAlt className="text-[#1A2A80]" />
                    <input 
                        type="text" 
                        className="font-bold text-gray-800 bg-transparent outline-none placeholder-gray-300 w-64 border-b border-transparent focus:border-blue-500 transition-colors text-lg"
                        placeholder="Nama Template (Wajib Diisi)"
                        value={header.nama_template}
                        onChange={(e) => setHeader({ ...header, nama_template: e.target.value })}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePreview} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Preview</button>
                <button onClick={handleSave} disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-[#1A2A80] hover:bg-blue-900 rounded-lg shadow-md transition flex items-center gap-2">
                    <FaSave /> {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
            </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center scrollbar-thin scrollbar-thumb-gray-300">
            
            <div className="w-full max-w-4xl bg-white shadow-xl p-10 md:p-14 relative animate-fade-in-up rounded-sm h-fit">
                
                <div className="text-center font-bold mb-8 border-b-2 border-double border-gray-800 pb-4 select-none opacity-60">
                    <h3 className="uppercase text-lg">PERJANJIAN KERJA</h3>
                    <h3 className="uppercase text-lg">PETUGAS PENDATAAN LAPANGAN</h3>
                    <p className="text-sm font-normal mt-2 italic">[Header Surat Otomatis Sesuai Periode]</p>
                </div>

                <div className="space-y-6 text-justify leading-relaxed font-serif text-[11pt]">
                    
                    {/* Pembuka */}
                    <div className="group relative">
                        <AutoResizeTextarea
                            value={parts.pembuka}
                            onChange={(e) => handlePartChange('pembuka', e.target.value)}
                            placeholder="Ketik kalimat pembuka di sini..."
                            className="text-justify"
                        />
                    </div>

                    {/* Tabel Pihak */}
                    <table className="w-full align-top mt-4">
                        <tbody>
                            <tr className="group">
                                <td className="w-6 font-bold pt-2 align-top">1.</td>
                                <td className="w-full pt-2">
                                    <div className="relative">
                                        <div className="font-bold text-gray-800 select-none mb-1 pointer-events-none">{'{{NAMA_PPK}}'}</div> 
                                        <AutoResizeTextarea
                                            value={parts.pihak_pertama}
                                            onChange={(e) => handlePartChange('pihak_pertama', e.target.value)}
                                            placeholder="Deskripsi jabatan Pihak Pertama..."
                                            className="text-justify"
                                        />
                                    </div>
                                </td>
                            </tr>
                            <tr className="group">
                                <td className="w-6 font-bold pt-6 align-top">2.</td>
                                <td className="w-full pt-6">
                                    <div className="relative">
                                        <div className="font-bold text-gray-800 select-none mb-1 pointer-events-none">{'{{NAMA_MITRA}}'}</div>
                                        <AutoResizeTextarea
                                            value={parts.pihak_kedua}
                                            onChange={(e) => handlePartChange('pihak_kedua', e.target.value)}
                                            placeholder="Deskripsi kedudukan Pihak Kedua..."
                                            className="text-justify"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Kesepakatan */}
                    <div className="group relative mt-6">
                        <AutoResizeTextarea
                            value={parts.kesepakatan}
                            onChange={(e) => handlePartChange('kesepakatan', e.target.value)}
                            placeholder="Ketik kalimat kesepakatan di sini..."
                            className="text-justify"
                        />
                    </div>

                    {/* Pasal-Pasal */}
                    <div className="mt-8 space-y-6">
                        {articles.map((article, idx) => (
                            <div key={idx} className="relative group hover:bg-gray-50 p-2 -mx-2 rounded transition-colors">
                                <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => removeArticle(idx)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-full shadow-md border border-gray-200" title="Hapus Pasal"><FaTrash size={12}/></button>
                                </div>

                                <div className="text-center mb-1">
                                    <span className="font-bold">Pasal </span>
                                    <input 
                                        type="number" 
                                        className="font-bold w-10 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-colors"
                                        value={article.nomor_pasal}
                                        onChange={(e) => handleArticleChange(idx, 'nomor_pasal', e.target.value)}
                                    />
                                    <div className="mt-0">
                                        <input 
                                            type="text" 
                                            className="font-bold uppercase text-center w-full bg-transparent border-none placeholder-gray-300 focus:placeholder-gray-400 outline-none text-sm"
                                            placeholder="JUDUL PASAL (OPSIONAL)"
                                            value={article.judul_pasal}
                                            onChange={(e) => handleArticleChange(idx, 'judul_pasal', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <AutoResizeTextarea
                                    value={article.isi_pasal}
                                    onChange={(e) => handleArticleChange(idx, 'isi_pasal', e.target.value)}
                                    placeholder="Ketik isi pasal di sini..."
                                    className="text-justify min-h-[40px]"
                                />
                            </div>
                        ))}

                        <div className="flex justify-center py-6 group">
                            <button 
                                onClick={addArticle}
                                className="flex items-center gap-2 text-xs font-bold text-gray-400 group-hover:text-blue-600 bg-white group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-200 px-6 py-2 rounded-full transition shadow-sm"
                            >
                                <FaPlus /> Sisipkan Pasal Baru
                            </button>
                        </div>
                    </div>

                    {/* Penutup */}
                    <div className="group relative mt-4">
                        <AutoResizeTextarea
                            value={parts.penutup}
                            onChange={(e) => handlePartChange('penutup', e.target.value)}
                            placeholder="Ketik kalimat penutup di sini..."
                            className="text-justify"
                        />
                    </div>

                    {/* Tanda Tangan */}
                    <div className="flex justify-between mt-16 px-4 select-none opacity-50">
                        <div className="text-center w-64">
                            <p className="font-bold mb-20">PIHAK KEDUA,</p>
                            <p className="font-bold border-b border-black inline-block uppercase">{'{{NAMA_MITRA}}'}</p>
                        </div>
                        <div className="text-center w-64">
                            <p className="font-bold mb-20">PIHAK PERTAMA,</p>
                            <p className="font-bold border-b border-black inline-block">{'{{NAMA_PPK}}'}</p>
                        </div>
                    </div>

                    {/* Tombol Lampiran */}
                    <div className="mt-12 border-t border-dashed border-gray-300 pt-6">
                        {hasLampiran ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded">
                                        <FaTable />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-green-800 text-sm">Lampiran Aktif</h4>
                                        <p className="text-xs text-green-600">Tabel Rincian Tugas akan dicetak di halaman terpisah.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={toggleLampiran}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition"
                                >
                                    <FaTimes /> Hapus
                                </button>
                            </div>
                        ) : (
                            <div className="text-center group">
                                <button 
                                    onClick={toggleLampiran}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-500 rounded-full hover:border-[#1A2A80] hover:text-[#1A2A80] hover:bg-blue-50 transition shadow-sm text-sm font-bold"
                                >
                                    <FaPlus /> Tambah Lampiran (Tabel Rincian)
                                </button>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Otomatis menambahkan halaman baru berisi tabel tugas mitra.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
            
            <div className="h-20"></div> {/* Spacer bawah */}
        </div>

      </div>
    </div>
  );
};

export default TambahTemplate;