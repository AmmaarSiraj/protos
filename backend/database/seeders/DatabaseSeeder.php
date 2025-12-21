<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Hapus atau komentar kode bawaan ini karena menggunakan kolom 'name' yg sudah tidak ada
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        // 2. Panggil Seeder buatan kita
        $this->call([
            UserSeeder::class,
        ]);
    }
}