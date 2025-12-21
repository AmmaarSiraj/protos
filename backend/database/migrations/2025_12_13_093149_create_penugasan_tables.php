<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel Penugasan
        Schema::create('penugasan', function (Blueprint $table) {
            $table->id(); // Ini Unsigned BigInteger
            
            // Relasi ke Subkegiatan (Pastikan di tabel subkegiatan ID-nya varchar/string)
            $table->string('id_subkegiatan', 50);
            $table->foreign('id_subkegiatan')
                  ->references('id')->on('subkegiatan')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Relasi ke Pengawas (User)
            // Pastikan nama tabel users anda 'users' (jamak) atau 'user' (tunggal). Default laravel adalah 'users'.
            // Di sini saya ubah jadi unsignedBigInteger agar aman.
            $table->foreignId('id_pengawas')
                  ->constrained('user') // <-- Pastikan ini sesuai nama tabel user anda (biasanya users)
                  ->onDelete('cascade'); 

            $table->timestamps();
        });

        // 2. Tabel Kelompok Penugasan
        Schema::create('kelompok_penugasan', function (Blueprint $table) {
            $table->id();

            // Relasi ke Penugasan
            $table->foreignId('id_penugasan')
                  ->constrained('penugasan')
                  ->onDelete('cascade');

            // PERBAIKAN UTAMA DI SINI:
            // Menggunakan foreignId agar tipe datanya otomatis Unsigned BigInteger (sama dengan id di tabel mitra)
            $table->foreignId('id_mitra')
                  ->constrained('mitra') // Otomatis merujuk ke id di tabel mitra
                  ->onDelete('cascade'); 

            // Relasi ke Jabatan Mitra
            $table->string('kode_jabatan', 50)->nullable();
            $table->foreign('kode_jabatan')
                  ->references('kode_jabatan')->on('jabatan_mitra')
                  ->onDelete('set null')
                  ->onUpdate('cascade');

            $table->integer('volume_tugas')->default(0);

            // Constraint unik
            $table->unique(['id_penugasan', 'id_mitra'], 'unik_penugasan_mitra');

            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kelompok_penugasan');
        Schema::dropIfExists('penugasan');
    }
};