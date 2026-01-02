// src/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import ReCAPTCHA from "react-google-recaptcha"; // <--- 1. IMPORT INI

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaValue, setCaptchaValue] = useState(null); // <--- 2. STATE CAPTCHA
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';
  const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY; // Ambil key dari .env

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // <--- 3. VALIDASI CAPTCHA SEBELUM SUBMIT
    if (!captchaValue) {
        Swal.fire('Gagal', 'Silakan centang "Saya bukan robot" terlebih dahulu.', 'warning');
        return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/users/login`, {
        email,
        password,
        recaptcha_token: captchaValue // Kirim token ke backend jika backend sudah siap validasi
      });

      // Simpan token & user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil!',
        text: 'Selamat datang kembali.',
        timer: 1500,
        showConfirmButton: false
      });

      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard'); 
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: error.response?.data?.message || 'Email atau password salah.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 backdrop-blur-sm">
        
        {/* ... (Bagian Logo dan Header tetap sama) ... */}
        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Selamat Datang</h2>
            <p className="text-slate-500 mt-2 text-sm">Masuk untuk mengelola kinerja mitra.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* ... (Input Email dan Password tetap sama) ... */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
              placeholder="nama@email.com"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
              placeholder="••••••••"
              required 
            />
          </div>

          {/* <--- 4. KOMPONEN CAPTCHA DISINI */}
          <div className="flex justify-center my-4">
              <ReCAPTCHA
                sitekey={SITE_KEY}
                onChange={(val) => setCaptchaValue(val)}
              />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-500/30 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "Masuk Aplikasi"}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
                Belum punya akun?{' '}
                <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all">
                    Daftar Sekarang
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;