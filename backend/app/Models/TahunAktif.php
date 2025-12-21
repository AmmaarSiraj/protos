<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TahunAktif extends Model
{
    use HasFactory;

    protected $table = 'tahun_aktif';

    protected $fillable = [
        'user_id',
        'tahun',
        'status',
    ];

    // Relasi ke User

    public function mitra()
    {
        return $this->belongsTo(Mitra::class, 'user_id');
    }
}
