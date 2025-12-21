<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat Tabel
        Schema::create('subkegiatan', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // ID string, bukan auto increment integer
            
            // Foreign Key ke tabel kegiatan
            $table->foreignId('id_kegiatan')
                  ->constrained('kegiatan')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            $table->string('nama_sub_kegiatan', 255);
            $table->text('deskripsi')->nullable();
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->string('status', 50)->default('pending');
            
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
        });

        // 2. Buat Trigger (Logika penomoran otomatis 'sub1', 'sub2'...)
        // Kita copy logika dari file subkegiatan.sql Anda
        DB::unprepared('
            CREATE TRIGGER `tg_subkegiatan_before_insert` BEFORE INSERT ON `subkegiatan`
            FOR EACH ROW BEGIN
                DECLARE max_id INT DEFAULT 0;
                
                -- Ambil angka tertinggi dari ID yang ada (misal sub10 -> 10)
                SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) INTO max_id FROM subkegiatan;
                
                IF max_id IS NULL THEN
                    SET max_id = 0;
                END IF;
                
                -- Set ID baru (misal sub11)
                SET NEW.id = CONCAT("sub", max_id + 1);
            END
        ');
    }

    public function down(): void
    {
        // Hapus trigger dulu baru tabel
        DB::unprepared('DROP TRIGGER IF EXISTS `tg_subkegiatan_before_insert`');
        Schema::dropIfExists('subkegiatan');
    }
};