// src/components/FileUploader.jsx
import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileImage } from 'react-icons/fa';

const FileUploader = ({ label, currentImage, onFileSelect, isLoading, helpText }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Handle Drag Events
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) return alert('Hanya file gambar yang diperbolehkan');
    
    // Preview lokal
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Kirim ke parent
    onFileSelect(file);
  };

  // Tentukan gambar yang ditampilkan (Preview lokal > URL dari DB > Placeholder)
  const displayImage = preview || currentImage;

  return (
    <div className="w-full">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      
      <div 
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative w-full h-64 rounded-2xl border-2 border-dashed flex flex-col justify-center items-center cursor-pointer transition-all duration-300 overflow-hidden group
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleInputChange} 
          className="hidden" 
          accept="image/*"
        />

        {displayImage ? (
          <>
            <img src={displayImage} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4 bg-gray-50/50" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg">
                    <FaCloudUploadAlt className="text-blue-600 text-3xl" />
                </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6">
            <FaFileImage className="mx-auto text-4xl text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Drag & Drop gambar di sini</p>
            <p className="text-xs text-gray-400 mt-1">atau klik untuk membuka explorer</p>
          </div>
        )}
        
        {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                    <span className="mt-2 text-xs font-bold text-blue-800">Mengupload...</span>
                </div>
            </div>
        )}
      </div>
      {helpText && <p className="text-xs text-gray-400 mt-2 px-1">{helpText}</p>}
    </div>
  );
};

export default FileUploader;