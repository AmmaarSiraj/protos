<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JabatanMitra extends Model
{
    use HasFactory;

    protected $table = 'jabatan_mitra';
    
    // PENTING: Karena primary key bukan 'id' auto increment
    protected $primaryKey = 'kode_jabatan';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'kode_jabatan',
        'nama_jabatan'
    ];
}