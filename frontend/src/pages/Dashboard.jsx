import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [message, setMessage] = useState("Memuat data backend...");

  useEffect(() => {
    axios.get('http://localhost:3001/api/halo')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error("Error mengambil data:", error);
        setMessage("Gagal terhubung ke backend");
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Selamat Datang di Dashboard
        </h1>
        <p className="text-xl text-gray-700 mb-10">Ini adalah halaman dashboard Anda.</p>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <strong className="block text-sm font-medium text-gray-500 uppercase tracking-wider">
            Pesan dari Backend
          </strong>
          <div className="mt-3 p-4 bg-gray-100 rounded-md">
            <p className="font-mono text-lg text-gray-800">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;