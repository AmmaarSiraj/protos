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
        
        // --- TAMBAHAN FILTER ---
        $kegiatanId = $request->query('kegiatan_id');
        $subkegiatanId = $request->query('subkegiatan_id');

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
                // --- TAMBAHAN JOIN KE KEGIATAN ---
                ->join('kegiatan as k', 's.id_kegiatan', '=', 'k.id')
                // ---------------------------------
                ->join('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 's.id')
                         ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                // Filter Status Penugasan (TETAP DISETUJUI)
                ->where('p.status_penugasan', '=', 'disetujui') 
                // Filter Tahun
                ->whereYear('s.tanggal_mulai', $tahun);

            // Tambahkan Filter Bulan
            if ($bulan && $bulan !== 'all') {
                $query->whereMonth('s.tanggal_mulai', $bulan);
            }

            // --- LOGIKA FILTER BARU ---
            if ($kegiatanId && $kegiatanId !== 'all') {
                $query->where('k.id', $kegiatanId);
            }

            if ($subkegiatanId && $subkegiatanId !== 'all') {
                $query->where('s.id', $subkegiatanId);
            }
            // --------------------------

            // Grouping dan Sorting
            $rows = $query->groupBy('m.id', 'm.nama_lengkap', 'm.sobat_id')
                ->orderByDesc('total_pendapatan') 
                ->orderBy('m.nama_lengkap')
                ->get();

            // 4. Format Hasil untuk Frontend
            $result = $rows->map(function ($row) use ($limitPeriode) {
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

    public function getApprovedFilters(Request $request)
    {
        $tahun = $request->query('tahun');

        // Query Join: Kegiatan -> Subkegiatan -> Penugasan
        $query = DB::table('kegiatan as k')
            ->join('subkegiatan as s', 'k.id', '=', 's.id_kegiatan')
            ->join('penugasan as p', 's.id', '=', 'p.id_subkegiatan')
            ->where('p.status_penugasan', '=', 'disetujui') // Filter Status
            ->select(
                'k.id as k_id', 
                'k.nama_kegiatan', 
                's.id as s_id', 
                's.nama_sub_kegiatan',
                's.tanggal_mulai'
            )
            ->distinct();

        // --- TAMBAHAN FILTER TAHUN ---
        if ($tahun) {
            $query->whereYear('s.tanggal_mulai', $tahun);
        }

        $raw = $query->get();

        // Format ulang data ke JSON hirarki
        $result = [];
        foreach ($raw as $row) {
            $kId = $row->k_id;
            
            if (!isset($result[$kId])) {
                $result[$kId] = [
                    'id' => $row->k_id,
                    'nama_kegiatan' => $row->nama_kegiatan,
                    'subkegiatan' => []
                ];
            }

            // Cek duplikasi subkegiatan
            $subExists = false;
            foreach ($result[$kId]['subkegiatan'] as $sub) {
                if ($sub['id'] == $row->s_id) {
                    $subExists = true;
                    break;
                }
            }

            if (!$subExists) {
                $result[$kId]['subkegiatan'][] = [
                    'id' => $row->s_id,
                    'nama_sub_kegiatan' => $row->nama_sub_kegiatan
                ];
            }
        }

        return response()->json(['data' => array_values($result)]);
    }
}