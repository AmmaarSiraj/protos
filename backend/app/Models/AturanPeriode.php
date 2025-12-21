<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AturanPeriode extends Model
{
    use HasFactory;

    protected $table = 'aturan_periode';

    protected $fillable = [
        'periode',
        'batas_honor',
    ];

    // Casting agar saat diambil jadi angka/float, bukan string
    protected $casts = [
        'batas_honor' => 'decimal:2',
    ];
}