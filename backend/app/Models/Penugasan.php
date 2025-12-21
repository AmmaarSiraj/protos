<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Penugasan extends Model
{
    use HasFactory;

    protected $table = 'penugasan';
    protected $primaryKey = 'id';

    protected $fillable = [
        'id_subkegiatan',
        'id_pengawas',
        'status_penugasan',
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

    // Relasi ke Anggota Tim (Kelompok Penugasan)
    public function kelompok()
    {
        return $this->hasMany(KelompokPenugasan::class, 'id_penugasan', 'id');
    }
}