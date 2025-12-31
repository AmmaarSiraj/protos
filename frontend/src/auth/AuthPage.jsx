import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import ReCAPTCHA from "react-google-recaptcha"; 
import logoSikinerja from '../assets/logo.png'; 

const API_BASE_URL = 'http://127.0.0.1:8000/api';
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LevnTEsAAAAAD4R4bwkbDN2hhaWK5W1UYcTdXei";

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // --- STATE LOGIN ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // --- STATE REGISTER ---
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // --- STATE UI & CAPTCHA ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaValue, setCaptchaValue] = useState(null); 

  // HANDLER LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaValue) {
        setError("Silakan centang 'Saya bukan robot' terlebih dahulu.");
        return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, { 
        email: loginEmail, 
        password: loginPassword,
        recaptcha_token: captchaValue 
      });
      
      if (response.data && response.data.access_token) {
        const { access_token, user } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role === 'admin' || user.role === 'superadmin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/home');
        }
      } else {
        throw new Error("Token tidak diterima dari server.");
      }

    } catch (err) {
      console.error("Login Error:", err);
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.errors?.email?.[0] || 
                       "Login gagal. Periksa koneksi atau kredensial Anda.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // HANDLER REGISTER
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (regPassword !== regConfirm) {
      setError("Password konfirmasi tidak cocok.");
      return;
    }

    if (!captchaValue) {
        setError("Silakan centang 'Saya bukan robot' terlebih dahulu.");
        return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/register`, {
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: 'user',
        recaptcha_token: captchaValue
      });
      
      alert("Registrasi berhasil! Silakan login.");
      setIsSignUp(false);
      setCaptchaValue(null); 
      
      setRegUsername(''); 
      setRegEmail(''); 
      setRegPassword(''); 
      setRegConfirm(''); 

    } catch (err) {
      console.error("Register Error:", err);
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.errors?.email?.[0] ||
                       "Registrasi gagal.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (mode) => {
      setIsSignUp(mode);
      setError('');
      setCaptchaValue(null);
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-200 flex items-center justify-center p-4 font-sans overflow-hidden">
      
      {/* CONTAINER UTAMA */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[650px] overflow-hidden flex flex-col md:flex-row">
        
        {/* --- FORM REGISTER (Sign Up) --- */}
        {/* PERBAIKAN: Menambahkan 'md:' pada translate-x-full agar efek slide hanya terjadi di desktop */}
        <div 
          className={`absolute top-0 h-full transition-all duration-700 ease-in-out w-full md:w-1/2 left-0 
          ${isSignUp ? "md:translate-x-full opacity-100 z-20" : "opacity-0 z-0"}`}
        >
          <form onSubmit={handleRegister} className="bg-white flex flex-col items-center justify-center h-full px-8 text-center overflow-y-auto custom-scrollbar">
            <h1 className="text-2xl font-bold text-[#1A2A80] mb-2 mt-4">Buat Akun</h1>
            <p className="text-xs text-gray-400 mb-4">Gunakan email Anda untuk mendaftar</p>
            
            <div className="w-full space-y-2">
              <div className="bg-gray-100 p-2.5 rounded-lg flex items-center">
                <FaUser className="text-gray-400 mr-2 text-sm" />
                <input 
                  type="text" 
                  placeholder="Username" 
                  className="bg-transparent outline-none text-sm flex-1" 
                  value={regUsername} 
                  onChange={e => setRegUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="bg-gray-100 p-2.5 rounded-lg flex items-center">
                <FaEnvelope className="text-gray-400 mr-2 text-sm" />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="bg-transparent outline-none text-sm flex-1" 
                  value={regEmail} 
                  onChange={e => setRegEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="bg-gray-100 p-2.5 rounded-lg flex items-center">
                <FaLock className="text-gray-400 mr-2 text-sm" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="bg-transparent outline-none text-sm flex-1" 
                  value={regPassword} 
                  onChange={e => setRegPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="bg-gray-100 p-2.5 rounded-lg flex items-center">
                <FaLock className="text-gray-400 mr-2 text-sm" />
                <input 
                  type="password" 
                  placeholder="Konfirmasi Password" 
                  className="bg-transparent outline-none text-sm flex-1" 
                  value={regConfirm} 
                  onChange={e => setRegConfirm(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="mt-4 mb-2 flex justify-center transform scale-90 origin-center">
                <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={setCaptchaValue}
                />
            </div>

            {error && isSignUp && <p className="text-red-500 text-xs mb-2 bg-red-50 p-2 rounded w-full">{error}</p>}

            <button type="submit" disabled={loading} className="bg-[#1A2A80] text-white font-bold py-3 px-10 rounded-full uppercase text-xs tracking-wider transform transition-transform active:scale-95 hover:shadow-lg disabled:opacity-50 mb-4">
              {loading ? 'Proses...' : 'Daftar'}
            </button>
            
            <p className="text-sm text-gray-600 md:hidden pb-4">
              Sudah punya akun? <button type="button" onClick={() => toggleMode(false)} className="text-[#1A2A80] font-bold underline">Login</button>
            </p>
          </form>
        </div>

        {/* --- FORM LOGIN (Sign In) --- */}
        {/* PERBAIKAN: Menambahkan 'md:' pada translate-x-full agar efek slide hanya terjadi di desktop */}
        <div 
          className={`absolute top-0 h-full transition-all duration-700 ease-in-out w-full md:w-1/2 left-0 z-10 
          ${isSignUp ? "md:translate-x-full opacity-0" : "opacity-100"}`}
        >
          <form onSubmit={handleLogin} className="bg-white flex flex-col items-center justify-center h-full px-8 text-center overflow-y-auto custom-scrollbar">
            <div className="mb-4 mt-4">
               <img src={logoSikinerja} alt="Logo SIKINERJA" className="w-20 h-auto mx-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A2A80] mb-2">Login MAKINASIK</h1>
            <p className="text-xs text-gray-400 mb-6">Masuk untuk Mengelola Kinerja dan Administrasi Mitra</p>
            
            <div className="w-full space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg flex items-center border border-transparent focus-within:border-[#1A2A80] transition-colors">
                <FaEnvelope className="text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Email / Username" 
                  className="bg-transparent outline-none text-sm flex-1 text-gray-700" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg flex items-center border border-transparent focus-within:border-[#1A2A80] transition-colors">
                <FaLock className="text-gray-400 mr-2" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="bg-transparent outline-none text-sm flex-1 text-gray-700" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="mb-4 flex justify-center transform scale-90 origin-center">
                <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={setCaptchaValue}
                />
            </div>

            {error && !isSignUp && <p className="text-red-500 text-xs mb-4 bg-red-50 p-2 rounded w-full">{error}</p>}

            <button type="submit" disabled={loading} className="bg-[#1A2A80] text-white font-bold py-3 px-10 rounded-full uppercase text-xs tracking-wider transform transition-transform active:scale-95 hover:shadow-lg disabled:opacity-50 mb-4">
              {loading ? 'Masuk...' : 'Masuk'}
            </button>

            <p className="text-sm text-gray-600 md:hidden pb-4">
              Belum punya akun? <button type="button" onClick={() => toggleMode(true)} className="text-[#1A2A80] font-bold underline">Daftar</button>
            </p>
          </form>
        </div>

        {/* --- OVERLAY CONTAINER (Panel Biru) --- */}
        <div 
          className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-50 hidden md:block 
          ${isSignUp ? "-translate-x-full" : ""}`}
        >
          <div 
            className={`bg-[#1A2A80] text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out 
            ${isSignUp ? "translate-x-1/2" : "translate-x-0"}`}
          >
            
            {/* Overlay Kiri (Untuk ke Login) */}
            <div className={`absolute top-0 flex flex-col items-center justify-center w-1/2 h-full px-10 text-center space-y-6 transform transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-0" : "-translate-x-[20%]"}`}>
              <h1 className="text-3xl font-bold">Sudah Punya Akun?</h1>
              <p className="text-blue-100 leading-relaxed text-sm">
                Silakan masuk kembali untuk melanjutkan pekerjaan dan manajemen kinerja Anda.
              </p>
              <button 
                onClick={() => toggleMode(false)}
                className="bg-transparent border-2 border-white text-white font-bold py-2.5 px-8 rounded-full uppercase text-xs tracking-wider hover:bg-white hover:text-[#1A2A80] transition-all duration-300 transform active:scale-95"
              >
                Masuk di sini
              </button>
            </div>

            {/* Overlay Kanan (Untuk ke Daftar) */}
            <div className={`absolute top-0 right-0 flex flex-col items-center justify-center w-1/2 h-full px-10 text-center space-y-6 transform transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-[20%]" : "translate-x-0"}`}>
              <h1 className="text-3xl font-bold">Halo, Mitra!</h1>
              <p className="text-blue-100 leading-relaxed text-sm">
                Bergabunglah bersama kami. Masukkan data diri Anda untuk memulai perjalanan baru.
              </p>
              <button 
                onClick={() => toggleMode(true)}
                className="bg-transparent border-2 border-white text-white font-bold py-2.5 px-8 rounded-full uppercase text-xs tracking-wider hover:bg-white hover:text-[#1A2A80] transition-all duration-300 transform active:scale-95"
              >
                Daftar di sini
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;