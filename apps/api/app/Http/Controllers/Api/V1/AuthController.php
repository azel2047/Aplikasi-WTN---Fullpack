<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\EmployeeProfile;
use App\Models\EmployeeSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function employeeProfiles()
    {
        return response()->json([
            'profiles' => EmployeeProfile::where('is_active', true)->orderBy('id')->get(),
        ]);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'employee_profile_id' => 'nullable|integer|exists:employee_profiles,id',
            'shift_name' => 'nullable|string|max:100',
            'terminal_name' => 'nullable|string|max:100',
        ]);

        $user = User::where('email', $validated['email'])->where('is_active', true)->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau kata sandi tidak sesuai.'],
            ]);
        }

        $activeProfile = null;
        $session = null;

        if ($user->role === 'employee') {
            $profileId = $validated['employee_profile_id']
                ?? EmployeeProfile::where('is_active', true)->value('id');

            $activeProfile = EmployeeProfile::find($profileId);
            if ($activeProfile) {
                EmployeeSession::where('user_id', $user->id)->where('is_active', true)->update([
                    'is_active' => false,
                    'ended_at' => now(),
                ]);

                $session = EmployeeSession::create([
                    'user_id' => $user->id,
                    'employee_profile_id' => $activeProfile->id,
                    'shift_name' => $validated['shift_name'] ?? $activeProfile->default_shift,
                    'terminal_name' => $validated['terminal_name'] ?? 'Terminal Meja Depan',
                    'started_at' => now(),
                    'is_active' => true,
                ]);
            }
        }

        $token = $user->createToken('wtn-auth-token', [$user->role])->plainTextToken;

        AuditLog::record(
            'AUTH_LOGIN',
            $activeProfile ? "{$activeProfile->name} (Akun Bersama)" : $user->name,
            $user->role,
            'User',
            $user->id,
            $user->role === 'employee'
                ? "Login kasir menggunakan akun bersama sebagai {$activeProfile?->name} ({$session?->shift_name})"
                : "Login Owner Dashboard sebagai {$user->name}",
            null,
            null,
            $session?->shift_name
        );

        return response()->json([
            'token' => $token,
            'user' => $user,
            'employee_profile' => $activeProfile,
            'employee_session' => $session,
        ]);
    }

    public function switchShiftProfile(Request $request)
    {
        $validated = $request->validate([
            'employee_profile_id' => 'required|integer|exists:employee_profiles,id',
            'shift_name' => 'required|string|max:100',
            'pin' => 'nullable|string',
        ]);

        $user = $request->user();
        $profile = EmployeeProfile::findOrFail($validated['employee_profile_id']);

        if (!empty($validated['pin']) && !Hash::check($validated['pin'], $profile->pin_hash)) {
            throw ValidationException::withMessages([
                'pin' => ['PIN petugas tidak sesuai.'],
            ]);
        }

        EmployeeSession::where('user_id', $user->id)->where('is_active', true)->update([
            'is_active' => false,
            'ended_at' => now(),
        ]);

        $session = EmployeeSession::create([
            'user_id' => $user->id,
            'employee_profile_id' => $profile->id,
            'shift_name' => $validated['shift_name'],
            'terminal_name' => 'Terminal Meja Depan',
            'started_at' => now(),
            'is_active' => true,
        ]);

        AuditLog::record(
            'SHIFT_SWITCH',
            $profile->name,
            $user->role,
            'EmployeeSession',
            $session->id,
            "Berganti identitas petugas shift aktif ke {$profile->name} ({$validated['shift_name']})"
        );

        return response()->json([
            'employee_profile' => $profile,
            'employee_session' => $session,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $session = EmployeeSession::with('employeeProfile')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest()
            ->first();

        return response()->json([
            'user' => $user,
            'employee_profile' => $session?->employeeProfile,
            'employee_session' => $session,
            'available_profiles' => EmployeeProfile::where('is_active', true)->get(),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->delete();
        }
        return response()->json(['message' => 'Berhasil keluar.']);
    }
}
