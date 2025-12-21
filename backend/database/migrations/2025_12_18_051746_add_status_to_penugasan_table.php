<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('penugasan', function (Blueprint $table) {
            // Menambahkan kolom string dengan default 'menunggu'
            // Posisi diletakkan setelah id_pengawas (opsional, agar rapi)
            $table->string('status_penugasan')->default('menunggu')->after('id_pengawas');
            
            // OPSI LAIN: Jika ingin menggunakan ENUM agar datanya ketat (hanya bisa 'menunggu' atau 'disetujui')
            // $table->enum('status_penugasan', ['menunggu', 'disetujui'])->default('menunggu')->after('id_pengawas');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penugasan', function (Blueprint $table) {
            $table->dropColumn('status_penugasan');
        });
    }
};