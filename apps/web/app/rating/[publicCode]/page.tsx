"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RatingRedirectPage() {
  const params = useParams<{ publicCode: string }>();
  const router = useRouter();
  const publicCode = params?.publicCode || "";

  useEffect(() => {
    if (publicCode) {
      router.replace(`/order/${encodeURIComponent(publicCode)}#rating`);
    }
  }, [publicCode, router]);

  return (
    <div className="min-h-screen bg-canvas-cream flex items-center justify-center p-6 text-sm text-text-muted">
      Membuka halaman ulasan pesanan...
    </div>
  );
}
