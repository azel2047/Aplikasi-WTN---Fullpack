export function formatRupiah(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (Number.isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toLocaleString("id-ID");
}

export function formatDateTimeWIB(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return iso;
  }
}

export function formatTimeWIB(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return iso;
  }
}

const TOKEN_KEY = "wtn_auth_token";
const USER_KEY = "wtn_auth_user";
const PROFILE_KEY = "wtn_shift_profile";

export interface StoredAuth {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "owner" | "employee";
  };
  employeeProfile?: {
    id: number;
    name: string;
    code: string;
    role_title: string;
    default_shift: string;
  } | null;
  shiftName?: string;
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  if (!token || !userStr) return null;
  try {
    const user = JSON.parse(userStr);
    const profStr = localStorage.getItem(PROFILE_KEY);
    const profData = profStr ? JSON.parse(profStr) : null;
    return {
      token,
      user,
      employeeProfile: profData?.profile ?? null,
      shiftName: profData?.shiftName ?? profData?.profile?.default_shift ?? "Shift Pagi",
    };
  } catch {
    return null;
  }
}

export function setStoredAuth(
  token: string,
  user: StoredAuth["user"],
  employeeProfile?: StoredAuth["employeeProfile"],
  shiftName?: string
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (employeeProfile) {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        profile: employeeProfile,
        shiftName: shiftName || employeeProfile.default_shift,
      })
    );
  } else {
    localStorage.removeItem(PROFILE_KEY);
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  if (auth?.employeeProfile?.id && !headers.has("X-Employee-Profile-Id")) {
    headers.set("X-Employee-Profile-Id", String(auth.employeeProfile.id));
  }

  const url = path.startsWith("http")
    ? path
    : path.startsWith("/api/v1")
    ? path
    : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errMsg = "Terjadi kesalahan pada permintaan ke server.";
    if (isJson && payload) {
      if (payload.errors) {
        const firstKey = Object.keys(payload.errors)[0];
        if (firstKey && Array.isArray(payload.errors[firstKey])) {
          errMsg = payload.errors[firstKey][0];
        }
      } else if (payload.message) {
        errMsg = payload.message;
      }
    }
    const err = new Error(errMsg) as Error & { status?: number; payload?: any };
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload as T;
}

export function getOrderStatusLabel(status: string): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case "PENDING_PAYMENT":
      return {
        label: "Menunggu Pembayaran",
        bgClass: "bg-warning-subtle",
        textClass: "text-warning",
      };
    case "CONFIRMED":
      return {
        label: "Dikonfirmasi",
        bgClass: "bg-secondary-container",
        textClass: "text-on-secondary-fixed",
      };
    case "PREPARING":
      return {
        label: "Sedang Diracik",
        bgClass: "bg-primary-subtle",
        textClass: "text-on-primary-subtle",
      };
    case "READY":
      return {
        label: "Siap Disajikan",
        bgClass: "bg-success-subtle",
        textClass: "text-tertiary",
      };
    case "COMPLETED":
      return {
        label: "Selesai",
        bgClass: "bg-surface-variant",
        textClass: "text-on-surface-variant",
      };
    case "CANCELLED":
      return {
        label: "Dibatalkan",
        bgClass: "bg-error-subtle",
        textClass: "text-error",
      };
    default:
      return {
        label: status,
        bgClass: "bg-surface-variant",
        textClass: "text-on-surface",
      };
  }
}

export function getPaymentStatusLabel(status: string): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case "UNPAID":
      return {
        label: "Belum Dibayar",
        bgClass: "bg-warning-subtle",
        textClass: "text-warning",
      };
    case "PROOF_UPLOADED":
      return {
        label: "Bukti Diunggah",
        bgClass: "bg-warning-subtle",
        textClass: "text-warning",
      };
    case "VERIFYING":
      return {
        label: "Sedang Dicek",
        bgClass: "bg-primary-subtle",
        textClass: "text-on-primary-subtle",
      };
    case "PAID":
      return {
        label: "Lunas",
        bgClass: "bg-success-subtle",
        textClass: "text-tertiary",
      };
    case "REJECTED":
      return {
        label: "Bukti Ditolak",
        bgClass: "bg-error-subtle",
        textClass: "text-error",
      };
    case "REFUNDED":
      return {
        label: "Refund",
        bgClass: "bg-surface-variant",
        textClass: "text-on-surface-variant",
      };
    default:
      return {
        label: status,
        bgClass: "bg-surface-variant",
        textClass: "text-on-surface",
      };
  }
}
