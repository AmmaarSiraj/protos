<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SatuanKegiatan extends Model
{
    use HasFactory;

    protected $table = 'satuan_kegiatan';

    protected $fillable = [
        'nama_satuan',
        'alias',
    ];
}