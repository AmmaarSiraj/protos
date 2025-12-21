<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel Perencanaan (Header)
        Schema::create('perencanaan', function (Blueprint $table) {
            $table->id();
            
            // Relasi ke Subkegiatan (ID String)
            $table->string('id_subkegiatan', 50);
            $table->foreign('id_subkegiatan')
                  ->references('id')->on('subkegiatan')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Relasi ke Pengawas (User)
            $table->foreignId('id_pengawas')
                  ->constrained('user')
                  ->onDelete('cascade');

            $table->timestamps();
        });

        // 2. Tabel Kelompok Perencanaan (Detail Anggota)
        Schema::create('kelompok_perencanaan', function (Blueprint $table) {
            $table->id();

            // Relasi ke Tabel Perencanaan
            $table->foreignId('id_perencanaan')
                  ->constrained('perencanaan')
                  ->onDelete('cascade'); 

            // Relasi ke Mitra
            $table->foreignId('id_mitra')
                  ->constrained('mitra')
                  ->onDelete('cascade');

            // Relasi ke Jabatan Mitra (Kode String)
            $table->string('kode_jabatan', 50)->nullable();
            $table->foreign('kode_jabatan')
                  ->references('kode_jabatan')->on('jabatan_mitra')
                  ->onDelete('set null')
                  ->onUpdate('cascade');

            $table->integer('volume_tugas')->default(0);

            // Constraint: Satu mitra tidak boleh ganda di satu perencanaan yang sama
            $table->unique(['id_perencanaan', 'id_mitra'], 'unik_perencanaan_mitra');

            // Sesuai SQL Anda hanya ada created_at
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kelompok_perencanaan');
        Schema::dropIfExists('perencanaan');
    }
};