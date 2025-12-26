<?php

namespace App\Http\Controllers;

use App\Models\Penugasan;
use App\Models\Perencanaan;
use App\Models\KelompokPenugasan;
use App\Models\Mitra;
use App\Models\Subkegiatan;
use App\Models\Kegiatan;
use App\Models\JabatanMitra;
use App\Models\Honorarium;
use App\Models\AturanPeriode;
use App\Models\TahunAktif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log; 

class PenugasanController extends Controller
{
    public function index()
    {
        $penugasan = Penugasan::with(['subkegiatan.kegiatan', 'pengawas'])
            ->latest('updated_at')
            ->get();

        $formattedData = $penugasan->map(function ($item) {
            return $this->formatItem($item);
        });

        return response()->json(['status' => 'success', 'data' => $formattedData]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_subkegiatan' => 'required|exists:subkegiatan,id',
            'id_pengawas'    => 'required|exists:user,id', // Tabel 'user' tunggal
            'anggota'        => 'nullable|array',
            'anggota.*.id_mitra'     => 'required|exists:mitra,id',
            'anggota.*.kode_jabatan' => 'required|exists:jabatan_mitra,kode_jabatan',
            'anggota.*.volume_tugas' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $penugasan = Penugasan::create([
                'id_subkegiatan' => $request->id_subkegiatan,
                'id_pengawas'    => $request->id_pengawas,
                'status_penugasan' => 'menunggu'
            ]);

            if ($request->has('anggota') && is_array($request->anggota)) {
                foreach ($request->anggota as $anggota) {
                    $vol = isset($anggota['volume_tugas']) ? intval($anggota['volume_tugas']) : 0;
                    KelompokPenugasan::create([
                        'id_penugasan' => $penugasan->id,
                        'id_mitra'     => $anggota['id_mitra'],
                        'kode_jabatan' => $anggota['kode_jabatan'] ?? null,
                        'volume_tugas' => $vol
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Penugasan berhasil dibuat beserta anggota tim.',
                'data' => $this->formatSingle($penugasan->id)
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal membuat penugasan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * 3. PREVIEW IMPORT (PERBAIKAN LIMIT SESUAI TAHUN KEGIATAN)
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
        
        // Hapus logika pengambilan limit global di sini (sebelumnya salah ambil tahun sekarang)

        foreach ($rows as $index => $row) {
            if (empty($row[0]) && empty($row[2])) continue;

            $namaKegiatan = trim((string)$row[0]);
            $namaSub      = trim((string)$row[1]);
            $sobatId      = trim((string)$row[2]);
            $namaJabatan  = trim((string)$row[3]);
            $volume       = isset($row[4]) ? (int)$row[4] : 1; 
            $rowNum       = $index + 2;

            $kegiatan = $allKegiatan[Str::lower($namaKegiatan)] ?? null;
            if (!$kegiatan) {
                $warnings[] = "Baris $rowNum: Kegiatan '$namaKegiatan' tidak ditemukan.";
                continue;
            }

            $subkegiatan = Subkegiatan::where('id_kegiatan', $kegiatan->id)
                ->where(DB::raw('LOWER(nama_sub_kegiatan)'), Str::lower($namaSub))
                ->first();

            if (!$subkegiatan) {
                $warnings[] = "Baris $rowNum: Sub Kegiatan '$namaSub' tidak ditemukan.";
                continue;
            }

            $mitra = Mitra::where('sobat_id', $sobatId)->first();
            if (!$mitra) {
                $warnings[] = "Baris $rowNum: Mitra ID '$sobatId' tidak ditemukan.";
                continue;
            }

            // --- PERBAIKAN PENGAMBILAN TAHUN & LIMIT ---
            $tahunKegiatan = date('Y', strtotime($subkegiatan->tanggal_mulai));
            
            // Ambil Aturan Periode SESUAI TAHUN KEGIATAN ini
            $aturan = AturanPeriode::where('periode', $tahunKegiatan)->first();
            $batasHonor = $aturan ? (float)$aturan->batas_honor : 0; 
            // ------------------------------------------

            $isAktif = TahunAktif::where('user_id', $mitra->id)
                ->where('tahun', $tahunKegiatan)
                ->where('status', 'aktif')
                ->exists();

            if (!$isAktif) {
                $warnings[] = "Baris $rowNum: Mitra tidak aktif pada tahun $tahunKegiatan.";
                continue;
            }

            $kodeJabatan = null;
            $namaJabatanResmi = null;
            $jabatanMatch = $allJabatan->first(fn($j) => Str::lower($j->nama_jabatan) === Str::lower($namaJabatan)) 
                         ?? $allJabatan->first(fn($j) => str_contains(Str::lower($namaJabatan), Str::lower($j->nama_jabatan)));

            if ($jabatanMatch) {
                $kodeJabatan = $jabatanMatch->kode_jabatan;
                $namaJabatanResmi = $jabatanMatch->nama_jabatan;
            } else {
                $warnings[] = "Baris $rowNum: Jabatan '$namaJabatan' tidak dikenali.";
                continue;
            }

            $honorarium = Honorarium::where('id_subkegiatan', $subkegiatan->id)
                ->where('kode_jabatan', $kodeJabatan)
                ->first();
            
            $tarif = $honorarium ? $honorarium->tarif : 0;
            $targetVol = $honorarium ? $honorarium->basis_volume : 0; 

            $existingVol = DB::table('kelompok_penugasan as kp')
                ->join('penugasan as p', 'kp.id_penugasan', '=', 'p.id')
                ->where('p.id_subkegiatan', $subkegiatan->id)
                ->sum('kp.volume_tugas');

            $bulanKegiatan = date('m', strtotime($subkegiatan->tanggal_mulai));
            $existingIncome = DB::table('kelompok_penugasan as kp')
                ->join('penugasan as p', 'kp.id_penugasan', '=', 'p.id')
                ->join('subkegiatan as s', 'p.id_subkegiatan', '=', 's.id')
                ->leftJoin('honorarium as h', function ($join) {
                    $join->on('h.id_subkegiatan', '=', 's.id')
                         ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
                })
                ->where('kp.id_mitra', $mitra->id)
                ->whereYear('s.tanggal_mulai', $tahunKegiatan)
                ->whereMonth('s.tanggal_mulai', $bulanKegiatan)
                ->where('p.status_penugasan', 'disetujui') 
                ->sum(DB::raw('kp.volume_tugas * IFNULL(h.tarif, 0)'));

            $newIncome = $volume * $tarif;
            $totalVol = $existingVol + $volume;
            $totalIncome = $existingIncome + $newIncome;

            $isOverVolume = ($targetVol > 0 && $totalVol > $targetVol);
            $isOverLimit  = ($batasHonor > 0 && $totalIncome > $batasHonor);

            $validData[] = [
                'id_subkegiatan'    => $subkegiatan->id,
                'nama_kegiatan'     => $kegiatan->nama_kegiatan,
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
                    'limit_honor'     => $batasHonor, // Limit ini sekarang dinamis sesuai tahun kegiatan
                    'existing_income' => $existingIncome,
                    'new_income'      => $newIncome,
                    'is_over_volume'  => $isOverVolume,
                    'is_over_limit'   => $isOverLimit
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
        Log::info("=== START IMPORT PENUGASAN ===");
        
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
                // Gunakan ID user login, atau fallback ID 1 jika ID 1 ada di DB
                $userId = $request->user() ? $request->user()->id : 1; 
                
                // Pastikan user ada di DB untuk menghindari FK error
                if (!DB::table('user')->where('id', $userId)->exists()) {
                    $firstUser = DB::table('user')->first();
                    $userId = $firstUser ? $firstUser->id : $userId; 
                }

                $penugasan = Penugasan::firstOrCreate(
                    ['id_subkegiatan' => $subId],
                    [
                        'id_pengawas' => $userId,
                        'status_penugasan' => 'menunggu'
                    ]
                );

                $penugasan->touch(); 

                foreach ($items as $item) {
                    KelompokPenugasan::updateOrCreate(
                        [
                            'id_penugasan' => $penugasan->id,
                            'id_mitra'     => $item['id_mitra']
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
            Log::info("=== IMPORT SUKSES: $count Data Tersimpan ===");
            return response()->json(['status' => 'success', 'message' => "$count data berhasil diimport ke penugasan."]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("!!! IMPORT ERROR !!! " . $e->getMessage());
            return response()->json(['message' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
        }
    }

    public function importFromPerencanaan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids_perencanaan' => 'required|array',
            'ids_perencanaan.*' => 'exists:perencanaan,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $countHeader = 0;
            $countMembers = 0;

            foreach ($request->ids_perencanaan as $idPerencanaan) {
                $perencanaan = Perencanaan::with('kelompok')->find($idPerencanaan);
                if (!$perencanaan) continue;

                $penugasan = Penugasan::updateOrCreate(
                    ['id_subkegiatan' => $perencanaan->id_subkegiatan],
                    ['id_pengawas' => $perencanaan->id_pengawas, 'updated_at'  => now()]
                );
                
                $penugasan->touch();
                $countHeader++;

                foreach ($perencanaan->kelompok as $anggotaPlan) {
                    KelompokPenugasan::updateOrCreate(
                        [
                            'id_penugasan' => $penugasan->id,
                            'id_mitra'     => $anggotaPlan->id_mitra,
                        ],
                        [
                            'kode_jabatan' => $anggotaPlan->kode_jabatan,
                            'volume_tugas' => $anggotaPlan->volume_tugas,
                            'created_at'   => now()
                        ]
                    );
                    $countMembers++;
                }
            }
            DB::commit();
            return response()->json([
                'status' => 'success',
                'message' => "Berhasil meneruskan data.\n{$countHeader} Kegiatan diproses.\n{$countMembers} Anggota berhasil disinkronisasi."
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal meneruskan data: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $penugasan = Penugasan::find($id);
        if (!$penugasan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $penugasan->delete();
        return response()->json(['status' => 'success', 'message' => 'Penugasan berhasil dihapus.']);
    }

    public function show($id)
    {
        $data = $this->formatSingle($id);
        if (!$data) return response()->json(['message' => 'Data tidak ditemukan'], 404);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function update(Request $request, $id)
    {
        $penugasan = Penugasan::find($id);
        if (!$penugasan) return response()->json(['message' => 'Data tidak ditemukan'], 404);

        $penugasan->update($request->only(['status_penugasan', 'id_subkegiatan', 'id_pengawas']));
        return response()->json(['status' => 'success', 'data' => $this->formatItem($penugasan)]);
    }

    public function getAnggota($id)
    {
        $anggota = DB::table('kelompok_penugasan as kp')
            ->join('mitra as m', 'kp.id_mitra', '=', 'm.id')
            ->join('penugasan as p', 'kp.id_penugasan', '=', 'p.id')
            ->leftJoin('jabatan_mitra as jm', 'kp.kode_jabatan', '=', 'jm.kode_jabatan')
            ->leftJoin('honorarium as h', function ($join) {
                $join->on('h.id_subkegiatan', '=', 'p.id_subkegiatan')
                     ->on('h.kode_jabatan', '=', 'kp.kode_jabatan');
            })
            ->where('kp.id_penugasan', $id)
            ->select([
                'm.id as id_mitra', 'm.nama_lengkap', 'm.nik', 'm.nomor_hp',
                'kp.id as id_kelompok', 'kp.created_at as bergabung_sejak',
                'kp.kode_jabatan', 'kp.volume_tugas',
                DB::raw("IFNULL(jm.nama_jabatan, 'Belum ditentukan') as nama_jabatan"),
                DB::raw("IFNULL(h.tarif, 0) as harga_satuan"),
                DB::raw("(IFNULL(h.tarif, 0) * kp.volume_tugas) as total_honor")
            ])
            ->orderBy('m.nama_lengkap', 'asc')
            ->get();

        return response()->json($anggota);
    }

    public function getByMitraAndPeriode($id_mitra, $periode)
    {
        try {
            $parts = explode('-', $periode);
            if (count($parts) !== 2) {
                return response()->json(['message' => 'Format periode salah'], 400);
            }
            $year = $parts[0];
            $month = $parts[1];

            $tasks = DB::table('kelompok_penugasan as kp')
                ->join('penugasan as p', 'kp.id_penugasan', '=', 'p.id')
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
                ->where('p.status_penugasan', 'disetujui') 
                ->select([
                    'k.nama_kegiatan', 
                    's.nama_sub_kegiatan',
                    's.tanggal_mulai',
                    's.tanggal_selesai',
                    'kp.volume_tugas as target_volume',
                    'sat.nama_satuan',
                    'jm.nama_jabatan',
                    'p.status_penugasan',
                    DB::raw("IFNULL(h.tarif, 0) as harga_satuan"),
                    DB::raw("(kp.volume_tugas * IFNULL(h.tarif, 0)) as total_honor"),
                    DB::raw("COALESCE(h.beban_anggaran) as beban_anggaran")
                ])
                ->orderBy('s.tanggal_mulai', 'asc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $tasks
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Terjadi kesalahan: ' . $e->getMessage()], 500);
        }
    }

    private function formatSingle($id)
    {
        $item = Penugasan::with(['subkegiatan.kegiatan', 'pengawas'])->find($id);
        if (!$item) return null;
        return $this->formatItem($item);
    }

    private function formatItem($item)
    {
        return [
            'id_penugasan'         => $item->id,
            'status_penugasan'     => $item->status_penugasan ?? 'menunggu', 
            'penugasan_created_at' => $item->created_at,
            'updated_at'           => $item->updated_at,
            'id_subkegiatan'       => $item->subkegiatan ? $item->subkegiatan->id : null,
            'nama_sub_kegiatan'    => $item->subkegiatan ? $item->subkegiatan->nama_sub_kegiatan : '-',
            'tanggal_mulai'        => $item->subkegiatan && $item->subkegiatan->tanggal_mulai
                ? Carbon::parse($item->subkegiatan->tanggal_mulai)->format('Y-m-d')
                : null,
            'tanggal_selesai'      => $item->subkegiatan && $item->subkegiatan->tanggal_selesai
                ? Carbon::parse($item->subkegiatan->tanggal_selesai)->format('Y-m-d')
                : null,
            'id_kegiatan'          => $item->subkegiatan && $item->subkegiatan->kegiatan ? $item->subkegiatan->kegiatan->id : null,
            'nama_kegiatan'        => $item->subkegiatan && $item->subkegiatan->kegiatan ? $item->subkegiatan->kegiatan->nama_kegiatan : '-',
            'id_pengawas'          => $item->pengawas ? $item->pengawas->id : null,
            'nama_pengawas'        => $item->pengawas ? $item->pengawas->username : '-',
            'email_pengawas'       => $item->pengawas ? $item->pengawas->email : null,
            'role_pengawas'        => $item->pengawas ? $item->pengawas->role : null,
        ];
    }
}