<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('satuan_kegiatan', function (Blueprint $table) {
            $table->id(); // int(11) AUTO_INCREMENT
            $table->string('nama_satuan', 50); // Contoh: Orang Bulan, Dokumen
            $table->string('alias', 20)->nullable(); // Contoh: OB, Dok
            
            // Timestamps (created_at, updated_at)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('satuan_kegiatan');
    }
};