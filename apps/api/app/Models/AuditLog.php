<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'before_state' => 'array',
        'after_state' => 'array',
    ];

    public static function record(
        string $action,
        string $actorName,
        string $actorRole,
        string $entityType,
        $entityId,
        string $summary,
        ?array $beforeState = null,
        ?array $afterState = null,
        ?string $shiftInfo = null
    ): self {
        return static::create([
            'action' => $action,
            'actor_name' => $actorName,
            'actor_role' => $actorRole,
            'shift_info' => $shiftInfo,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string) $entityId : null,
            'summary' => $summary,
            'before_state' => $beforeState,
            'after_state' => $afterState,
            'ip_address' => request()?->ip(),
        ]);
    }
}
