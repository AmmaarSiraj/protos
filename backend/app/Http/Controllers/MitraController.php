<?php

namespace App\Http\Controllers;

use App\Models\Mitra;
use App\Models\TahunAktif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class MitraController extends Controller
{
    /**
     * 1. GET ALL MITRA (OPTIMIZED)
     * Mengambil semua data mitra dan menyertakan riwayat tahun aktifnya.
     */
    public function index(Request $request)
    {
        $query = Mitra::query();

        // Fitur Pencarian Global
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_lengkap', 'like', "%{$search}%")
                  ->orWhere('nik', 'like', "%{$search}%")
                  ->orWhere('sobat_id', 'like', "%{$search}%");
            });
        }

        $mitra = $query->orderBy('nama_lengkap', 'asc')->get();

        // Transform data untuk menyertakan riwayat tahun aktif sebagai string
        $mitra->transform(function ($item) {
            $years = TahunAktif::where('user_id', $item->id)
                        ->orderBy('tahun', 'desc')
                        ->pluck('tahun')
                        ->toArray();
            
            // Menggunakan setAttribute agar properti ini ikut terekspos dalam JSON
            $item->setAttribute('riwayat_tahun', implode(', ', $years));
            return $item;
        });

        return response()->json([
            'status' => 'success',
            'data' => $mitra
        ]);
    }
    
    /**
     * Endpoint khusus untuk kebutuhan tabel dengan pagination (Server-side processing)
     */
    public function optimize(Request $request)
    {
        $selectedYear = $request->query('year', date('Y'));
        $search = $request->search;

        $query = Mitra::query();

        // Filter hanya yang aktif di tahun terpilih
        $query->whereHas('tahunAktif', function($q) use ($selectedYear) {
            $q->where('tahun', $selectedYear);
        });

        if ($request->has('search') && $request->search != '') {
            $query->where(function ($q) use ($search) {
                $q->where('nama_lengkap', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('sobat_id', 'like', "%{$search}%");
            });
        }

        // Hitung total aktif untuk meta data
        $totalActiveInYear = Mitra::whereHas('tahunAktif', function($q) use ($selectedYear) {
            $q->where('tahun', $selectedYear);
        })->count();

        $mitra = $query->with(['tahunAktif' => function ($q) {
            $q->orderBy('tahun', 'desc');
        }])
        ->orderBy('nama_lengkap', 'asc')
        ->paginate(20);

        $mitra->getCollection()->transform(function ($item) {
            $item->setAttribute('riwayat_tahun', $item->tahunAktif->pluck('tahun')->implode(', '));
            unset($item->tahunAktif); // Bersihkan relasi agar response lebih ringan
            return $item;
        });

        return response()->json([
            'success' => true,
            'message' => 'Data mitra berhasil diambil',
            'data' => $mitra,
            'extra_meta' => [
                'selected_year' => $selectedYear,
                'total_active_count' => $totalActiveInYear
            ]
        ], 200);
    }

    /**
     * Mengambil mitra berdasarkan periode penugasan (berguna untuk filter laporan)
     */
    public function getByPeriode($periode)
    {
        try {
            // Periode format: "2025-12"
            $parts = explode('-', $periode);
            if (count($parts) !== 2) {
                return response()->json(['message' => 'Format periode salah'], 400);
            }
            $year = $parts[0];
            $month = $parts[1];

            // Query menggunakan JOIN agar lebih performa dan akurat
            $mitra = Mitra::select('mitra.*')
                ->join('kelompok_penugasan', 'mitra.id', '=', 'kelompok_penugasan.id_mitra')
                ->join('penugasan', 'kelompok_penugasan.id_penugasan', '=', 'penugasan.id')
                ->join('subkegiatan', 'penugasan.id_subkegiatan', '=', 'subkegiatan.id')
                // Filter berdasarkan tanggal mulai kegiatan
                ->whereYear('subkegiatan.tanggal_mulai', $year)
                ->whereMonth('subkegiatan.tanggal_mulai', $month)
                ->distinct() // Mencegah duplikasi jika mitra punya banyak tugas di bulan itu
                ->orderBy('mitra.nama_lengkap', 'asc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $mitra
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
    
    /**
     * 2. TAMBAH MITRA MANUAL
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama_lengkap' => 'required|string|max:255',
            'nik'          => 'required|string|max:50',
            'nomor_hp'     => 'required|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $targetYear = $request->input('tahun_daftar', date('Y'));

        DB::beginTransaction();
        try {
            $mitra = Mitra::updateOrCreate(
                ['nik' => $request->nik],
                [
                    'nama_lengkap' => $request->nama_lengkap,
                    'sobat_id'     => $request->sobat_id,
                    'alamat'       => $request->alamat,
                    'jenis_kelamin' => $request->jenis_kelamin,
                    'pendidikan'   => $request->pendidikan,
                    'pekerjaan'    => $request->pekerjaan,
                    'deskripsi_pekerjaan_lain' => $request->deskripsi_pekerjaan_lain,
                    'nomor_hp'     => $request->nomor_hp,
                    'email'        => $request->email,
                ]
            );

            // Cek apakah sudah aktif di tahun ini
            $isActive = TahunAktif::where('user_id', $mitra->id)
                ->where('tahun', $targetYear)
                ->exists();

            if (!$isActive) {
                TahunAktif::create([
                    'user_id' => $mitra->id,
                    'tahun'   => $targetYear,
                    'status'  => 'aktif'
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Mitra berhasil disimpan dan diaktifkan.',
                'data' => $mitra
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * 3. DETAIL MITRA
     */
    public function show($id)
    {
        $mitra = Mitra::find($id);

        if (!$mitra) {
            return response()->json(['message' => 'Mitra tidak ditemukan'], 404);
        }

        // Untuk detail satu item, query tambahan tidak masalah (tidak berat)
        $mitra->list_tahun_aktif = TahunAktif::where('user_id', $id)
            ->orderBy('tahun', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $mitra]);
    }

    /**
     * 4. UPDATE PROFIL
     */
    public function update(Request $request, $id)
    {
        $mitra = Mitra::find($id);
        if (!$mitra) return response()->json(['message' => 'Mitra tidak ditemukan'], 404);

        $validator = Validator::make($request->all(), [
            'nama_lengkap' => 'required|string|max:255',
            'nik'          => 'required|string|max:50|unique:mitra,nik,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $mitra->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Data profil diperbarui',
            'data' => $mitra
        ]);
    }

    /**
     * 5. DELETE
     */
    public function destroy(Request $request, $id)
    {
        $mitra = Mitra::find($id);
        if (!$mitra) return response()->json(['message' => 'Mitra tidak ditemukan'], 404);

        $tahunTarget = $request->query('tahun');

        DB::beginTransaction();
        try {
            // Hitung total tahun aktif
            $count = TahunAktif::where('user_id', $id)->count();

            // Jika masih aktif di banyak tahun dan user hanya ingin hapus tahun tertentu
            if ($count > 1 && $tahunTarget) {
                TahunAktif::where('user_id', $id)->where('tahun', $tahunTarget)->delete();
                $msg = "Status aktif tahun {$tahunTarget} berhasil dihapus.";
            } else {
                // Hapus permanen jika hanya aktif 1 tahun atau request hapus total
                $mitra->delete();
                $msg = "Data mitra dihapus permanen.";
            }

            DB::commit();
            return response()->json(['status' => 'success', 'message' => $msg]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * 6. IMPORT EXCEL
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|mimes:xlsx,xls,csv',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $currentYear = $request->input('tahun_daftar', date('Y'));

        $successCount = 0;
        $skipCount = 0;
        $failCount = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            // Ambil header dan bersihkan spasi/lowercase
            $header = array_map(function ($h) {
                return trim(strtolower($h));
            }, array_shift($rows));

            // Mapping kolom dinamis
            $colMap = [
                'nama' => $this->findHeaderIndex($header, ['nama lengkap', 'nama']),
                'nik'  => $this->findHeaderIndex($header, ['nik']),
                'sobat' => $this->findHeaderIndex($header, ['sobat id', 'sobat_id']),
                'alamat' => $this->findHeaderIndex($header, ['alamat detail', 'alamat']),
                'hp' => $this->findHeaderIndex($header, ['no telp', 'no hp', 'nomor hp', 'no_hp']),
                'email' => $this->findHeaderIndex($header, ['email']),
                'jk' => $this->findHeaderIndex($header, ['jenis kelamin', 'jk']),
                'pend' => $this->findHeaderIndex($header, ['pendidikan']),
                'job' => $this->findHeaderIndex($header, ['pekerjaan']),
                'desc' => $this->findHeaderIndex($header, ['deskripsi pekerjaan lain']),
            ];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                $nama = $this->getValue($row, $colMap['nama']);
                $rawNik = $this->getValue($row, $colMap['nik']);
                $nik = $rawNik ? trim(str_replace("'", "", (string)$rawNik)) : '';

                // Skip baris kosong / tidak valid
                if (empty($nama) || empty($nik)) {
                    if (empty(implode('', $row))) continue; // Skip baris benar-benar kosong
                    $failCount++;
                    $errors[] = "Baris {$rowNumber}: Nama atau NIK kosong.";
                    continue;
                }

                try {
                    // Update atau Buat Mitra Baru
                    $mitra = Mitra::updateOrCreate(
                        ['nik' => $nik],
                        [
                            'nama_lengkap' => $nama,
                            'sobat_id' => $this->getValue($row, $colMap['sobat']),
                            'alamat' => $this->getValue($row, $colMap['alamat']),
                            'nomor_hp' => $this->getValue($row, $colMap['hp']),
                            'email' => $this->getValue($row, $colMap['email']),
                            'jenis_kelamin' => $this->getValue($row, $colMap['jk']),
                            'pendidikan' => $this->getValue($row, $colMap['pend']),
                            'pekerjaan' => $this->getValue($row, $colMap['job']),
                            'deskripsi_pekerjaan_lain' => $this->getValue($row, $colMap['desc']),
                        ]
                    );

                    // Cek Status Aktif Tahun Ini
                    $isActive = TahunAktif::where('user_id', $mitra->id)
                        ->where('tahun', $currentYear)
                        ->exists();

                    if ($isActive) {
                        $skipCount++;
                    } else {
                        TahunAktif::create([
                            'user_id' => $mitra->id,
                            'tahun' => $currentYear,
                            'status' => 'aktif'
                        ]);
                        $successCount++;
                    }
                } catch (\Exception $e) {
                    $failCount++;
                    $errors[] = "Baris {$rowNumber} ({$nama}): " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Import Selesai (Tahun {$currentYear}).",
                'successCount' => $successCount,
                'skipCount' => $skipCount,
                'failCount' => $failCount,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // --- Helpers ---
    private function findHeaderIndex($headers, $keywords)
    {
        foreach ($headers as $index => $header) {
            if (in_array($header, $keywords)) return $index;
        }
        return -1;
    }

    private function getValue($row, $index)
    {
        return ($index >= 0 && isset($row[$index])) ? trim($row[$index]) : null;
    }

    /**
     * MENGAMBIL MITRA AKTIF (KHUSUS DASHBOARD)
     * Mengembalikan mitra yang hanya aktif pada tahun tertentu.
     */
    public function mitraAktif(Request $request)
    {
        $tahun = $request->tahun;

        // MENAMBAHKAN 'sobat_id' ke select agar frontend bisa menampilkannya di tabel
        $mitra = Mitra::select('id', 'nama_lengkap', 'nik', 'sobat_id')
            ->whereHas('tahunAktif', function ($q) use ($tahun) {
                $q->where('tahun', $tahun);
            })
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $mitra
        ]);
    }
}