<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Data persis dari SQL Dump Anda
        // Password hash ($2b$10$...) adalah format Bcrypt yang kompatibel dengan Laravel
        $users = [
            [
                'username' => 'admin_user',
                'email' => 'admin@example.com',
                'password' => 'password123',
                'role' => 'admin',
                'created_at' => '2025-11-16 08:32:44'
            ],
            [
                'username' => 'user_biasa_UPDATED',
                'email' => 'user_updated@example.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-16 08:34:31'
            ],
            [
                'username' => 'userr',
                'email' => 'user@gmail.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-17 02:21:12'
            ],
            [
                'username' => 'pambudi',
                'email' => 'pambudi@gmail.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-18 06:25:08'
            ],
            [
                'username' => 'user2',
                'email' => 'user2@gmail.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-18 15:50:12'
            ],
            [
                'username' => 'ammaar',
                'email' => 'user12@gmail.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-23 10:38:00'
            ],
            [
                'username' => 'siraj',
                'email' => 'admin2@gmail.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-23 10:38:00'
            ],
            [
                'username' => 'al',
                'email' => 'al@yahoo.com',
                'password' => 'password123',
                'role' => 'user',
                'created_at' => '2025-11-23 10:38:00'
            ],
        ];

        DB::table('user')->insert($users);
    }
}