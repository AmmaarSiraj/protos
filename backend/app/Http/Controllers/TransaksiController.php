<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransaksiController extends Controller
{
    /**
     * Get Transaksi Mitra (Monitoring Honor)
     * Endpoint: GET /api/transaksi
     */
    public function index(Request $request)
    {
        // Ambil Parameter
        $tahun = $request->query('tahun');
        $bulan = $request->query('bulan');

        // Validasi
        if (!$tahun) {
            return response()->json(['error' => 'Filter Tahun wajib diisi.'], 400);
        }

        try {
            // 1. Ambil Aturan Batas Honor Dasar (Bulanan)
            $aturan = DB::table('aturan_periode')
                ->where('periode', $tahun)
                ->first(); 

            $batasHonorDasar = $aturan ? (int)$aturan->batas_honor : 0;

            // 2. Tentukan Limit Periode Berdasarkan Filter
            $limitPeriode = 0;
            if (!$bulan || $bulan === 'all') {
                $limitPeriode = $batasHonorDasar * 12;
            } else {
                $limitPeriode = $batasHonorDasar;
            }

            // 3. Query Transaksi (Complex Join)
            $query = DB::table('mitra as m')
                ->select(
                    'm.id',
                    'm.nama_lengkap',
                    'm.sobat_id',
                    DB::raw('COALESCE(SUM(h.tarif * kp.volume_tugas), 0) as total_pendapatan')
                )
                // Join Berantai
                ->join('kelompok_penugasan as kp', 'm.id', '=', 'kp.id_mitra')
                ->join('penugasan as p', 'kp.id_penugasan', '=', 'p.id')
                ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
                // Join Kompleks (2 Kondisi) untuk Honorarium
                ->join('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 's.id')
                         ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                // --- PERUBAHAN DI SINI: Filter Status Penugasan ---
                ->where('p.status_penugasan', '=', 'disetujui') 
                // --------------------------------------------------
                // Filter Tahun (MySQL YEAR function)
                ->whereYear('s.tanggal_mulai', $tahun);

            // Tambahkan Filter Bulan (Jika User memilih bulan spesifik)
            if ($bulan && $bulan !== 'all') {
                $query->whereMonth('s.tanggal_mulai', $bulan);
            }

            // Grouping dan Sorting
            $rows = $query->groupBy('m.id', 'm.nama_lengkap', 'm.sobat_id')
                ->orderByDesc('total_pendapatan') // Urutkan pendapatan terbesar
                ->orderBy('m.nama_lengkap')       // Urutkan nama abjad
                ->get();

            // 4. Format Hasil untuk Frontend
            $result = $rows->map(function ($row) use ($limitPeriode) {
                // Konversi string angka ke integer/float agar aman di JS
                $pendapatan = (float) $row->total_pendapatan;
                
                return [
                    'id' => $row->id,
                    'nama_lengkap' => $row->nama_lengkap,
                    'sobat_id' => $row->sobat_id,
                    'total_pendapatan' => $pendapatan,
                    'pendapatan_terfilter' => $pendapatan,
                    'limit_periode' => $limitPeriode,
                    'status_aman' => $pendapatan <= $limitPeriode 
                ];
            });

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Gagal memuat data transaksi.',
                'details' => $e->getMessage() 
            ], 500);
        }
    }
}