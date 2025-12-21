<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kegiatan extends Model
{
    use HasFactory;

    protected $table = 'kegiatan';

    // Jika di tabel SQL tidak ada updated_at, Anda bisa matikan timestamps.
    // Tapi saya sarankan biarkan true agar fitur Laravel tetap jalan (kita sudah buat nullable di migrasi).
    public $timestamps = true; 

    protected $fillable = [
        'nama_kegiatan',
        'deskripsi',
    ];

    public function subkegiatan()
    {
        return $this->hasMany(Subkegiatan::class, 'id_kegiatan', 'id');
    }
}