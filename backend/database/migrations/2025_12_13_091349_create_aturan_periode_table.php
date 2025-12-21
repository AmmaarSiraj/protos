<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aturan_periode', function (Blueprint $table) {
            $table->id();
            
            // Periode (misal: "2025", "2025-01"). 
            // Kita buat unique agar tidak ada 2 aturan untuk tahun yang sama.
            $table->string('periode', 7)->unique(); 
            
            // Batas honor (Decimal 15,2 sesuai file sql)
            $table->decimal('batas_honor', 15, 2)->default(0);

            // Timestamps (created_at, updated_at)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aturan_periode');
    }
};