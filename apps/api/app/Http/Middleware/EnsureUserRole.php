<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_active) {
            return response()->json([
                'message' => 'Sesi login tidak valid atau akun tidak aktif.',
            ], 401);
        }

        // Owner has full privileges across both owner and cashier endpoints
        if ($user->role === 'owner') {
            return $next($request);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'Akses ditolak. Halaman atau aksi ini hanya dapat diakses oleh Owner.',
            ], 403);
        }

        return $next($request);
    }
}
