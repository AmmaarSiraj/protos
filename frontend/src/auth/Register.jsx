// src/auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import ReCAPTCHA from "react-google-recaptcha"; // <--- 1. IMPORT

const Register = () => {
  // ... state yang sudah ada (username, email, password, confirmPassword)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [captchaValue, setCaptchaValue] = useState(null); // <--- 2. STATE CAPTCHA
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';
  const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY; // Ambil key

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire('Error', 'Password dan Konfirmasi Password tidak cocok!', 'error');
      return;
    }

    // <--- 3. VALIDASI CAPTCHA
    if (!captchaValue) {
        Swal.fire('Gagal', 'Silakan centang "Saya bukan robot" terlebih dahulu.', 'warning');
        return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/users`, {
        username,
        email,
        password,
        role: 'user',
        recaptcha_token: captchaValue // Kirim token
      });

      Swal.fire('Sukses', 'Registrasi berhasil! Silakan login.', 'success');
      navigate('/login');
    } catch (error) {
      Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat registrasi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 backdrop-blur-sm">
        
        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buat Akun Baru</h2>
            <p className="text-slate-500 mt-2 text-sm">Bergabunglah untuk menjadi mitra statistik.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
            
            {/* ... INPUT FORM YANG SUDAH ADA (Username, Email, Password, Confirm) ... */}
            {/* Pastikan kode input form Anda tetap ada di sini */}

             {/* Contoh input Username (sebagai referensi penempatan) */}
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none" required />
            </div>
            {/* ... Input Email, Password, Confirm Password ... */}

             {/* <--- 4. KOMPONEN CAPTCHA */}
             <div className="flex justify-center my-4">
                <ReCAPTCHA
                    sitekey={SITE_KEY}
                    onChange={(val) => setCaptchaValue(val)}
                />
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {isLoading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : "Daftar Sekarang"}
            </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all">
                    Masuk disini
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Register;