<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

// --- 1. ROUTE KHUSUS (Taruh Paling Atas) ---

Route::get('/link-storage', function () {
    // 1. Tentukan lokasi folder asli (target)
    $targetFolder = storage_path('app/public');
    
    // 2. Tentukan lokasi shortcut (link)
    $linkFolder = public_path('storage');

    // 3. Cek apakah folder/link 'storage' sudah ada di public
    if (file_exists($linkFolder)) {
        return 'Folder "storage" sudah ada di public. Hapus folder tersebut lewat File Manager jika gambar masih error, lalu refresh halaman ini.';
    }

    // 4. Coba buat link menggunakan fungsi native PHP (bukan Artisan)
    try {
        symlink($targetFolder, $linkFolder);
        return 'Berhasil! Symlink telah dibuat menggunakan fungsi native symlink().';
    } catch (\Throwable $e) {
        // Jika ini juga gagal, berarti hosting memblokir symlink()
        return 'Gagal membuat symlink: ' . $e->getMessage() . '. Solusi: Hubungi pihak hosting untuk minta "dibuatkan symlink storage".';
    }
});

Route::get('/bersih-bersih', function () {
    try {
        Artisan::call('optimize:clear');
        return 'Sukses! Cache, Config, Route, dan View sudah dibersihkan.';
    } catch (\Exception $e) {
        return 'Gagal: ' . $e->getMessage();
    }
});

// --- 2. ROUTE UTAMA ---

Route::get('/', function () {
    return view('welcome');
});

// --- 3. CATCH-ALL (Wajib Paling Bawah) ---
// Route ini menangkap semua URL yang TIDAK didefinisikan di atas
// dan mengarahkannya ke React (view welcome)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');