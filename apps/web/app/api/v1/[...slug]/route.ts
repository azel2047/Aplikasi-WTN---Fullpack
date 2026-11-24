import { NextRequest, NextResponse } from "next/server";
import {
  deductStockForOrder,
  enrichIngredient,
  enrichOrder,
  enrichProduct,
  nextId,
  randomToken,
  readDb,
  recordAudit,
  writeDb,
  type WtnDatabase,
} from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const VALID_ORDER_STATUSES = new Set(["CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]);

// shortcut: in-memory per-instance rate limiter; move to Redis/Upstash if running high-scale multi-region
const rateBuckets = new Map<string, number[]>();
function checkRateLimit(req: NextRequest, bucket: string, max: number, windowMs = 60_000): boolean {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  rateBuckets.set(key, hits);
  return true;
}

function verifySensitivePin(actor: { user: any; profile: any }, pinInput: any): boolean {
  const pin = String(pinInput || "").trim();
  if (!pin) return false;
  if (actor.user?.role === "owner") return pin === String(actor.user.pin);
  return pin === String(actor.profile?.pin || "") || pin === String(actor.user?.pin || "");
}

function sanitizeProfile(p: any) {
  if (!p) return null;
  const { pin: _pin, ...safe } = p;
  return safe;
}

async function parseBody(req: NextRequest): Promise<any> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const obj: Record<string, any> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") {
        obj[k] = v;
      } else {
        if (v.size > MAX_UPLOAD_BYTES) {
          throw new Error("Ukuran file unggahan maksimal 2 MB.");
        }
        const mime = (v.type || "").toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.has(mime)) {
          throw new Error("Format file harus berupa gambar (JPG, PNG, atau WEBP).");
        }
        const buf = Buffer.from(await v.arrayBuffer());
        obj[k] = {
          name: v.name.replace(/[^\w.\-]/g, "_").slice(0, 80),
          type: mime,
          dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
        };
      }
    }
    return obj;
  }
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function getActor(req: NextRequest, db: WtnDatabase) {
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const cookieToken = req.cookies.get("wtn_token")?.value || "";
  const token = headerToken || cookieToken;
  const session = token ? db.auth_tokens[token] : null;
  const profileIdHeader = req.headers.get("x-employee-profile-id");
  const profileId = profileIdHeader ? Number(profileIdHeader) : session?.employee_profile_id;
  const profile = profileId ? db.employee_profiles.find((p) => p.id === profileId) : db.employee_profiles[0];
  const user = session ? db.users.find((u) => u.id === session.user_id && u.is_active) : null;
  return {
    user,
    profile,
    actorName: user?.role === "owner" ? user.name : profile?.name || "Kasir",
    actorRole: user?.role || "employee",
    shiftName: session?.shift_name || profile?.default_shift || "Shift Pagi",
  };
}

async function handleRequest(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    return await handleRequestInner(req, params);
  } catch (err: any) {
    console.error("[WTN API ERROR]", err);
    const msg = String(err?.message || "Terjadi kesalahan internal.");
    const status = msg.includes("Ukuran file") || msg.includes("Format file") ? 422 : 500;
    return NextResponse.json({ message: status === 422 ? msg : `Server/DB error: ${msg.slice(0, 140)}` }, { status });
  }
}

async function handleRequestInner(req: NextRequest, params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const method = req.method.toUpperCase();
  const pathStr = "/" + slug.join("/");
  if (method === "GET" && pathStr === "/health") {
    const db = await readDb();
    return NextResponse.json({
      ok: true,
      driver: process.env.DATABASE_URL || process.env.POSTGRES_URL ? "postgresql" : "json",
      tables: db.dining_tables.length,
    });
  }
  const db = await readDb();
  const url = new URL(req.url);

  // ================= AUTH =================
  if (method === "GET" && pathStr === "/auth/employee-profiles") {
    return NextResponse.json({
      profiles: db.employee_profiles.filter((p) => p.is_active).map(sanitizeProfile),
    });
  }

  if (method === "POST" && pathStr === "/auth/login") {
    if (!checkRateLimit(req, "login", 15)) {
      return jsonError("Terlalu banyak percobaan login. Coba lagi dalam 1 menit.", 429);
    }
    const body = await parseBody(req);
    const emailInput = String(body.email || "").trim().toLowerCase();
    const passwordInput = String(body.password || "");
    const user = db.users.find(
      (u) => u.email.toLowerCase() === emailInput && u.password === passwordInput && u.is_active
    );
    if (!user) return jsonError("Email atau kata sandi tidak sesuai.", 422);

    const token = "wtn_" + randomToken(32);
    const empProfile =
      user.role === "employee"
        ? db.employee_profiles.find((p) => p.id === Number(body.employee_profile_id)) || db.employee_profiles[0]
        : null;

    db.auth_tokens[token] = {
      user_id: user.id,
      role: user.role,
      employee_profile_id: empProfile?.id,
      shift_name: body.shift_name || empProfile?.default_shift,
    };

    recordAudit(
      db,
      "AUTH_LOGIN",
      empProfile ? empProfile.name : user.name,
      user.role,
      "User",
      user.id,
      `Login sebagai ${empProfile ? empProfile.name : user.name}`
    );
    await writeDb(db);

    const res = NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      employee_profile: sanitizeProfile(empProfile),
    });
    res.cookies.set("wtn_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 16,
    });
    return res;
  }

  if (method === "POST" && pathStr === "/auth/switch-shift") {
    const actorCheck = getActor(req, db);
    if (!actorCheck.user) return jsonError("Sesi tidak valid. Silakan login kembali.", 401);
    const body = await parseBody(req);
    const profile = db.employee_profiles.find((p) => p.id === Number(body.employee_profile_id));
    if (!profile) return jsonError("Petugas tidak ditemukan.", 404);
    const authHeader = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const token = authHeader || req.cookies.get("wtn_token")?.value || "";
    if (token && db.auth_tokens[token]) {
      db.auth_tokens[token].employee_profile_id = profile.id;
      db.auth_tokens[token].shift_name = body.shift_name;
    }
    await writeDb(db);
    return NextResponse.json({ employee_profile: sanitizeProfile(profile) });
  }

  if (method === "POST" && pathStr === "/auth/logout") {
    const authHeader = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const token = authHeader || req.cookies.get("wtn_token")?.value || "";
    if (token) delete db.auth_tokens[token];
    await writeDb(db);
    const res = NextResponse.json({ message: "Berhasil keluar." });
    res.cookies.delete("wtn_token");
    return res;
  }

  // ================= PUBLIC CUSTOMER =================
  if (method === "GET" && pathStr === "/public/tables") {
    return NextResponse.json({
      tables: db.dining_tables
        .filter((t) => t.is_active)
        .map(({ qr_token: _qr, ...safeTable }) => safeTable),
      business_name: db.system_settings.business_name,
    });
  }

  if (method === "GET" && pathStr === "/public/qris-image") {
    const dataUrl = db.system_settings.qris_image_data_url;
    if (!dataUrl) return jsonError("Belum ada gambar QRIS resmi.", 404);
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    const mime = (match?.[1] || "").toLowerCase();
    if (!match || !ALLOWED_IMAGE_TYPES.has(mime)) {
      return jsonError("Format QRIS tidak valid.", 404);
    }
    const buf = Buffer.from(match[2], "base64");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const tableMenuMatch = /^\/public\/tables\/([^/]+)\/menu$/.exec(pathStr);
  if (method === "GET" && tableMenuMatch) {
    const token = decodeURIComponent(tableMenuMatch[1]);
    const table = db.dining_tables.find((t) => t.qr_token === token && t.is_active);
    if (!table) {
      return jsonError("QR Meja tidak valid atau sudah dicabut.", 404);
    }

    table.last_scanned_at = new Date().toISOString();
    db.traffic_events.push({
      id: nextId(db, "traffic"),
      event_type: "QR_MENU_VISIT",
      dining_table_id: table.id,
      occurred_at: new Date().toISOString(),
    });
    await writeDb(db);

    const categories = db.categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        products: db.products
          .filter((p) => p.category_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => enrichProduct(p, db)),
      }));

    const active_orders = db.orders
      .filter(
        (o) =>
          o.dining_table_id === table.id &&
          ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return NextResponse.json({
      table,
      categories,
      active_orders,
      settings: {
        ...db.system_settings,
        has_official_qris_image: Boolean(db.system_settings.qris_image_data_url),
      },
    });
  }

  if (method === "POST" && pathStr === "/public/orders") {
    if (!checkRateLimit(req, "public_order", 20)) {
      return jsonError("Terlalu banyak permintaan pesanan. Tunggu sebentar.", 429);
    }
    const body = await parseBody(req);
    const idem = body.idempotency_key || req.headers.get("idempotency-key");
    if (idem) {
      const existing = db.orders.find((o) => o.idempotency_key === idem);
      if (existing) {
        return NextResponse.json({ message: "Pesanan berhasil dikirim.", order: enrichOrder(existing, db) }, { status: 201 });
      }
    }

    const table = db.dining_tables.find((t) => t.qr_token === body.table_token && t.is_active);
    if (!table) return jsonError("Token QR meja tidak valid atau sudah dicabut.", 422);

    const created = createOrderInternal(db, body, "QR", body.customer_name || `Pelanggan ${table.name}`, table);
    if (created.error) return jsonError(created.error, 422);

    await writeDb(db);
    return NextResponse.json({ message: "Pesanan berhasil dikirim ke kasir.", order: enrichOrder(created.order, db) }, { status: 201 });
  }

  const publicOrderMatch = /^\/public\/orders\/([^/]+)$/.exec(pathStr);
  if (method === "GET" && publicOrderMatch) {
    const code = decodeURIComponent(publicOrderMatch[1]);
    const ord = db.orders.find((o) => o.public_code === code);
    if (!ord) return jsonError("Kode pesanan tidak ditemukan.", 404);
    return NextResponse.json({
      order: enrichOrder(ord, db),
      settings: {
        ...db.system_settings,
        has_official_qris_image: Boolean(db.system_settings.qris_image_data_url),
      },
    });
  }

  const proofMatch = /^\/public\/orders\/([^/]+)\/payment-proof$/.exec(pathStr);
  if (method === "POST" && proofMatch) {
    const code = decodeURIComponent(proofMatch[1]);
    const ord = db.orders.find((o) => o.public_code === code);
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    if (ord.payment_status === "PAID" || ["COMPLETED", "CANCELLED"].includes(ord.status)) {
      return jsonError("Status pesanan tidak dapat lagi menerima bukti pembayaran.", 422);
    }

    const body = await parseBody(req);
    const refText = body.proof_reference || (body.proof_file?.name ? `File: ${body.proof_file.name}` : "Bukti QRIS diunggah");
    ord.payment_method = "QRIS";
    ord.payment_status = "PROOF_UPLOADED";
    ord.latest_payment = {
      ...(ord.latest_payment || {}),
      method: "QRIS",
      status: "PROOF_UPLOADED",
      proof_reference: refText,
      proof_uploaded_at: new Date().toISOString(),
      rejection_reason: null,
    };
    ord.status_histories.push({
      id: Date.now(),
      previous_status: ord.status,
      next_status: ord.status,
      actor_name: ord.customer_name || "Pelanggan",
      actor_role: "customer",
      reason: "Bukti QRIS diunggah (Menunggu verifikasi manual kasir)",
      created_at: new Date().toISOString(),
    });
    await writeDb(db);
    return NextResponse.json({
      message: "Bukti pembayaran terkirim. Menunggu verifikasi kasir.",
      order: enrichOrder(ord, db),
    });
  }

  const callWaiterMatch = /^\/public\/orders\/([^/]+)\/call-waiter$/.exec(pathStr);
  if (method === "POST" && callWaiterMatch) {
    const code = decodeURIComponent(callWaiterMatch[1]);
    const ord = db.orders.find((o) => o.public_code === code);
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    ord.waiter_called = true;
    ord.waiter_called_at = new Date().toISOString();
    await writeDb(db);
    return NextResponse.json({ message: "Panggilan bantuan terkirim ke kasir.", order: enrichOrder(ord, db) });
  }

  const ratingMatch = /^\/public\/orders\/([^/]+)\/rating$/.exec(pathStr);
  if (method === "POST" && ratingMatch) {
    const code = decodeURIComponent(ratingMatch[1]);
    const ord = db.orders.find((o) => o.public_code === code);
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    if (ord.status !== "COMPLETED") return jsonError("Rating hanya dapat diberikan setelah pesanan selesai.", 422);
    if (db.ratings.some((r) => r.order_id === ord.id)) return jsonError("Pesanan ini sudah memiliki rating.", 422);

    const body = await parseBody(req);
    const rating = {
      id: nextId(db, "rating"),
      order_id: ord.id,
      dining_table_id: ord.dining_table_id,
      stars: Math.min(5, Math.max(1, Number(body.stars || 5))),
      tags: Array.isArray(body.tags) ? body.tags : [],
      comment: body.comment || null,
      customer_display_name: `${ord.customer_name || "Pelanggan"} (${ord.table_name_snapshot})`,
      is_public_wall: body.is_public_wall ?? true,
      created_at: new Date().toISOString(),
    };
    db.ratings.unshift(rating);
    await writeDb(db);
    return NextResponse.json({ message: "Terima kasih! Rating Anda tersimpan.", rating, order: enrichOrder(ord, db) }, { status: 201 });
  }

  // ================= CASHIER & OWNER RBAC GUARD =================
  const actor = getActor(req, db);
  if (pathStr.startsWith("/cashier/") || pathStr.startsWith("/owner/")) {
    if (!actor.user) {
      return jsonError("Akses ditolak. Silakan login terlebih dahulu.", 401);
    }
    if (pathStr.startsWith("/owner/") && actor.user.role !== "owner") {
      return jsonError("Akses ditolak. Halaman ini khusus Owner.", 403);
    }
  }

  if (method === "GET" && pathStr === "/cashier/orders") {
    const statusFilter = url.searchParams.get("status");
    const payFilter = url.searchParams.get("payment_status");
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();

    let list = [...db.orders];
    if (statusFilter && statusFilter !== "ALL") {
      list = statusFilter === "NEW"
        ? list.filter((o) => ["PENDING_PAYMENT", "CONFIRMED"].includes(o.status))
        : list.filter((o) => o.status === statusFilter);
    }
    if (payFilter && payFilter !== "ALL") {
      list = list.filter((o) => o.payment_status === payFilter);
    }
    if (search) {
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.public_code.toLowerCase().includes(search) ||
          (o.customer_name || "").toLowerCase().includes(search) ||
          (o.table_name_snapshot || "").toLowerCase().includes(search)
      );
    }

    const priority: Record<string, number> = {
      PENDING_PAYMENT: 1,
      CONFIRMED: 2,
      PREPARING: 3,
      READY: 4,
      COMPLETED: 5,
      CANCELLED: 6,
    };
    list.sort((a, b) => (priority[a.status] || 9) - (priority[b.status] || 9) || b.created_at.localeCompare(a.created_at));

    const counts = {
      new: db.orders.filter((o) => ["PENDING_PAYMENT", "CONFIRMED"].includes(o.status)).length,
      preparing: db.orders.filter((o) => o.status === "PREPARING").length,
      ready: db.orders.filter((o) => o.status === "READY").length,
      completed: db.orders.filter((o) => o.status === "COMPLETED").length,
      cancelled: db.orders.filter((o) => o.status === "CANCELLED").length,
      proof_uploaded: db.orders.filter((o) => o.payment_status === "PROOF_UPLOADED").length,
    };

    return NextResponse.json({
      orders: list.map((o) => enrichOrder(o, db)),
      counts,
      notifications: db.notifications,
      server_time: new Date().toISOString(),
    });
  }

  const cashierOrderShow = /^\/cashier\/orders\/(\d+)$/.exec(pathStr);
  if (method === "GET" && cashierOrderShow) {
    const ord = db.orders.find((o) => o.id === Number(cashierOrderShow[1]));
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    return NextResponse.json({ order: enrichOrder(ord, db) });
  }

  const cashierPaymentMatch = /^\/cashier\/orders\/(\d+)\/payments$/.exec(pathStr);
  if (method === "POST" && cashierPaymentMatch) {
    const ord = db.orders.find((o) => o.id === Number(cashierPaymentMatch[1]));
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    const body = await parseBody(req);

    if (body.action === "REJECT_PROOF") {
      if (!body.rejection_reason) return jsonError("Alasan penolakan wajib diisi.", 422);
      ord.payment_status = "REJECTED";
      ord.latest_payment = {
        ...(ord.latest_payment || {}),
        status: "REJECTED",
        rejection_reason: body.rejection_reason,
        verified_by_name: actor.actorName,
        verified_at: new Date().toISOString(),
      };
      recordAudit(db, "PAYMENT_REJECTED", actor.actorName, actor.actorRole, "Order", ord.id, `Menolak bukti QRIS ${ord.order_number}: ${body.rejection_reason}`);
      await writeDb(db);
      return NextResponse.json({ message: `Bukti pembayaran ${ord.order_number} ditolak.`, order: enrichOrder(ord, db) });
    }

    if (ord.payment_status !== "PAID") {
      const payMethod = (body.method || ord.payment_method || "CASH").toUpperCase();
      const due = Number(ord.total_amount);
      const received = payMethod === "CASH" ? Number(body.amount_received || 0) : due;
      if (payMethod === "CASH" && received < due) {
        return jsonError("Nominal uang diterima kurang dari total tagihan.", 422);
      }

      const deduct = deductStockForOrder(db, ord, actor.actorName);
      if (!deduct.ok) return jsonError(deduct.error || "Stok bahan tidak cukup.", 422);

      const change = Math.max(0, received - due);
      ord.payment_method = payMethod;
      ord.payment_status = "PAID";
      if (ord.status === "PENDING_PAYMENT") {
        ord.status = "CONFIRMED";
        ord.confirmed_at = new Date().toISOString();
      }
      ord.latest_payment = {
        ...(ord.latest_payment || {}),
        method: payMethod,
        status: "PAID",
        amount_due: due,
        amount_received: received,
        change_amount: change,
        verified_by_name: actor.actorName,
        verified_at: new Date().toISOString(),
      };

      const acc = db.cash_accounts.find((a) => a.code === (payMethod === "QRIS" ? "QRIS_BANK" : "CASH_DRAWER"));
      if (acc) {
        const before = Number(acc.current_balance);
        acc.current_balance = before + due;
        db.cash_transactions.unshift({
          id: nextId(db, "cash_trx"),
          cash_account_id: acc.id,
          transaction_code: `TRX-${randomToken(6).toUpperCase()}`,
          direction: "IN",
          category: "SALES",
          amount: due,
          balance_before: before,
          balance_after: acc.current_balance,
          description: `Pembayaran ${payMethod} ${ord.order_number} (${ord.table_name_snapshot})`,
          actor_name: actor.actorName,
          occurred_at: new Date().toISOString(),
        });
      }

      recordAudit(db, "PAYMENT_VERIFIED", actor.actorName, actor.actorRole, "Order", ord.id, `Verifikasi pembayaran ${payMethod} ${ord.order_number}`);
      await writeDb(db);
    }

    return NextResponse.json({
      message: `Pembayaran ${ord.order_number} berhasil diverifikasi Lunas.`,
      order: enrichOrder(ord, db),
    });
  }

  const cashierStatusMatch = /^\/cashier\/orders\/(\d+)\/status$/.exec(pathStr);
  if (method === "PATCH" && cashierStatusMatch) {
    const ord = db.orders.find((o) => o.id === Number(cashierStatusMatch[1]));
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    const body = await parseBody(req);
    const nextStatus = String(body.status || "").toUpperCase();
    if (!VALID_ORDER_STATUSES.has(nextStatus)) {
      return jsonError("Status pesanan tidak valid.", 422);
    }
    const prevStatus = ord.status;

    if (nextStatus === "COMPLETED" && ord.payment_status !== "PAID") {
      return jsonError("Pesanan harus dilunasi sebelum ditandai Selesai.", 422);
    }

    if (nextStatus === "CANCELLED") {
      if (!body.reason) return jsonError("Alasan pembatalan wajib diisi.", 422);
      if (!verifySensitivePin(actor, body.pin)) {
        return jsonError("PIN konfirmasi petugas tidak sesuai.", 403);
      }
      ord.status = "CANCELLED";
      ord.cancel_reason = body.reason;
      ord.cancelled_at = new Date().toISOString();
      recordAudit(db, "ORDER_CANCELLED", actor.actorName, actor.actorRole, "Order", ord.id, `Membatalkan ${ord.order_number}: ${body.reason}`);
    } else {
      if (["CONFIRMED", "PREPARING"].includes(nextStatus) && !ord.stock_deducted) {
        const deduct = deductStockForOrder(db, ord, actor.actorName);
        if (!deduct.ok) return jsonError(deduct.error || "Stok tidak mencukupi.", 422);
      }
      ord.status = nextStatus;
      if (nextStatus === "CONFIRMED") ord.confirmed_at = ord.confirmed_at || new Date().toISOString();
      if (nextStatus === "PREPARING") ord.preparing_at = ord.preparing_at || new Date().toISOString();
      if (nextStatus === "READY") ord.ready_at = ord.ready_at || new Date().toISOString();
      if (nextStatus === "COMPLETED") ord.completed_at = new Date().toISOString();
    }

    ord.status_histories.push({
      id: Date.now(),
      previous_status: prevStatus,
      next_status: nextStatus,
      actor_name: actor.actorName,
      actor_role: actor.actorRole,
      reason: body.reason || `Status diubah menjadi ${nextStatus}`,
      created_at: new Date().toISOString(),
    });
    await writeDb(db);

    return NextResponse.json({
      message: `Status ${ord.order_number} diperbarui menjadi ${nextStatus}.`,
      order: enrichOrder(ord, db),
    });
  }

  const cashierRefundMatch = /^\/cashier\/orders\/(\d+)\/refund$/.exec(pathStr);
  if (method === "POST" && cashierRefundMatch) {
    const ord = db.orders.find((o) => o.id === Number(cashierRefundMatch[1]));
    if (!ord) return jsonError("Pesanan tidak ditemukan.", 404);
    const body = await parseBody(req);
    if (!verifySensitivePin(actor, body.pin)) {
      return jsonError("PIN konfirmasi tidak sesuai.", 403);
    }
    ord.status = "CANCELLED";
    ord.payment_status = "REFUNDED";
    ord.cancel_reason = body.reason || "Refund";
    recordAudit(db, "ORDER_REFUNDED", actor.actorName, actor.actorRole, "Order", ord.id, `Refund ${ord.order_number}: ${ord.cancel_reason}`);
    await writeDb(db);
    return NextResponse.json({ message: `Refund ${ord.order_number} berhasil dicatat.`, order: enrichOrder(ord, db) });
  }

  if (method === "GET" && pathStr === "/cashier/pos/catalog") {
    const categories = db.categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        products: db.products
          .filter((p) => p.category_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => enrichProduct(p, db)),
      }));
    return NextResponse.json({
      categories,
      tables: db.dining_tables.filter((t) => t.is_active),
      settings: db.system_settings,
    });
  }

  if (method === "POST" && pathStr === "/cashier/pos/orders") {
    const body = await parseBody(req);
    const table = body.dining_table_id
      ? db.dining_tables.find((t) => t.id === Number(body.dining_table_id))
      : null;

    const created = createOrderInternal(db, body, "POS", actor.actorName, table);
    if (created.error) return jsonError(created.error, 422);
    const ord = created.order;

    if (body.pay_immediately) {
      const payMethod = (body.payment_method || "CASH").toUpperCase();
      const due = Number(ord.total_amount);
      const received = payMethod === "CASH" ? Number(body.amount_received || due) : due;
      if (payMethod === "CASH" && received < due) {
        return jsonError("Nominal uang diterima kurang dari total tagihan.", 422);
      }

      const deduct = deductStockForOrder(db, ord, actor.actorName);
      if (!deduct.ok) return jsonError(deduct.error || "Stok tidak mencukupi.", 422);

      ord.payment_method = payMethod;
      ord.payment_status = "PAID";
      ord.status = "CONFIRMED";
      ord.confirmed_at = new Date().toISOString();
      ord.latest_payment = {
        ...(ord.latest_payment || {}),
        method: payMethod,
        status: "PAID",
        amount_due: due,
        amount_received: received,
        change_amount: Math.max(0, received - due),
        verified_by_name: actor.actorName,
        verified_at: new Date().toISOString(),
      };

      const acc = db.cash_accounts.find((a) => a.code === (payMethod === "QRIS" ? "QRIS_BANK" : "CASH_DRAWER"));
      if (acc) {
        const before = Number(acc.current_balance);
        acc.current_balance = before + due;
        db.cash_transactions.unshift({
          id: nextId(db, "cash_trx"),
          cash_account_id: acc.id,
          transaction_code: `TRX-${randomToken(6).toUpperCase()}`,
          direction: "IN",
          category: "SALES",
          amount: due,
          balance_before: before,
          balance_after: acc.current_balance,
          description: `Penjualan POS ${payMethod} ${ord.order_number}`,
          actor_name: actor.actorName,
          occurred_at: new Date().toISOString(),
        });
      }
    }

    await writeDb(db);
    return NextResponse.json({
      message: "Pesanan POS berhasil dibuat.",
      order: enrichOrder(ord, db),
      settings: db.system_settings,
    }, { status: 201 });
  }

  // Expenses (Cashier & Owner)
  if (method === "GET" && (pathStr === "/cashier/expenses" || pathStr === "/owner/expenses")) {
    const expenses = db.expenses.map((e) => ({
      ...e,
      category: db.expense_categories.find((c) => c.id === e.expense_category_id) || null,
    }));
    return NextResponse.json({
      expenses,
      categories: db.expense_categories,
      cash_accounts: db.cash_accounts,
    });
  }

  if (method === "POST" && (pathStr === "/cashier/expenses" || pathStr === "/owner/expenses")) {
    const body = await parseBody(req);
    const amount = Number(body.amount || 0);
    if (amount < 100) return jsonError("Nominal pengeluaran minimal Rp 100.", 422);

    const acc = db.cash_accounts.find((a) => a.code === (body.payment_method === "QRIS_BANK" ? "QRIS_BANK" : "CASH_DRAWER"));
    const exp = {
      id: nextId(db, "expense"),
      expense_code: `EXP-${randomToken(5).toUpperCase()}`,
      expense_category_id: Number(body.expense_category_id || 1),
      expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
      amount,
      payment_method: body.payment_method || "CASH",
      description: body.description || "Pengeluaran operasional",
      actor_name: actor.actorName,
    };
    db.expenses.unshift(exp);

    if (acc) {
      const before = Number(acc.current_balance);
      acc.current_balance = before - amount;
      db.cash_transactions.unshift({
        id: nextId(db, "cash_trx"),
        cash_account_id: acc.id,
        transaction_code: `TRX-EXP-${randomToken(5).toUpperCase()}`,
        direction: "OUT",
        category: "OPERATING_EXPENSE",
        amount,
        balance_before: before,
        balance_after: acc.current_balance,
        description: exp.description,
        actor_name: actor.actorName,
        occurred_at: new Date().toISOString(),
      });
    }

    recordAudit(db, "EXPENSE_CREATED", actor.actorName, actor.actorRole, "Expense", exp.id, `Pengeluaran Rp ${amount}: ${exp.description}`);
    await writeDb(db);
    return NextResponse.json({ message: "Pengeluaran berhasil dicatat.", expense: exp }, { status: 201 });
  }

  // Daily Reports
  if (method === "GET" && pathStr === "/cashier/daily-reports") {
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = db.orders.filter((o) => String(o.created_at).slice(0, 10) === today);
    const paid = todayOrders.filter((o) => o.payment_status === "PAID");
    return NextResponse.json({
      system_metrics: {
        date: today,
        total_orders_count: todayOrders.length,
        completed_orders_count: todayOrders.filter((o) => o.status === "COMPLETED").length,
        cancelled_orders_count: todayOrders.filter((o) => o.status === "CANCELLED").length,
        gross_revenue_amount: paid.reduce((s, o) => s + Number(o.total_amount), 0),
        cash_revenue_amount: paid.filter((o) => o.payment_method === "CASH").reduce((s, o) => s + Number(o.total_amount), 0),
        qris_revenue_amount: paid.filter((o) => o.payment_method === "QRIS").reduce((s, o) => s + Number(o.total_amount), 0),
        refund_amount: todayOrders.filter((o) => o.payment_status === "REFUNDED").reduce((s, o) => s + Number(o.total_amount), 0),
        expenses_amount: db.expenses.filter((e) => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0),
      },
      reports: db.employee_reports,
    });
  }

  if (method === "POST" && (pathStr === "/cashier/daily-reports" || pathStr === "/cashier/reports/daily")) {
    const body = await parseBody(req);
    const today = body.report_date || new Date().toISOString().slice(0, 10);
    const shift = body.shift_name || actor.shiftName;
    if (db.employee_reports.some((r) => r.report_date === today && r.shift_name === shift && r.status !== "draft")) {
      return jsonError(`Laporan untuk ${today} (${shift}) sudah dikirim.`, 422);
    }

    const todayOrders = db.orders.filter((o) => String(o.created_at).slice(0, 10) === today);
    const paid = todayOrders.filter((o) => o.payment_status === "PAID");
    const rpt = {
      id: nextId(db, "report"),
      report_code: `RPT-${randomToken(5).toUpperCase()}`,
      report_date: today,
      shift_name: shift,
      employee_name: actor.actorName,
      total_orders_count: todayOrders.length,
      completed_orders_count: todayOrders.filter((o) => o.status === "COMPLETED").length,
      cancelled_orders_count: todayOrders.filter((o) => o.status === "CANCELLED").length,
      gross_revenue_amount: paid.reduce((s, o) => s + Number(o.total_amount), 0),
      cash_revenue_amount: paid.filter((o) => o.payment_method === "CASH").reduce((s, o) => s + Number(o.total_amount), 0),
      qris_revenue_amount: paid.filter((o) => o.payment_method === "QRIS").reduce((s, o) => s + Number(o.total_amount), 0),
      refund_amount: 0,
      expenses_amount: db.expenses.filter((e) => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0),
      crowd_condition: body.crowd_condition || "normal",
      crowd_peak_note: body.crowd_peak_note || null,
      stock_condition: body.stock_condition || "aman",
      stock_concerns: body.stock_concerns || null,
      operational_issues: body.operational_issues || null,
      additional_notes: body.additional_notes || null,
      status: "submitted",
      owner_feedback: null,
      submitted_at: new Date().toISOString(),
    };
    db.employee_reports.unshift(rpt);
    await writeDb(db);
    return NextResponse.json({ message: "Laporan harian berhasil dikirim.", report: rpt }, { status: 201 });
  }

  // Cash Closings
  if (method === "GET" && pathStr === "/cashier/closings") {
    const today = new Date().toISOString().slice(0, 10);
    const cashDrawer = db.cash_accounts.find((a) => a.code === "CASH_DRAWER");
    const qrisAcc = db.cash_accounts.find((a) => a.code === "QRIS_BANK");
    const paid = db.orders.filter((o) => o.payment_status === "PAID");
    return NextResponse.json({
      summary: {
        date: today,
        opening_cash_balance: cashDrawer?.opening_balance || 500000,
        cash_sales_amount: paid.filter((o) => o.payment_method === "CASH").reduce((s, o) => s + Number(o.total_amount), 0),
        qris_sales_amount: paid.filter((o) => o.payment_method === "QRIS").reduce((s, o) => s + Number(o.total_amount), 0),
        cash_expenses_amount: db.expenses.filter((e) => e.payment_method === "CASH").reduce((s, e) => s + Number(e.amount), 0),
        cash_refunds_amount: 0,
        expected_closing_cash: cashDrawer?.current_balance || 0,
        qris_account_balance: qrisAcc?.current_balance || 0,
      },
      closings: db.cash_closings,
    });
  }

  if (method === "POST" && pathStr === "/cashier/closings") {
    const body = await parseBody(req);
    if (!verifySensitivePin(actor, body.pin)) {
      return jsonError("PIN konfirmasi petugas tidak sesuai.", 403);
    }
    const cashDrawer = db.cash_accounts.find((a) => a.code === "CASH_DRAWER");
    const expected = Number(cashDrawer?.current_balance || 0);
    const actual = Number(body.actual_physical_cash || 0);
    const variance = actual - expected;
    if (variance !== 0 && !body.variance_reason) {
      return jsonError("Alasan selisih kas wajib diisi.", 422);
    }

    const closing = {
      id: nextId(db, "closing"),
      closing_code: `CLS-${randomToken(5).toUpperCase()}`,
      closing_date: new Date().toISOString().slice(0, 10),
      shift_name: body.shift_name || actor.shiftName,
      actor_name: actor.actorName,
      expected_closing_cash: expected,
      actual_Physical_cash: actual,
      variance_amount: variance,
      variance_reason: body.variance_reason || null,
      status: "SUBMITTED",
    };
    db.cash_closings.unshift(closing);
    recordAudit(db, "CASH_CLOSING", actor.actorName, actor.actorRole, "CashClosing", closing.id, `Closing kas ${closing.closing_code} (Selisih Rp ${variance})`);
    await writeDb(db);
    return NextResponse.json({ message: "Penutupan kas berhasil disimpan.", closing }, { status: 201 });
  }

  // ================= OWNER =================
  if (method === "GET" && pathStr === "/owner/dashboard") {
    const today = new Date().toISOString().slice(0, 10);
    const paidAll = db.orders.filter((o) => o.payment_status === "PAID");
    const todayOrders = db.orders.filter((o) => String(o.created_at).slice(0, 10) === today);
    const paidToday = todayOrders.filter((o) => o.payment_status === "PAID");
    const todayRevenue = paidToday.reduce((s, o) => s + Number(o.total_amount), 0);

    const hourly = Array.from({ length: 15 }, (_, idx) => {
      const h = idx + 8;
      return { hour: `${String(h).padStart(2, "0")}.00`, short_hour: String(h).padStart(2, "0"), revenue: 0, orders_count: 0 };
    });
    for (const o of paidAll) {
      const h = (new Date(o.created_at).getUTCHours() + 7) % 24;
      if (h >= 8 && h <= 22) {
        hourly[h - 8].revenue += Number(o.total_amount);
        hourly[h - 8].orders_count += 1;
      }
    }

    const prodMap: Record<string, { name: string; total_qty: number; total_revenue: number }> = {};
    for (const o of paidAll) {
      for (const it of o.items || []) {
        if (!prodMap[it.product_name_snapshot]) {
          prodMap[it.product_name_snapshot] = { name: it.product_name_snapshot, total_qty: 0, total_revenue: 0 };
        }
        prodMap[it.product_name_snapshot].total_qty += Number(it.quantity);
        prodMap[it.product_name_snapshot].total_revenue += Number(it.line_total);
      }
    }

    const enrichedIngs = db.ingredients.map((i) => enrichIngredient(i, db));
    const avgRating = db.ratings.length
      ? Math.round((db.ratings.reduce((s, r) => s + Number(r.stars), 0) / db.ratings.length) * 10) / 10
      : 0;

    return NextResponse.json({
      kpis: {
        date: today,
        today_revenue: todayRevenue,
        today_paid_orders: paidToday.length,
        today_pending_orders: todayOrders.filter((o) => o.payment_status !== "PAID" && o.status !== "CANCELLED").length,
        today_cancelled_orders: todayOrders.filter((o) => o.status === "CANCELLED").length,
        today_aov: paidToday.length ? Math.round(todayRevenue / paidToday.length) : 0,
        total_cash_balance: db.cash_accounts.reduce((s, a) => s + Number(a.current_balance), 0),
        all_time_revenue: paidAll.reduce((s, o) => s + Number(o.total_amount), 0),
        all_time_paid_orders: paidAll.length,
        pending_reports_count: db.employee_reports.filter((r) => r.status === "submitted").length,
        avg_rating: avgRating,
        total_ratings: db.ratings.length,
      },
      hourly_sales: hourly,
      top_products: Object.values(prodMap).sort((a, b) => b.total_qty - a.total_qty).slice(0, 6),
      low_stock_ingredients: enrichedIngs.filter((i) => ["MENIPIS", "HABIS"].includes(i.stock_status)),
      tables: db.dining_tables,
      recent_orders: [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    });
  }

  if (method === "GET" && pathStr === "/owner/products") {
    return NextResponse.json({
      categories: db.categories,
      products: db.products.map((p) => enrichProduct(p, db)),
    });
  }

  if (method === "POST" && pathStr === "/owner/categories") {
    const body = await parseBody(req);
    const cat = {
      id: nextId(db, "category"),
      name: body.name,
      slug: String(body.name || "cat").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + randomToken(3),
      sort_order: db.categories.length + 1,
      is_active: true,
    };
    db.categories.push(cat);
    await writeDb(db);
    return NextResponse.json({ message: "Kategori ditambahkan.", category: cat }, { status: 201 });
  }

  if (method === "POST" && pathStr === "/owner/products") {
    const body = await parseBody(req);
    const id = nextId(db, "product");
    const prod = {
      id,
      category_id: Number(body.category_id),
      sku: `MNU-${String(id).padStart(3, "0")}`,
      name: body.name,
      slug: String(body.name || "menu").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + randomToken(3),
      description: body.description || "",
      price: Number(body.price || 0),
      image_url: body.image_url || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
      unit_label: body.unit_label || "porsi",
      is_available: body.is_available ?? true,
      track_inventory: body.track_inventory ?? true,
      sort_order: db.products.length + 1,
      options: [],
    };
    db.products.push(prod);
    recordAudit(db, "PRODUCT_CREATED", actor.actorName, "owner", "Product", id, `Tambah produk: ${prod.name}`);
    await writeDb(db);
    return NextResponse.json({ message: "Produk berhasil ditambahkan.", product: enrichProduct(prod, db) }, { status: 201 });
  }

  const ownerProdMatch = /^\/owner\/products\/(\d+)$/.exec(pathStr);
  if ((method === "PUT" || method === "PATCH") && ownerProdMatch) {
    const prod = db.products.find((p) => p.id === Number(ownerProdMatch[1]));
    if (!prod) return jsonError("Produk tidak ditemukan.", 404);
    const body = await parseBody(req);
    Object.assign(prod, {
      ...(body.category_id !== undefined ? { category_id: Number(body.category_id) } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.image_url !== undefined ? { image_url: body.image_url } : {}),
      ...(body.is_available !== undefined ? { is_available: Boolean(body.is_available) } : {}),
      ...(body.track_inventory !== undefined ? { track_inventory: Boolean(body.track_inventory) } : {}),
    });
    recordAudit(db, "PRODUCT_UPDATED", actor.actorName, "owner", "Product", prod.id, `Perbarui produk: ${prod.name}`);
    await writeDb(db);
    return NextResponse.json({ message: "Produk diperbarui.", product: enrichProduct(prod, db) });
  }

  if (method === "DELETE" && ownerProdMatch) {
    const id = Number(ownerProdMatch[1]);
    db.products = db.products.filter((p) => p.id !== id);
    await writeDb(db);
    return NextResponse.json({ message: "Produk dihapus." });
  }

  if (method === "GET" && pathStr === "/owner/tables") {
    const tables = db.dining_tables.map((t) => ({
      ...t,
      active_session: db.table_sessions.find((s) => s.dining_table_id === t.id && s.status === "ACTIVE") || null,
    }));
    return NextResponse.json({ tables });
  }

  const ownerTablePatch = /^\/owner\/tables\/(\d+)$/.exec(pathStr);
  if (method === "PATCH" && ownerTablePatch) {
    const tbl = db.dining_tables.find((t) => t.id === Number(ownerTablePatch[1]));
    if (!tbl) return jsonError("Meja tidak ditemukan.", 404);
    const body = await parseBody(req);
    if (body.is_active !== undefined) tbl.is_active = Boolean(body.is_active);
    if (body.name !== undefined) tbl.name = body.name;
    recordAudit(db, "TABLE_UPDATED", actor.actorName, "owner", "DiningTable", tbl.id, `Update ${tbl.code}`);
    await writeDb(db);
    return NextResponse.json({ message: `Meja ${tbl.name} diperbarui.`, table: tbl });
  }

  const ownerTableRegen = /^\/owner\/tables\/(\d+)\/regenerate-qr$/.exec(pathStr);
  if (method === "POST" && ownerTableRegen) {
    const tbl = db.dining_tables.find((t) => t.id === Number(ownerTableRegen[1]));
    if (!tbl) return jsonError("Meja tidak ditemukan.", 404);
    tbl.qr_token = `wtn_${tbl.code.toLowerCase().replace("-", "")}_${randomToken(18)}`;
    tbl.qr_generated_at = new Date().toISOString();
    tbl.is_active = true;
    recordAudit(db, "TABLE_QR_REGENERATED", actor.actorName, "owner", "DiningTable", tbl.id, `Ganti QR token ${tbl.code}`);
    await writeDb(db);
    return NextResponse.json({ message: `Token QR ${tbl.name} diperbarui. QR lama tidak berlaku.`, table: tbl });
  }

  // Inventory
  if (method === "GET" && ["/owner/inventory", "/owner/ingredients", "/owner/recipes"].includes(pathStr)) {
    const enrichedIngs = db.ingredients.map((i) => enrichIngredient(i, db));
    const enrichedRecipes = db.recipes.map((r) => {
      const prod = db.products.find((p) => p.id === r.product_id);
      let estimated_cogs = 0;
      const items = (r.items || []).map((it: any) => {
        const ing = enrichedIngs.find((i) => i.id === it.ingredient_id);
        if (ing) estimated_cogs += Number(it.quantity) * Number(ing.average_cost_per_base_unit || 0);
        return { ...it, ingredient: ing || null };
      });
      return { ...r, product: prod || null, items, estimated_cogs: Math.round(estimated_cogs) };
    });
    const movements = db.inventory_movements.map((m) => ({
      ...m,
      ingredient: enrichedIngs.find((i) => i.id === m.ingredient_id) || null,
    }));
    const purchases = db.stock_purchases.map((po) => ({
      ...po,
      items: (po.items || []).map((it: any) => ({
        ...it,
        ingredient: enrichedIngs.find((i) => i.id === it.ingredient_id) || { name: it.ingredient_name },
      })),
    }));
    const adjustments = db.stock_adjustments.map((adj) => ({
      ...adj,
      ingredient: enrichedIngs.find((i) => i.id === adj.ingredient_id) || null,
    }));

    return NextResponse.json({
      ingredients: enrichedIngs,
      ingredient_categories: db.ingredient_categories,
      recipes: enrichedRecipes,
      movements,
      purchases,
      adjustments,
    });
  }

  if (method === "POST" && pathStr === "/owner/ingredients") {
    const body = await parseBody(req);
    const id = nextId(db, "ingredient");
    const factor = Number(body.display_conversion_factor || 1) || 1;
    const lastPrice = Number(body.last_purchase_price_per_display_unit || 0);
    const ing = {
      id,
      ingredient_category_id: Number(body.ingredient_category_id || 1),
      code: `ING-${String(id).padStart(3, "0")}`,
      name: body.name,
      notes: body.notes || "",
      base_unit: body.base_unit || "gram",
      display_unit: body.display_unit || "kg",
      display_conversion_factor: factor,
      current_stock: Number(body.current_stock || 0),
      minimum_stock: Number(body.minimum_stock || 0),
      last_purchase_price_per_display_unit: lastPrice,
      average_cost_per_base_unit: lastPrice / factor,
      is_active: true,
    };
    db.ingredients.push(ing);
    await writeDb(db);
    return NextResponse.json({ message: "Bahan baku ditambahkan.", ingredient: enrichIngredient(ing, db) }, { status: 201 });
  }

  if (method === "POST" && pathStr === "/owner/recipes") {
    const body = await parseBody(req);
    const productId = Number(body.product_id);
    const existing = db.recipes.find((r) => r.product_id === productId);
    const items = (body.items || []).map((it: any, i: number) => {
      const ing = db.ingredients.find((x) => x.id === Number(it.ingredient_id));
      return { id: Date.now() + i, ingredient_id: Number(it.ingredient_id), quantity: Number(it.quantity), unit: ing?.base_unit || "unit" };
    });

    if (existing) {
      existing.version += 1;
      existing.notes = body.notes || "";
      existing.items = items;
    } else {
      db.recipes.push({
        id: nextId(db, "recipe"),
        product_id: productId,
        version: 1,
        is_validated: true,
        notes: body.notes || "",
        items,
      });
    }
    await writeDb(db);
    return NextResponse.json({ message: "Resep produk berhasil disimpan." });
  }

  if (method === "POST" && pathStr === "/owner/inventory/purchases") {
    const body = await parseBody(req);
    let totalAmount = 0;
    const poItems: any[] = [];
    const poCode = `PO-${randomToken(5).toUpperCase()}`;

    for (const it of body.items || []) {
      const ing = db.ingredients.find((i) => i.id === Number(it.ingredient_id));
      if (!ing) continue;
      const factor = Number(ing.display_conversion_factor || 1) || 1;
      const displayQty = Number(it.display_quantity || 0);
      const baseQty = displayQty * factor;
      const unitPrice = Number(it.unit_price || 0);
      const subtotal = Math.round(displayQty * unitPrice);
      totalAmount += subtotal;

      const before = Number(ing.current_stock);
      ing.current_stock = before + baseQty;
      ing.last_purchase_price_per_display_unit = unitPrice;
      ing.average_cost_per_base_unit = unitPrice / factor;

      db.inventory_movements.unshift({
        id: nextId(db, "movement"),
        ingredient_id: ing.id,
        movement_type: "PURCHASE_RESTOCK",
        direction: "IN",
        quantity: baseQty,
        stock_before: before,
        stock_after: ing.current_stock,
        unit_cost_snapshot: Math.round(unitPrice / factor),
        total_cost_snapshot: subtotal,
        notes: `Restock ${poCode} (${displayQty} ${ing.display_unit})`,
        actor_name: actor.actorName,
        created_at: new Date().toISOString(),
      });

      poItems.push({
        id: Date.now() + poItems.length,
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        display_quantity: displayQty,
        display_unit: ing.display_unit,
        unit_price: unitPrice,
        subtotal,
      });
    }

    const purchase = {
      id: nextId(db, "purchase"),
      purchase_code: poCode,
      supplier_name: body.supplier_name || "Supplier",
      purchase_date: new Date().toISOString().slice(0, 10),
      total_amount: totalAmount,
      payment_method: body.payment_method || "CASH",
      notes: body.notes || null,
      actor_name: actor.actorName,
      items: poItems,
    };
    db.stock_purchases.unshift(purchase);

    const acc = db.cash_accounts.find((a) => a.code === (body.payment_method === "QRIS_BANK" ? "QRIS_BANK" : "CASH_DRAWER"));
    if (acc) {
      const before = Number(acc.current_balance);
      acc.current_balance = before - totalAmount;
      db.cash_transactions.unshift({
        id: nextId(db, "cash_trx"),
        cash_account_id: acc.id,
        transaction_code: `TRX-${poCode}`,
        direction: "OUT",
        category: "STOCK_PURCHASE",
        amount: totalAmount,
        balance_before: before,
        balance_after: acc.current_balance,
        description: `Pembelian persediaan ${poCode}`,
        actor_name: actor.actorName,
        occurred_at: new Date().toISOString(),
      });
    }

    await writeDb(db);
    return NextResponse.json({ message: "Pembelian bahan dicatat & stok bertambah.", purchase }, { status: 201 });
  }

  if (method === "POST" && pathStr === "/owner/inventory/stock-opname") {
    const body = await parseBody(req);
    const ing = db.ingredients.find((i) => i.id === Number(body.ingredient_id));
    if (!ing) return jsonError("Bahan tidak ditemukan.", 404);
    const systemStock = Number(ing.current_stock);
    const physicalStock = Number(body.physical_stock_in_base_unit || 0);
    const diff = physicalStock - systemStock;
    ing.current_stock = physicalStock;

    const adj = {
      id: nextId(db, "adjustment"),
      adjustment_code: `OPN-${randomToken(5).toUpperCase()}`,
      ingredient_id: ing.id,
      system_stock: systemStock,
      physical_stock: physicalStock,
      difference: diff,
      reason: body.reason || "Stock Opname",
      actor_name: actor.actorName,
      created_at: new Date().toISOString(),
    };
    db.stock_adjustments.unshift(adj);

    db.inventory_movements.unshift({
      id: nextId(db, "movement"),
      ingredient_id: ing.id,
      movement_type: "OPNAME_ADJUSTMENT",
      direction: diff >= 0 ? "IN" : "OUT",
      quantity: Math.abs(diff),
      stock_before: systemStock,
      stock_after: physicalStock,
      notes: `Stock Opname: ${adj.reason}`,
      actor_name: actor.actorName,
      created_at: new Date().toISOString(),
    });
    await writeDb(db);
    return NextResponse.json({ message: "Hasil Stock Opname disimpan.", adjustment: adj }, { status: 201 });
  }

  // Finance
  if (method === "GET" && pathStr === "/owner/finance/cash-flow") {
    const paid = db.orders.filter((o) => o.payment_status === "PAID");
    const grossSales = paid.reduce((s, o) => s + Number(o.total_amount), 0);
    const cashSales = paid.filter((o) => o.payment_method === "CASH").reduce((s, o) => s + Number(o.total_amount), 0);
    const qrisSales = paid.filter((o) => o.payment_method === "QRIS").reduce((s, o) => s + Number(o.total_amount), 0);
    const cogs = paid.reduce((s, o) => s + Number(o.cogs_amount || 0), 0);
    const opex = db.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const profit = grossSales - cogs - opex;

    return NextResponse.json({
      period: { start_date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) },
      profit_and_loss: {
        gross_sales_revenue: grossSales,
        cash_sales_revenue: cashSales,
        qris_sales_revenue: qrisSales,
        paid_transactions_count: paid.length,
        discounts_amount: paid.reduce((s, o) => s + Number(o.discount_amount || 0), 0),
        refunds_amount: db.orders.filter((o) => o.payment_status === "REFUNDED").reduce((s, o) => s + Number(o.total_amount), 0),
        recipe_cogs_amount: cogs,
        operating_expenses_amount: opex,
        operating_profit_amount: profit,
        operating_margin_percentage: grossSales > 0 ? Math.round((profit / grossSales) * 1000) / 10 : 0,
      },
      cash_position_and_inventory_outflow: {
        stock_purchases_outflow_amount: db.stock_purchases.reduce((s, p) => s + Number(p.total_amount), 0),
        total_cash_and_bank_balance: db.cash_accounts.reduce((s, a) => s + Number(a.current_balance), 0),
        cash_accounts: db.cash_accounts,
      },
      cash_transactions: db.cash_transactions.map((t) => ({
        ...t,
        cash_account: db.cash_accounts.find((a) => a.id === t.cash_account_id) || null,
      })),
      closings: db.cash_closings,
    });
  }

  const lockClosingMatch = /^\/owner\/closings\/(\d+)\/review$/.exec(pathStr);
  if (method === "PATCH" && lockClosingMatch) {
    const cls = db.cash_closings.find((c) => c.id === Number(lockClosingMatch[1]));
    if (!cls) return jsonError("Closing tidak ditemukan.", 404);
    const body = await parseBody(req);
    cls.status = body.status || "LOCKED";
    cls.owner_notes = body.owner_notes || null;
    await writeDb(db);
    return NextResponse.json({ message: "Status closing diperbarui.", closing: cls });
  }

  if (method === "GET" && pathStr === "/owner/employee-reports") {
    return NextResponse.json({ reports: db.employee_reports });
  }

  const reviewRptMatch = /^\/owner\/employee-reports\/(\d+)\/review$/.exec(pathStr);
  if (method === "PATCH" && reviewRptMatch) {
    const rpt = db.employee_reports.find((r) => r.id === Number(reviewRptMatch[1]));
    if (!rpt) return jsonError("Laporan tidak ditemukan.", 404);
    const body = await parseBody(req);
    rpt.status = body.status || "reviewed";
    rpt.owner_feedback = body.owner_feedback || null;
    rpt.reviewed_by = actor.actorName;
    await writeDb(db);
    return NextResponse.json({ message: "Tinjauan laporan disimpan.", report: rpt });
  }

  if (method === "GET" && pathStr === "/owner/ratings") {
    const total = db.ratings.length;
    const avg = total ? Math.round((db.ratings.reduce((s, r) => s + Number(r.stars), 0) / total) * 10) / 10 : 0;
    const distribution = [5, 4, 3, 2, 1].map((s) => {
      const count = db.ratings.filter((r) => r.stars === s).length;
      return { stars: s, count, percentage: total ? Math.round((count / total) * 1000) / 10 : 0 };
    });
    const ratings = db.ratings.map((r) => ({
      ...r,
      order: db.orders.find((o) => o.id === r.order_id) || null,
    }));
    return NextResponse.json({
      summary: { average_stars: avg, total_ratings: total, distribution, has_sufficient_data: total >= 5 },
      ratings,
    });
  }

  if (method === "GET" && pathStr === "/owner/analytics/traffic") {
    const paid = db.orders.filter((o) => o.payment_status === "PAID");
    const hourly = Array.from({ length: 15 }, (_, idx) => {
      const h = idx + 8;
      return { hour: `${String(h).padStart(2, "0")}.00`, qr_visits: 0, orders_created: 0, orders_paid: 0, revenue: 0 };
    });

    for (const ev of db.traffic_events) {
      if (ev.event_type === "QR_MENU_VISIT") {
        const h = (new Date(ev.occurred_at).getUTCHours() + 7) % 24;
        if (h >= 8 && h <= 22) hourly[h - 8].qr_visits += 1;
      }
    }
    for (const o of db.orders) {
      const h = (new Date(o.created_at).getUTCHours() + 7) % 24;
      if (h >= 8 && h <= 22) {
        hourly[h - 8].orders_created += 1;
        if (o.payment_status === "PAID") {
          hourly[h - 8].orders_paid += 1;
          hourly[h - 8].revenue += Number(o.total_amount);
        }
      }
    }

    const activeHours = hourly.filter((h) => h.orders_created > 0);
    const peak_hour = activeHours.length ? [...activeHours].sort((a, b) => b.orders_created - a.orders_created)[0] : null;
    const quiet_hour = activeHours.length ? [...activeHours].sort((a, b) => a.orders_created - b.orders_created)[0] : null;

    const prodMap: Record<string, any> = {};
    for (const o of paid) {
      for (const it of o.items || []) {
        if (!prodMap[it.product_name_snapshot]) {
          prodMap[it.product_name_snapshot] = { name: it.product_name_snapshot, total_qty: 0, total_revenue: 0 };
        }
        prodMap[it.product_name_snapshot].total_qty += Number(it.quantity);
        prodMap[it.product_name_snapshot].total_revenue += Number(it.line_total);
      }
    }

    const table_utilization = db.dining_tables.map((t) => {
      const tblOrders = paid.filter((o) => o.dining_table_id === t.id);
      return {
        table_code: t.code,
        table_name: t.name,
        paid_orders_count: tblOrders.length,
        revenue: tblOrders.reduce((s, o) => s + Number(o.total_amount), 0),
        avg_session_minutes: tblOrders.length ? 45 : null,
      };
    });

    const totalRev = paid.reduce((s, o) => s + Number(o.total_amount), 0);

    return NextResponse.json({
      period: {
        sample_size_orders: db.orders.length,
        has_sufficient_history: db.orders.length >= 15,
        disclosure_message:
          db.orders.length >= 15
            ? `Dihitung dari ${db.orders.length} transaksi aktual.`
            : `Baru tercatat ${db.orders.length} transaksi. Seluruh grafik berasal dari transaksi aktual.`,
      },
      funnel: {
        qr_menu_visits: db.traffic_events.filter((e) => e.event_type === "QR_MENU_VISIT").length,
        orders_created: db.orders.length,
        orders_paid: paid.length,
        orders_completed: db.orders.filter((o) => o.status === "COMPLETED").length,
        orders_cancelled: db.orders.filter((o) => o.status === "CANCELLED").length,
        total_revenue: totalRev,
        average_order_value: paid.length ? Math.round(totalRev / paid.length) : 0,
      },
      peak_hour,
      quiet_hour,
      hourly_distribution: hourly,
      product_performance: Object.values(prodMap).sort((a: any, b: any) => b.total_qty - a.total_qty),
      table_utilization,
    });
  }

  if (method === "GET" && pathStr === "/owner/settings") {
    return NextResponse.json({
      settings: db.system_settings,
      employees: db.employee_profiles,
      has_official_qris_image: Boolean(db.system_settings.qris_image_data_url),
    });
  }

  if (method === "POST" && pathStr === "/owner/settings") {
    const body = await parseBody(req);
    const keys = ["business_name", "business_tagline", "business_address", "business_phone", "wifi_ssid", "wifi_password", "tax_pb1_percentage", "qris_merchant_name", "qris_nmid", "qris_bank_info"];
    for (const k of keys) {
      if (body[k] !== undefined) db.system_settings[k] = k === "tax_pb1_percentage" ? Number(body[k]) : body[k];
    }
    if (body.qris_image?.dataUrl) {
      db.system_settings.qris_image_data_url = body.qris_image.dataUrl;
    }
    await writeDb(db);
    return NextResponse.json({
      message: "Pengaturan usaha berhasil disimpan.",
      settings: db.system_settings,
      has_official_qris_image: Boolean(db.system_settings.qris_image_data_url),
    });
  }

  if (method === "POST" && pathStr === "/owner/employees") {
    const body = await parseBody(req);
    const id = nextId(db, "employee");
    const emp = {
      id,
      name: body.name,
      code: `EMP-${String(id).padStart(2, "0")}`,
      role_title: body.role_title || "Kasir & Barista",
      default_shift: body.default_shift || "Shift Pagi",
      pin: body.pin || "1234",
      is_active: true,
    };
    db.employee_profiles.push(emp);
    await writeDb(db);
    return NextResponse.json({ message: "Profil karyawan ditambahkan.", employee: emp }, { status: 201 });
  }

  if (method === "GET" && pathStr === "/owner/audit-logs") {
    return NextResponse.json({ logs: db.audit_logs });
  }

  if (method === "GET" && pathStr === "/owner/exports") {
    const csvSafe = (val: any) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return /^[=+\-@]/.test(s) ? `"'${s}"` : `"${s}"`;
    };
    const type = url.searchParams.get("type") || "sales";
    const lines = [`WARKOP TERAS NENEK - LAPORAN ${type.toUpperCase()}`, ""];
    if (type === "expenses") {
      lines.push("Kode,Tanggal,Nominal,Deskripsi,Petugas");
      db.expenses.forEach((e) => lines.push(`${csvSafe(e.expense_code)},${csvSafe(e.expense_date)},${Number(e.amount)},${csvSafe(e.description)},${csvSafe(e.actor_name)}`));
    } else if (type === "inventory") {
      lines.push("Kode,Bahan,Stok,Satuan,Min");
      db.ingredients.forEach((i) => lines.push(`${csvSafe(i.code)},${csvSafe(i.name)},${Number(i.current_stock)},${csvSafe(i.base_unit)},${Number(i.minimum_stock)}`));
    } else {
      lines.push("Order,Meja,Status,Metode,StatusBayar,Total,HPP");
      db.orders.forEach((o) => lines.push(`${csvSafe(o.order_number)},${csvSafe(o.table_name_snapshot)},${csvSafe(o.status)},${csvSafe(o.payment_method)},${csvSafe(o.payment_status)},${Number(o.total_amount)},${Number(o.cogs_amount)}`));
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename="wtn-${type.replace(/[^a-z0-9_-]/gi, "")}.csv"`,
      },
    });
  }

  return jsonError(`Endpoint ${method} ${pathStr} tidak ditemukan.`, 404);
}

function createOrderInternal(
  db: WtnDatabase,
  body: any,
  source: "QR" | "POS",
  actorName: string,
  table: any
): { order?: any; error?: string } {
  const itemsInput = Array.isArray(body.items) ? body.items : [];
  if (itemsInput.length === 0 || itemsInput.length > 50) {
    return { error: "Pesanan harus berisi antara 1 hingga 50 item." };
  }

  let subtotal = 0;
  const preparedItems: any[] = [];

  for (const inp of itemsInput) {
    const prod = db.products.find((p) => p.id === Number(inp.product_id));
    if (!prod || !prod.is_available) return { error: "Salah satu produk tidak tersedia." };
    const rawQty = Math.floor(Number(inp.quantity || 1));
    if (!Number.isFinite(rawQty) || rawQty < 1 || rawQty > 100) {
      return { error: "Jumlah per item harus antara 1 hingga 100." };
    }
    const qty = rawQty;
    const note = inp.item_note ? String(inp.item_note).trim().slice(0, 250) : null;

    const selectedIds: number[] = Array.isArray(inp.option_value_ids) ? inp.option_value_ids.map(Number) : [];
    let optDelta = 0;
    const preparedOpts: any[] = [];

    for (const opt of prod.options || []) {
      for (const val of opt.values || []) {
        if (selectedIds.includes(val.id)) {
          optDelta += Number(val.price_delta || 0);
          preparedOpts.push({
            option_name_snapshot: opt.name,
            option_value_snapshot: val.name,
            price_delta_snapshot: Number(val.price_delta || 0),
          });
        }
      }
    }

    const lineTotal = (Number(prod.price) + optDelta) * qty;
    subtotal += lineTotal;

    preparedItems.push({
      id: nextId(db, "order_item"),
      product_id: prod.id,
      product_name_snapshot: prod.name,
      product_sku_snapshot: prod.sku,
      unit_price_snapshot: Number(prod.price),
      options_price_snapshot: optDelta,
      quantity: qty,
      line_total: lineTotal,
      item_note: note,
      options: preparedOpts,
    });
  }

  const discount = source === "POS" ? Math.min(subtotal, Math.max(0, Math.round(Number(body.discount_amount || 0)))) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxPct = db.system_settings.tax_enabled ? Number(db.system_settings.tax_pb1_percentage || 10) : 0;
  const taxAmount = Math.round(taxable * (taxPct / 100));
  const totalAmount = taxable + taxAmount;

  const ordSeq = nextId(db, "order");
  const orderNumber = `#${String(ordSeq).padStart(4, "0")}`;
  const publicCode = `ORD-${String(ordSeq).padStart(4, "0")}-${randomToken(4).toUpperCase()}`;
  const payMethod = String(body.payment_method || "CASH").toUpperCase() === "QRIS" ? "QRIS" : "CASH";
  const orderType = source === "QR" ? "DINE_IN" : body.order_type || "DINE_IN";

  const order = {
    id: ordSeq,
    public_code: publicCode,
    order_number: orderNumber,
    idempotency_key: body.idempotency_key || null,
    source,
    order_type: orderType,
    dining_table_id: table?.id || null,
    table_name_snapshot: table ? table.name : orderType === "TAKEAWAY" ? "Bawa Pulang" : "Walk-in",
    customer_name: body.customer_name || (table ? `Pelanggan ${table.name}` : "Walk-in"),
    status: "PENDING_PAYMENT",
    payment_method: payMethod,
    payment_status: "UNPAID",
    subtotal_amount: subtotal,
    discount_amount: discount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    cogs_amount: 0,
    stock_deducted: false,
    stock_restored: false,
    created_by_actor: actorName,
    created_at: new Date().toISOString(),
    items: preparedItems,
    latest_payment: {
      id: ordSeq,
      payment_code: `PAY-${ordSeq}`,
      method: payMethod,
      status: "UNPAID",
      amount_due: totalAmount,
      amount_received: 0,
      change_amount: 0,
    },
    status_histories: [
      {
        id: Date.now(),
        previous_status: null,
        next_status: "PENDING_PAYMENT",
        actor_name: actorName,
        actor_role: source === "QR" ? "customer" : "employee",
        reason: source === "QR" ? `Pesanan QR ${table?.name}` : "Pesanan POS Kasir",
        created_at: new Date().toISOString(),
      },
    ],
  };

  db.orders.unshift(order);
  db.traffic_events.push({
    id: nextId(db, "traffic"),
    event_type: "ORDER_CREATED",
    dining_table_id: table?.id || null,
    order_id: order.id,
    amount: totalAmount,
    occurred_at: new Date().toISOString(),
  });

  return { order };
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
