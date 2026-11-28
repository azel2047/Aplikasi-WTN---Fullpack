"use client";

import React, { useEffect, useState } from "react";
import { Coffee } from "lucide-react";

interface BrandingInfo {
  business_name: string;
  business_tagline: string;
  has_custom_logo: boolean;
  logo_updated_at: string | null;
}

let cachedBranding: BrandingInfo | null = null;
let inflightPromise: Promise<BrandingInfo | null> | null = null;

async function fetchBranding(force = false): Promise<BrandingInfo | null> {
  if (!force && cachedBranding) return cachedBranding;
  if (!force && inflightPromise) return inflightPromise;
  inflightPromise = fetch("/api/v1/public/branding", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) cachedBranding = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflightPromise = null;
    });
  return inflightPromise;
}

export function notifyBrandingUpdated() {
  cachedBranding = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wtn-branding-updated"));
  }
}

export function useBranding() {
  const [branding, setBranding] = useState<BrandingInfo>(
    cachedBranding || {
      business_name: "Warkop Teras Nenek",
      business_tagline: "Kopi Tubruk & Masakan Hangat",
      has_custom_logo: false,
      logo_updated_at: null,
    }
  );

  useEffect(() => {
    let active = true;
    fetchBranding().then((data) => {
      if (active && data) setBranding(data);
    });
    const onUpdated = () => {
      fetchBranding(true).then((data) => {
        if (active && data) setBranding(data);
      });
    };
    window.addEventListener("wtn-branding-updated", onUpdated);
    return () => {
      active = false;
      window.removeEventListener("wtn-branding-updated", onUpdated);
    };
  }, []);

  return branding;
}

export function BrandLogo({
  className = "w-9 h-9 rounded-xl",
  iconClassName = "w-5 h-5",
  fallbackBgClass = "bg-primary-container text-on-primary",
}: {
  className?: string;
  iconClassName?: string;
  fallbackBgClass?: string;
}) {
  const branding = useBranding();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [branding.logo_updated_at, branding.has_custom_logo]);

  if (branding.has_custom_logo && !imgError) {
    const src = branding.logo_updated_at
      ? `/api/v1/public/logo?v=${encodeURIComponent(branding.logo_updated_at)}`
      : "/api/v1/public/logo";
    return (
      <div
        className={`${className} overflow-hidden bg-white border border-border-sand flex items-center justify-center shrink-0`}
      >
        <img
          src={src}
          alt={branding.business_name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} ${fallbackBgClass} flex items-center justify-center shrink-0`}
    >
      <Coffee className={iconClassName} />
    </div>
  );
}
