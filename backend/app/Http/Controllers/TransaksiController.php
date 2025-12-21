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
            // Node.js: SELECT batas_honor FROM aturan_periode WHERE periode = ? LIMIT 1
            $aturan = DB::table('aturan_periode')
                ->where('periode', $tahun)
                ->first(); // Mengambil satu baris

            $batasHonorDasar = $aturan ? (int)$aturan->batas_honor : 0;

            // 2. Tentukan Limit Periode Berdasarkan Filter
            // Logic: Jika akumulasi setahun ('all' atau null), limit dikali 12.
            // Jika bulan spesifik, limit tetap (bulanan).
            $limitPeriode = 0;
            if (!$bulan || $bulan === 'all') {
                $limitPeriode = $batasHonorDasar * 12;
            } else {
                $limitPeriode = $batasHonorDasar;
            }

            // 3. Query Transaksi (Complex Join)
            /* Node.js SQL Logic:
               SELECT m.id, m.nama_lengkap, ... SUM(h.tarif * kp.volume_tugas)
               FROM mitra m 
               JOIN kelompok_penugasan kp ...
               JOIN penugasan p ...
               JOIN subkegiatan s ...
               JOIN honorarium h ON (h.id_subkegiatan = s.id AND h.kode_jabatan = kp.kode_jabatan)
               WHERE YEAR...
            */

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
            // Map data untuk menambahkan status_aman dan limit_periode
            $result = $rows->map(function ($row) use ($limitPeriode) {
                // Konversi string angka ke integer/float agar aman di JS
                $pendapatan = (float) $row->total_pendapatan;
                
                return [
                    'id' => $row->id,
                    'nama_lengkap' => $row->nama_lengkap,
                    'sobat_id' => $row->sobat_id,
                    'total_pendapatan' => $pendapatan,
                    // Field tambahan untuk frontend logic
                    'pendapatan_terfilter' => $pendapatan,
                    'limit_periode' => $limitPeriode,
                    'status_aman' => $pendapatan <= $limitPeriode // return boolean
                ];
            });

            return response()->json($result);

        } catch (\Exception $e) {
            // Log error jika perlu: \Log::error($e->getMessage());
            return response()->json([
                'error' => 'Gagal memuat data transaksi.',
                'details' => $e->getMessage() // Opsional, bisa dihapus di production
            ], 500);
        }
    }
}