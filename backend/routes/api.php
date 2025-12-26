<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\KegiatanController;
use App\Http\Controllers\SubkegiatanController;
use App\Http\Controllers\JabatanMitraController;
use App\Http\Controllers\HonorariumController;
use App\Http\Controllers\TahunAktifController;
use App\Http\Controllers\AturanPeriodeController;
use App\Http\Controllers\MitraController;
use App\Http\Controllers\PenugasanController;
use App\Http\Controllers\KelompokPenugasanController;
use App\Http\Controllers\PerencanaanController;
use App\Http\Controllers\KelompokPerencanaanController;
use App\Http\Controllers\SatuanKegiatanController;
use App\Http\Controllers\SpkSettingController;
use App\Http\Controllers\MasterTemplateSPKController;
use App\Http\Controllers\TemplateBagianTeksController;
use App\Http\Controllers\TemplatePasalController;
use App\Http\Controllers\TransaksiController;
use App\Http\Controllers\SystemSettingController;

Route::get('/users', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/test', function () {
    return response()->json(['message' => 'Backend Laravel Berhasil Terhubung!']);
});

Route::post('/users/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/system-settings', [SystemSettingController::class, 'index']);

// --- PROTECTED ROUTES (Harus login / punya Token) ---
Route::middleware(['auth:sanctum'])->group(function () {

    // Auth

    Route::post('/system-settings/upload', [SystemSettingController::class, 'upload']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [UserController::class, 'me']); // Cek profile sendiri

    // Manajemen User
    Route::post('/users/import', [UserController::class, 'import']);
    Route::get('/users/template', [UserController::class, 'downloadTemplate']);
    Route::get('/users', [UserController::class, 'index']); // Ambil semua list user
    Route::post('/users', [UserController::class, 'store']);     // Tambah Baru
    Route::get('/users/{id}', [UserController::class, 'show']);  // Detail 1 User
    Route::put('/users/{id}', [UserController::class, 'update']); // Edit User
    Route::delete('/users/{id}', [UserController::class, 'destroy']);


    Route::get('/kegiatan', [KegiatanController::class, 'index']);      // List semua
    Route::post('/kegiatan', [KegiatanController::class, 'store']);     // Buat baru
    Route::get('/kegiatan/{id}', [KegiatanController::class, 'show']);  // Detail
    Route::put('/kegiatan/{id}', [KegiatanController::class, 'update']); // Edit
    Route::delete('/kegiatan/{id}', [KegiatanController::class, 'destroy']); // Hapus

    // --- MANAJEMEN SUB KEGIATAN ---
    // Create (Butuh id_kegiatan di body)
    Route::get('/subkegiatan', [SubkegiatanController::class, 'index']);
    Route::post('/subkegiatan', [SubkegiatanController::class, 'store']);
    Route::get('/subkegiatan/template', [SubkegiatanController::class, 'downloadTemplate']);
    Route::post('/subkegiatan/import', [SubkegiatanController::class, 'import']);
    Route::put('/subkegiatan/{id}/info', [SubkegiatanController::class, 'update']);
    Route::get('/subkegiatan/{id}', [SubkegiatanController::class, 'show']);
    Route::delete('/subkegiatan/{id}', [SubkegiatanController::class, 'destroy']);
    Route::get('/subkegiatan/kegiatan/{id}', [SubkegiatanController::class, 'getByKegiatan']);

    Route::get('/jabatan', [JabatanMitraController::class, 'index']);
    Route::post('/jabatan', [JabatanMitraController::class, 'store']);
    Route::get('/jabatan/{id}', [JabatanMitraController::class, 'show']);
    Route::put('/jabatan/{id}', [JabatanMitraController::class, 'update']);
    Route::delete('/jabatan/{id}', [JabatanMitraController::class, 'destroy']);

    // --- MANAJEMEN HONORARIUM ---
    Route::get('/honorarium', [HonorariumController::class, 'index']); // List semua honor
    Route::post('/honorarium', [HonorariumController::class, 'store']); // Tambah honor ke subkegiatan
    Route::get('/honorarium/{id}', [HonorariumController::class, 'show']);
    Route::put('/honorarium/{id}', [HonorariumController::class, 'update']);
    Route::delete('/honorarium/{id}', [HonorariumController::class, 'destroy']);

    // Opsional: Ambil honor berdasarkan subkegiatan tertentu
    Route::get('/subkegiatan/{id}/honorarium', [HonorariumController::class, 'getBySubkegiatan']);
    Route::get('/tahun-aktif', [TahunAktifController::class, 'index']);
    Route::post('/tahun-aktif', [TahunAktifController::class, 'store']);
    Route::get('/tahun-aktif/{id}', [TahunAktifController::class, 'show']);
    Route::put('/tahun-aktif/{id}', [TahunAktifController::class, 'update']);
    Route::delete('/tahun-aktif/{id}', [TahunAktifController::class, 'destroy']);

    Route::get('/aturan-periode', [AturanPeriodeController::class, 'index']);
    Route::post('/aturan-periode', [AturanPeriodeController::class, 'store']);
    Route::get('/aturan-periode/{id}', [AturanPeriodeController::class, 'show']);
    Route::put('/aturan-periode/{id}', [AturanPeriodeController::class, 'update']);
    Route::delete('/aturan-periode/{id}', [AturanPeriodeController::class, 'destroy']);

    Route::post('/mitra/import', [MitraController::class, 'import']);
    Route::get('/mitra/periode/{periode}', [MitraController::class, 'getByPeriode']);
    Route::get('/mitra', [MitraController::class, 'index']);
    Route::get('/mitraop', [MitraController::class, 'optimize']);
    Route::get('/mitra/aktif', [MitraController::class, 'mitraAktif']);
    Route::post('/mitra', [MitraController::class, 'store']);
    Route::get('/mitra/{id}', [MitraController::class, 'show']);
    Route::put('/mitra/{id}', [MitraController::class, 'update']);
    Route::delete('/mitra/{id}', [MitraController::class, 'destroy']);

    Route::get('/penugasan', [PenugasanController::class, 'index']);
    Route::post('/penugasan', [PenugasanController::class, 'store']);
    Route::get('/penugasan/{id}', [PenugasanController::class, 'show']);
    Route::put('/penugasan/{id}', [PenugasanController::class, 'update']);
    Route::get('/penugasan/mitra/{id}/periode/{periode}', [PenugasanController::class, 'getByMitraAndPeriode']);
    Route::delete('/penugasan/{id}', [PenugasanController::class, 'destroy']);
    Route::get('/penugasan/{id}/anggota', [PenugasanController::class, 'getAnggota']);
    Route::post('/penugasan/import-perencanaan', [App\Http\Controllers\PenugasanController::class, 'importFromPerencanaan']);
    Route::post('/penugasan/preview-import', [PenugasanController::class, 'previewImport']);
    Route::post('/penugasan/store-import', [PenugasanController::class, 'storeImport']);


    // --- KELOMPOK PENUGASAN (DETAIL ANGGOTA) ---
    Route::get('/kelompok-penugasan', [KelompokPenugasanController::class, 'index']);
    Route::post('/kelompok-penugasan', [KelompokPenugasanController::class, 'store']); // Tambah mitra
    Route::put('/kelompok-penugasan/{id}', [KelompokPenugasanController::class, 'update']); // Edit mitra
    Route::delete('/kelompok-penugasan/{id}', [KelompokPenugasanController::class, 'destroy']); // Hapus mitra

    Route::get('/perencanaan', [PerencanaanController::class, 'index']);
    Route::post('/perencanaan', [PerencanaanController::class, 'store']);
    Route::get('/perencanaan/mitra/{id}/periode/{periode}', [PerencanaanController::class, 'getByMitraAndPeriode']);
    Route::get('/perencanaan/{id}', [PerencanaanController::class, 'show']);
    Route::delete('/perencanaan/{id}', [PerencanaanController::class, 'destroy']);
    Route::get('/perencanaan/{id}/anggota', [PerencanaanController::class, 'getAnggota']);
    Route::post('/perencanaan/preview-import', [PerencanaanController::class, 'previewImport']);
    Route::post('/perencanaan/store-import', [PerencanaanController::class, 'storeImport']);

    Route::get('/rekap/bulanan', [PerencanaanController::class, 'getRekapBulanan']);
    Route::get('/rekap/mitra', [PerencanaanController::class, 'getRekapMitra']);
    Route::get('/rekap/detail', [PerencanaanController::class, 'getRekapDetail']);

    // --- KELOMPOK PERENCANAAN (DETAIL ANGGOTA) ---
    Route::get('/kelompok-perencanaan', [KelompokPerencanaanController::class, 'index']);
    Route::post('/kelompok-perencanaan', [KelompokPerencanaanController::class, 'store']);
    Route::put('/kelompok-perencanaan/{id}', [KelompokPerencanaanController::class, 'update']);
    Route::delete('/kelompok-perencanaan/{id}', [KelompokPerencanaanController::class, 'destroy']);

    Route::get('/satuan-kegiatan', [SatuanKegiatanController::class, 'index']);
    Route::post('/satuan-kegiatan', [SatuanKegiatanController::class, 'store']);
    Route::get('/satuan-kegiatan/{id}', [SatuanKegiatanController::class, 'show']);
    Route::put('/satuan-kegiatan/{id}', [SatuanKegiatanController::class, 'update']);
    Route::delete('/satuan-kegiatan/{id}', [SatuanKegiatanController::class, 'destroy']);

    Route::get('/spk-setting', [SpkSettingController::class, 'index']);
    Route::post('/spk-setting', [SpkSettingController::class, 'store']);
    Route::get('/spk-setting/{id}', [SpkSettingController::class, 'show']);
    Route::put('/spk-setting/{id}', [SpkSettingController::class, 'update']);
    Route::delete('/spk-setting/{id}', [SpkSettingController::class, 'destroy']);

    // Route khusus cari by periode (berguna saat cetak PDF)
    Route::get('/spk-setting/periode/{periode}', [SpkSettingController::class, 'getByPeriode']);

    Route::get('/template-spk', [MasterTemplateSPKController::class, 'index']);
    Route::post('/template-spk', [MasterTemplateSPKController::class, 'store']);
    Route::put('/template-spk/{id}', [MasterTemplateSPKController::class, 'update']);
    Route::get('/template-spk/{id}', [MasterTemplateSPKController::class, 'show']); // Dapet full teks + pasal
    Route::delete('/template-spk/{id}', [MasterTemplateSPKController::class, 'destroy']);
    Route::put('/template-spk/{id}/set-active', [MasterTemplateSPKController::class, 'setActive']); // Set Default

    // --- MANAJEMEN BAGIAN TEKS (Pembuka, Penutup, dll) ---
    // Pakai 1 route ini utk insert atau update
    Route::post('/template-bagian-teks', [TemplateBagianTeksController::class, 'storeOrUpdate']);

    // --- MANAJEMEN PASAL ---
    Route::post('/template-pasal', [TemplatePasalController::class, 'store']);
    Route::put('/template-pasal/{id}', [TemplatePasalController::class, 'update']);
    Route::delete('/template-pasal/{id}', [TemplatePasalController::class, 'destroy']);

    Route::get('/transaksi', [TransaksiController::class, 'index']);
});
