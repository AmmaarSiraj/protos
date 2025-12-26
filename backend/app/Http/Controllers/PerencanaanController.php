<?php

namespace App\Http\Controllers;

use App\Models\Perencanaan;
use App\Models\KelompokPerencanaan;
use App\Models\Honorarium;
use App\Models\AturanPeriode;
use App\Models\Mitra;
use App\Models\Subkegiatan;
use App\Models\Kegiatan;
use App\Models\JabatanMitra;
use App\Models\TahunAktif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel; 

class PerencanaanController extends Controller
{
    public function index()
    {
        $perencanaan = Perencanaan::with(['subkegiatan.kegiatan', 'pengawas'])
            ->latest()
            ->get();

        $formattedData = $perencanaan->map(function ($item) {
            return $this->formatItem($item);
        });

        return response()->json(['status' => 'success', 'data' => $formattedData]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_subkegiatan' => 'required|exists:subkegiatan,id',
            'id_pengawas'    => 'required|exists:user,id',
            'anggota'        => 'nullable|array',
            'anggota.*.id_mitra'     => 'required|exists:mitra,id',
            'anggota.*.kode_jabatan' => 'required|exists:jabatan_mitra,kode_jabatan',
            'anggota.*.volume_tugas' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $exists = Perencanaan::where('id_subkegiatan', $request->id_subkegiatan)->first();
        if ($exists) {
            return response()->json(['message' => 'Perencanaan untuk subkegiatan ini sudah ada'], 409);
        }

        DB::beginTransaction();
        try {
            $perencanaan = Perencanaan::create([
                'id_subkegiatan' => $request->id_subkegiatan,
                'id_pengawas'    => $request->id_pengawas
            ]);

            if ($request->has('anggota') && is_array($request->anggota)) {
                foreach ($request->anggota as $anggota) {
                    KelompokPerencanaan::create([
                        'id_perencanaan' => $perencanaan->id,
                        'id_mitra'       => $anggota['id_mitra'],
                        'kode_jabatan'   => $anggota['kode_jabatan'] ?? null,
                        'volume_tugas'   => $anggota['volume_tugas'] ?? 0
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Perencanaan berhasil dibuat.',
                'data' => $this->formatSingle($perencanaan->id)
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal membuat perencanaan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * IMPORT: Preview dengan Limit Honor Dinamis (Sesuai Tahun Kegiatan)
     */
    public function previewImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls'
        ]);

        try {
            $data = Excel::toArray([], $request->file('file'));
            $rows = $data[0] ?? [];
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membaca file: ' . $e->getMessage()], 400);
        }

        if (count($rows) < 2) { 
            return response()->json(['message' => 'File kosong atau format salah.'], 400);
        }

        array_shift($rows); 

        $validData = [];
        $warnings = [];

        $allKegiatan = Kegiatan::all()->keyBy(fn($item) => Str::lower(trim($item->nama_kegiatan)));
        $allJabatan = JabatanMitra::all(); 

        foreach ($rows as $index => $row) {
            
            if (empty($row[0]) && empty($row[2])) continue;

            $namaKegiatan = trim((string)$row[0]);
            $namaSub      = trim((string)$row[1]);
            $sobatId      = trim((string)$row[2]);
            $namaJabatan  = trim((string)$row[3]);
            $volume       = isset($row[4]) ? (int)$row[4] : 1; 

            $rowNum = $index + 2;

            $kegiatan = $allKegiatan[Str::lower($namaKegiatan)] ?? null;
            if (!$kegiatan) {
                $warnings[] = "Baris $rowNum: Kegiatan '$namaKegiatan' tidak ditemukan di sistem.";
                continue;
            }

            $subkegiatan = Subkegiatan::where('id_kegiatan', $kegiatan->id)
                ->where(DB::raw('LOWER(nama_sub_kegiatan)'), Str::lower($namaSub))
                ->first();

            if (!$subkegiatan) {
                $warnings[] = "Baris $rowNum: Sub Kegiatan '$namaSub' tidak ditemukan di dalam kegiatan '$namaKegiatan'.";
                continue;
            }

            $mitra = Mitra::where('sobat_id', $sobatId)->first();
            if (!$mitra) {
                $warnings[] = "Baris $rowNum: Mitra dengan ID '$sobatId' tidak ditemukan.";
                continue;
            }

            // --- PERBAIKAN: Ambil Limit Honor Sesuai Tahun Kegiatan ---
            $tahunKegiatan = date('Y', strtotime($subkegiatan->tanggal_mulai));
            $aturan = AturanPeriode::where('periode', $tahunKegiatan)->first();
            $batasHonor = $aturan ? (float)$aturan->batas_honor : 0; 
            // ----------------------------------------------------------

            $kodeJabatan = null;
            $namaJabatanResmi = null;
            
            $jabatanMatch = $allJabatan->first(fn($j) => Str::lower($j->nama_jabatan) === Str::lower($namaJabatan));
            
            if (!$jabatanMatch) {
                $jabatanMatch = $allJabatan->first(fn($j) => str_contains(Str::lower($namaJabatan), Str::lower($j->nama_jabatan)));
            }

            if ($jabatanMatch) {
                $kodeJabatan = $jabatanMatch->kode_jabatan;
                $namaJabatanResmi = $jabatanMatch->nama_jabatan;
            } else {
                $warnings[] = "Baris $rowNum: Jabatan '$namaJabatan' tidak dikenali.";
                continue;
            }

            // Hitung Statistik (Sama seperti Penugasan)
            $honorarium = Honorarium::where('id_subkegiatan', $subkegiatan->id)
                ->where('kode_jabatan', $kodeJabatan)
                ->first();
            
            $tarif = $honorarium ? $honorarium->tarif : 0;
            $targetVol = $honorarium ? $honorarium->basis_volume : 0; 

            // Hitung Existing Volume (Dari tabel Perencanaan)
            $existingVol = DB::table('kelompok_perencanaan as kp')
                ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
                ->where('p.id_subkegiatan', $subkegiatan->id)
                ->sum('kp.volume_tugas');

            // Hitung Existing Income (Dari tabel Perencanaan - Bulan Ini)
            $bulanKegiatan = date('m', strtotime($subkegiatan->tanggal_mulai));
            $existingIncome = DB::table('kelompok_perencanaan as kp')
                ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
                ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
                ->leftJoin('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 's.id')
                         ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                ->where('kp.id_mitra', $mitra->id)
                ->whereYear('s.tanggal_mulai', $tahunKegiatan)
                ->whereMonth('s.tanggal_mulai', $bulanKegiatan)
                ->sum(DB::raw('kp.volume_tugas * IFNULL(h.tarif, 0)'));

            $newIncome = $volume * $tarif;

            $validData[] = [
                'id_kegiatan'       => $kegiatan->id,
                'nama_kegiatan'     => $kegiatan->nama_kegiatan,
                'id_subkegiatan'    => $subkegiatan->id,
                'nama_sub_kegiatan' => $subkegiatan->nama_sub_kegiatan,
                'id_mitra'          => $mitra->id,
                'nama_mitra'        => $mitra->nama_lengkap,
                'sobat_id'          => $mitra->sobat_id,
                'kode_jabatan'      => $kodeJabatan,
                'nama_jabatan'      => $namaJabatanResmi,
                'volume'            => $volume,
                'stats' => [
                    'target_vol'      => $targetVol,
                    'existing_vol'    => $existingVol, 
                    'limit_honor'     => $batasHonor, // Limit Dinamis
                    'existing_income' => $existingIncome,
                    'new_income'      => $newIncome
                ]
            ];
        }

        return response()->json([
            'valid_data' => $validData,
            'warnings'   => $warnings
        ]);
    }

    public function storeImport(Request $request)
    {
        $request->validate([
            'data' => 'required|array',
            'data.*.id_subkegiatan' => 'required',
            'data.*.id_mitra' => 'required'
        ]);

        DB::beginTransaction();
        try {
            $count = 0;
            $grouped = collect($request->data)->groupBy('id_subkegiatan');

            foreach ($grouped as $subId => $items) {
                // Gunakan ID user login atau fallback ID 1
                $userId = $request->user() ? $request->user()->id : 1; 
                
                // Pastikan user ada di DB
                if (!DB::table('user')->where('id', $userId)->exists()) {
                    $firstUser = DB::table('user')->first();
                    $userId = $firstUser ? $firstUser->id : $userId; 
                }

                $perencanaan = Perencanaan::firstOrCreate(
                    ['id_subkegiatan' => $subId],
                    ['id_pengawas' => $userId] 
                );

                foreach ($items as $item) {
                    KelompokPerencanaan::updateOrCreate(
                        [
                            'id_perencanaan' => $perencanaan->id,
                            'id_mitra'       => $item['id_mitra']
                        ],
                        [
                            'kode_jabatan' => $item['kode_jabatan'],
                            'volume_tugas' => $item['volume']
                        ]
                    );
                    $count++;
                }
            }

            DB::commit();
            return response()->json(['status' => 'success', 'message' => "$count mitra berhasil diimport ke perencanaan."]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $data = $this->formatSingle($id);
        if (!$data) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function getAnggota($id)
    {
        try {
            $anggota = DB::table('kelompok_perencanaan as kp')
                ->join('mitra as m', 'kp.id_mitra', '=', 'm.id')
                ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
                ->leftJoin('jabatan_mitra as jm', 'kp.kode_jabatan', '=', 'jm.kode_jabatan')
                ->leftJoin('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 'p.id_subkegiatan')
                        ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                ->where('kp.id_perencanaan', $id)
                ->select([
                    'm.id as id_mitra',
                    'm.nama_lengkap',
                    'm.nik',
                    'm.nomor_hp',
                    'kp.id as id_kelompok',
                    'kp.created_at as bergabung_sejak',
                    'kp.kode_jabatan',
                    'kp.volume_tugas',
                    DB::raw("IFNULL(jm.nama_jabatan, 'Belum ditentukan') as nama_jabatan"),
                    DB::raw("IFNULL(h.tarif, 0) as harga_satuan"),
                    DB::raw("(IFNULL(h.tarif, 0) * kp.volume_tugas) as total_honor")
                ])
                ->orderBy('m.nama_lengkap', 'asc')
                ->get();

            return response()->json($anggota);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Terjadi kesalahan: ' . $e->getMessage()], 500);
        }
    }

    public function getByMitraAndPeriode($id_mitra, $periode)
    {
        try {
            $parts = explode('-', $periode);
            if (count($parts) !== 2) {
                return response()->json(['message' => 'Format periode salah. Gunakan YYYY-MM'], 400);
            }
            $year = $parts[0];
            $month = $parts[1];

            $plans = DB::table('kelompok_perencanaan as kp')
                ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
                ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
                ->join('kegiatan as k', 's.id_kegiatan', '=', 'k.id')
                ->leftJoin('jabatan_mitra as jm', 'kp.kode_jabatan', '=', 'jm.kode_jabatan')
                ->leftJoin('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 's.id')
                        ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                ->leftJoin('satuan_kegiatan as sat', 'h.id_satuan', '=', 'sat.id')
                ->where('kp.id_mitra', $id_mitra)
                ->whereYear('s.tanggal_mulai', $year)
                ->whereMonth('s.tanggal_mulai', $month)
                ->select([
                    's.nama_sub_kegiatan',
                    's.tanggal_mulai',
                    's.tanggal_selesai',
                    'kp.volume_tugas as target_volume',
                    'sat.nama_satuan',
                    'jm.nama_jabatan',
                    DB::raw("IFNULL(h.tarif, 0) as harga_satuan"),
                    DB::raw("(kp.volume_tugas * IFNULL(h.tarif, 0)) as total_honor_estimasi"),
                    DB::raw("COALESCE(h.beban_anggaran, k.nama_kegiatan) as beban_anggaran")
                ])
                ->orderBy('s.tanggal_mulai', 'asc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $plans
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Terjadi kesalahan: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $perencanaan = Perencanaan::find($id);
        if (!$perencanaan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $perencanaan->delete();
        return response()->json(['status' => 'success', 'message' => 'Perencanaan berhasil dihapus.']);
    }

    private function getBatasHonorBulanan($year)
    {
        $aturan = AturanPeriode::where('periode', (string)$year)->first();
        return $aturan ? (float)$aturan->batas_honor : 0;
    }

    public function getRekapBulanan(Request $request)
    {
        $year = $request->query('year', date('Y'));
        $limitBulanan = $this->getBatasHonorBulanan($year);

        $data = DB::table('kelompok_perencanaan as kp')
            ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
            ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
            ->leftJoin('honorarium as h', function ($join) {
                $join->on('h.id_subkegiatan', '=', 's.id')
                    ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
            })
            ->whereYear('s.tanggal_mulai', $year)
            ->select([
                DB::raw('MONTH(s.tanggal_mulai) as bulan'),
                'kp.id_mitra',
                'kp.volume_tugas',
                DB::raw('IFNULL(h.tarif, 0) as tarif')
            ])
            ->get();

        $monthlyStats = $data->groupBy('bulan')->map(function ($rows, $bulan) use ($limitBulanan) {
            $mitraStats = $rows->groupBy('id_mitra')->map(function ($mitraRows) {
                return $mitraRows->sum(function ($item) {
                    return $item->volume_tugas * $item->tarif;
                });
            });

            $totalHonorSemuaMitra = $mitraStats->sum();
            $isOverLimit = $mitraStats->contains(function ($totalHonorMitra) use ($limitBulanan) {
                return $totalHonorMitra > $limitBulanan;
            });

            return [
                'bulan_angka' => $bulan,
                'bulan_nama'  => Carbon::create()->month($bulan)->locale('id')->monthName,
                'total_honor' => $totalHonorSemuaMitra,
                'status'      => $isOverLimit ? 'Lebih' : 'Aman', 
                'mitra_count' => $mitraStats->count()
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'applied_limit' => $limitBulanan,
            'data' => $monthlyStats
        ]);
    }

    public function getRekapMitra(Request $request)
    {
        $year = $request->query('year');
        $month = $request->query('month');

        if (!$year || !$month) return response()->json(['data' => []]);

        $limitBulanan = $this->getBatasHonorBulanan($year);

        $data = DB::table('kelompok_perencanaan as kp')
            ->join('mitra as m', 'kp.id_mitra', '=', 'm.id')
            ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
            ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
            ->leftJoin('honorarium as h', function ($join) {
                $join->on('h.id_subkegiatan', '=', 's.id')
                    ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
            })
            ->whereYear('s.tanggal_mulai', $year)
            ->whereMonth('s.tanggal_mulai', $month)
            ->select([
                'm.id as id_mitra',
                'm.nama_lengkap',
                'm.nik',
                'kp.volume_tugas',
                DB::raw('IFNULL(h.tarif, 0) as tarif')
            ])
            ->get();

        $mitraSummary = $data->groupBy('id_mitra')->map(function ($rows) use ($limitBulanan) {
            $first = $rows->first();
            $totalHonor = $rows->sum(fn($row) => $row->volume_tugas * $row->tarif);

            return [
                'id_mitra'     => $first->id_mitra,
                'nama_lengkap' => $first->nama_lengkap,
                'nik'          => $first->nik,
                'total_honor'  => $totalHonor,
                'status'       => $totalHonor > $limitBulanan ? 'Lebih' : 'Aman'
            ];
        })->values();

        return response()->json(['status' => 'success', 'data' => $mitraSummary]);
    }

    public function getRekapDetail(Request $request)
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $mitraId = $request->query('mitra_id');

        $details = DB::table('kelompok_perencanaan as kp')
            ->join('perencanaan as p', 'kp.id_perencanaan', '=', 'p.id')
            ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
            ->join('kegiatan as k', 's.id_kegiatan', '=', 'k.id')
            ->leftJoin('honorarium as h', function ($join) {
                $join->on('h.id_subkegiatan', '=', 's.id')
                    ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
            })
            ->leftJoin('jabatan_mitra as j', 'kp.kode_jabatan', '=', 'j.kode_jabatan')
            ->where('kp.id_mitra', $mitraId)
            ->whereYear('s.tanggal_mulai', $year)
            ->whereMonth('s.tanggal_mulai', $month)
            ->select([
                'kp.id as id_kelompok',
                'kp.kode_jabatan', 
                'k.nama_kegiatan',
                's.nama_sub_kegiatan',
                'j.nama_jabatan',
                'kp.volume_tugas',
                DB::raw('IFNULL(h.tarif, 0) as tarif'),
                DB::raw('(kp.volume_tugas * IFNULL(h.tarif, 0)) as total_item')
            ])
            ->get();

        return response()->json(['status' => 'success', 'data' => $details]);
    }

    private function formatSingle($id)
    {
        $item = Perencanaan::with(['subkegiatan.kegiatan', 'pengawas'])->find($id);
        if (!$item) return null;

        return $this->formatItem($item);
    }

    private function formatItem($item)
    {
        $totalAlokasi = KelompokPerencanaan::where('id_perencanaan', $item->id)->sum('volume_tugas');

        $targetVolume = 0;
        if ($item->id_subkegiatan) {
            $targetVolume = Honorarium::where('id_subkegiatan', $item->id_subkegiatan)->sum('basis_volume');
        }

        return [
            'id_perencanaan'         => $item->id,
            'perencanaan_created_at' => $item->created_at,
            'id_subkegiatan'         => $item->subkegiatan ? $item->subkegiatan->id : null,
            'nama_sub_kegiatan'      => $item->subkegiatan ? $item->subkegiatan->nama_sub_kegiatan : '-',
            'total_alokasi'          => (int) $totalAlokasi,
            'target_volume'          => (int) $targetVolume,
            'tanggal_mulai'          => $item->subkegiatan && $item->subkegiatan->tanggal_mulai
                ? Carbon::parse($item->subkegiatan->tanggal_mulai)->format('Y-m-d')
                : null,
            'tanggal_selesai'        => $item->subkegiatan && $item->subkegiatan->tanggal_selesai
                ? Carbon::parse($item->subkegiatan->tanggal_selesai)->format('Y-m-d')
                : null,
            'id_kegiatan'            => $item->subkegiatan && $item->subkegiatan->kegiatan ? $item->subkegiatan->kegiatan->id : null,
            'nama_kegiatan'          => $item->subkegiatan && $item->subkegiatan->kegiatan ? $item->subkegiatan->kegiatan->nama_kegiatan : '-',
            'id_pengawas'            => $item->pengawas ? $item->pengawas->id : null,
            'nama_pengawas'          => $item->pengawas ? $item->pengawas->username : '-',
            'email_pengawas'         => $item->pengawas ? $item->pengawas->email : null,
            'role_pengawas'          => $item->pengawas ? $item->pengawas->role : null,
        ];
    }
}