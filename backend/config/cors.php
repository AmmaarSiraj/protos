<?php

return[
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://makinasik.web.bps.id',
        'http://makinasik.sidome.id',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
    ], // <--- Sesuaikan dengan port React Vite Anda

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // Ubah ke true jika butuh cookie/session
];