<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Perencanaan extends Model
{
    use HasFactory;

    protected $table = 'perencanaan';

    protected $fillable = [
        'id_subkegiatan',
        'id_pengawas',
    ];

    // Relasi ke Subkegiatan
    public function subkegiatan()
    {
        return $this->belongsTo(Subkegiatan::class, 'id_subkegiatan', 'id');
    }

    // Relasi ke Pengawas (User)
    public function pengawas()
    {
        return $this->belongsTo(User::class, 'id_pengawas', 'id');
    }

    // Relasi ke Anggota Tim (Kelompok Perencanaan)
    public function kelompok()
    {
        return $this->hasMany(KelompokPerencanaan::class, 'id_perencanaan', 'id');
    }
}