<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mitra extends Model
{
    use HasFactory;

    protected $table = 'mitra';

    protected $fillable = [
        'nama_lengkap',
        'nik',
        'sobat_id',
        'alamat',
        'jenis_kelamin',
        'pendidikan',
        'pekerjaan',
        'deskripsi_pekerjaan_lain',
        'nomor_hp',
        'email',
    ];

    // Relasi ke Kelompok Penugasan (Satu mitra bisa masuk banyak kelompok tugas)
    public function kelompokPenugasan()
    {
        return $this->hasMany(KelompokPenugasan::class, 'id_mitra', 'id');
    }

    public function tahunAktif()
    {
        return $this->hasMany(TahunAktif::class, 'user_id', 'id');
    }
}
