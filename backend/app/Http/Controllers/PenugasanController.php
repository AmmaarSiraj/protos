<?php

namespace App\Http\Controllers;

use App\Models\Penugasan;
use App\Models\Perencanaan;
use App\Models\KelompokPenugasan;
use App\Models\Mitra;
use App\Models\Subkegiatan;
use App\Models\TahunAktif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel; 

class PenugasanController extends Controller
{
    /**
     * 1. GET ALL PENUGASAN
     */
    public function index()
    {
        $penugasan = Penugasan::with(['subkegiatan.kegiatan', 'pengawas'])
            ->latest()
            ->get();

        $formattedData = $penugasan->map(function ($item) {
            return $this->formatItem($item);
        });

        return response()->json(['status' => 'success', 'data' => $formattedData]);
    }

    /**
     * 2. CREATE PENUGASAN MANUAL
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_subkegiatan' => 'required|exists:subkegiatan,id',
            'id_pengawas'    => 'required|exists:user,id',
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
            // Buat Header Penugasan
            $penugasan = Penugasan::create([
                'id_subkegiatan' => $request->id_subkegiatan,
                'id_pengawas'    => $request->id_pengawas,
                'status_penugasan' => 'menunggu'
            ]);

            // Masukkan Anggota Tim
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
     * 3. PREVIEW IMPORT (FIXED COLUMN NAME & ENCODING)
     */
    public function previewImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
            'id_subkegiatan' => 'required|exists:subkegiatan,id'
        ]);

        $idSubkegiatan = $request->id_subkegiatan;
        $subkegiatan = Subkegiatan::findOrFail($idSubkegiatan);
        $tahunKegiatan = date('Y', strtotime($subkegiatan->tanggal_mulai));

        // A. Ambil Referensi Jabatan & Honor di Subkegiatan ini
        $allowedJabatan = DB::table('honorarium as h')
            ->join('jabatan_mitra as j', 'h.kode_jabatan', '=', 'j.kode_jabatan')
            ->where('h.id_subkegiatan', $idSubkegiatan)
            ->select('j.nama_jabatan', 'j.kode_jabatan', 'h.tarif')
            ->get()
            ->mapWithKeys(function ($item) {
                return [Str::lower(trim($item->nama_jabatan)) => [
                    'kode' => $item->kode_jabatan,
                    'tarif' => $item->tarif,
                    'nama_resmi' => $item->nama_jabatan
                ]];
            });

        // B. Cek Data Existing (untuk validasi duplikat)
        $existingPenugasan = Penugasan::where('id_subkegiatan', $idSubkegiatan)->first();
        $existingMitraIds = [];
        if ($existingPenugasan) {
            $existingMitraIds = KelompokPenugasan::where('id_penugasan', $existingPenugasan->id)
                ->pluck('id_mitra')
                ->toArray();
        }

        // C. BACA FILE
        try {
            $data = Excel::toArray([], $request->file('file'));
            $rows = $data[0] ?? [];
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membaca file: ' . $e->getMessage()], 400);
        }

        if (empty($rows)) {
            return response()->json(['message' => 'File kosong.'], 400);
        }

        // Hapus Header
        $headerRow = array_shift($rows); 
        
        $validData = [];
        $warnings = [];

        foreach ($rows as $index => $row) {
            if (count($row) < 3 || (empty($row[0]) && empty($row[1]))) continue;

            $sobatId = trim((string)$row[0]); 
            $namaLengkap = trim((string)$row[1]);
            $posisiText = Str::lower(trim((string)$row[2]));

            // 1. Cari Mitra
            $mitra = Mitra::where('sobat_id', $sobatId)->first();
            
            if (!$mitra) {
                $warnings[] = "Baris " . ($index + 2) . ": Mitra ID '$sobatId' ($namaLengkap) tidak ditemukan.";
                continue;
            }

            // 2. Validasi Aktif (FIXED: column 'status' bukan 'status_aktif')
            $isAktif = TahunAktif::where('user_id', $mitra->id)
                ->where('tahun', $tahunKegiatan)
                ->where('status', 'aktif') // <--- PERBAIKAN DI SINI
                ->exists();

            if (!$isAktif) {
                $warnings[] = "Baris " . ($index + 2) . ": Mitra '$namaLengkap' TIDAK AKTIF di tahun $tahunKegiatan.";
                continue;
            }

            // 3. Validasi Jabatan
            $matchedJabatan = null;
            if (isset($allowedJabatan[$posisiText])) {
                $matchedJabatan = $allowedJabatan[$posisiText];
            } else {
                foreach ($allowedJabatan as $key => $val) {
                    if (str_contains($posisiText, $key) || str_contains($key, $posisiText)) {
                         $matchedJabatan = $val;
                         break;
                    }
                }
                
                if (!$matchedJabatan) {
                    $warnings[] = "Baris " . ($index + 2) . ": Posisi '$row[2]' tidak terdaftar di honorarium.";
                    continue;
                }
            }

            // 4. Validasi Duplikasi
            if (in_array($mitra->id, $existingMitraIds)) {
                $warnings[] = "Baris " . ($index + 2) . ": Mitra '$namaLengkap' sudah ada di tim ini.";
                continue;
            }

            $validData[] = [
                'id_mitra' => $mitra->id,
                'sobat_id' => $mitra->sobat_id,
                'nama_lengkap' => $mitra->nama_lengkap,
                'kode_jabatan' => $matchedJabatan['kode'],
                'nama_jabatan' => $matchedJabatan['nama_resmi'],
                'volume_tugas' => 1,
                'harga_satuan' => $matchedJabatan['tarif']
            ];
        }

        return response()->json([
            'status' => 'success',
            'subkegiatan' => $subkegiatan,
            'valid_data' => $validData,
            'warnings' => $warnings,
            'total_processed' => count($rows),
            'total_valid' => count($validData)
        ]);
    }

    /**
     * 4. IMPORT DARI PERENCANAAN
     */
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

    /**
     * 5. GET DETAIL PENUGASAN
     */
    public function show($id)
    {
        $data = $this->formatSingle($id);
        if (!$data) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /**
     * 6. UPDATE PENUGASAN
     */
    public function update(Request $request, $id)
    {
        $penugasan = Penugasan::find($id);
        if (!$penugasan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status_penugasan' => 'nullable|in:menunggu,disetujui',
            'id_subkegiatan'   => 'nullable|exists:subkegiatan,id',
            'id_pengawas'      => 'nullable|exists:user,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $penugasan->update($request->only(['status_penugasan', 'id_subkegiatan', 'id_pengawas']));

            return response()->json([
                'status' => 'success',
                'message' => 'Penugasan berhasil diperbarui.',
                'data' => $this->formatItem($penugasan)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal update: ' . $e->getMessage()], 500);
        }
    }

    /**
     * 7. GET ANGGOTA
     */
    public function getAnggota($id)
    {
        try {
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

    /**
     * 8. GET FOR CETAK SPK (FILTERED)
     */
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
                
                // FILTERING
                ->where('kp.id_mitra', $id_mitra)
                ->whereYear('s.tanggal_mulai', $year)
                ->whereMonth('s.tanggal_mulai', $month)
                ->where('p.status_penugasan', 'disetujui') 

                ->select([
                    'k.nama_kegiatan', // <--- DITAMBAHKAN: Nama Survei/Sensus (Induk)
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

    /**
     * 9. DELETE PENUGASAN
     */
    public function destroy($id)
    {
        $penugasan = Penugasan::find($id);
        if (!$penugasan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $penugasan->delete();
        return response()->json(['status' => 'success', 'message' => 'Penugasan berhasil dihapus.']);
    }

    // HELPER FUNCTIONS
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