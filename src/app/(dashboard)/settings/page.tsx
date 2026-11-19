"use client";

import * as React from "react";
import Image from "next/image";
import {
  Building2,
  Landmark,
  FileText,
  Upload,
  Loader2,
  ShieldCheck,
  QrCode,
  ImageIcon,
  Save,
  PenTool,
  Stamp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangeSharedPasswordForm } from "@/components/auth/change-shared-password-form";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { BusinessProfile } from "@/types/database.types";

const defaultProfile: Omit<BusinessProfile, "created_at" | "updated_at"> = {
  id: "00000000-0000-0000-0000-000000000001",
  business_name: "ABIRA Enterprises",
  address: "ABIRA Enterprises, Millenia 2, Sector 37D, Gurugram, Haryana – 122001",
  city: "Gurugram",
  state: "Haryana",
  pincode: "122001",
  phone: "8882511472",
  email: "",
  pan: "",
  bank_account_name: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  upi_id: "",
  logo_url: "",
  payment_qr_url: "",
  signature_url: "",
  stamp_url: "",
  default_terms: `Payment Terms:
Payment should be initiated within 15 days of delivery.

Delivery Policy:
Products are generally delivered within 3 days of ordering.

Return and Exchange Policy:
No returns or exchanges are accepted after delivery, except in cases involving defective or damaged products.`,
};

export default function SettingsPage() {
  const [profile, setProfile] = React.useState(defaultProfile);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingQR, setUploadingQR] = React.useState(false);
  const [uploadingSignature, setUploadingSignature] = React.useState(false);
  const [uploadingStamp, setUploadingStamp] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = React.useState("");
  const [signaturePreviewUrl, setSignaturePreviewUrl] = React.useState("");
  const [stampPreviewUrl, setStampPreviewUrl] = React.useState("");
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  React.useEffect(() => {
    let active = true;

    // Immediate hydration from localStorage so settings are NEVER lost on refresh
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem("abira_business_profile") : null;
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<BusinessProfile>;
        setProfile((prev) => ({
          ...prev,
          ...parsed,
        }));
        if (parsed.logo_url) setLogoPreviewUrl(parsed.logo_url);
        if (parsed.payment_qr_url) setQrPreviewUrl(parsed.payment_qr_url);
        if (parsed.signature_url) setSignaturePreviewUrl(parsed.signature_url);
        if (parsed.stamp_url) setStampPreviewUrl(parsed.stamp_url);
        setProfileLoaded(true);
        setLoading(false);
      }
    } catch {
      // Ignore localStorage errors
    }

    async function loadProfile() {
      try {
        let cachedParsed: Partial<BusinessProfile> = {};
        try {
          const cached = typeof window !== "undefined" ? localStorage.getItem("abira_business_profile") : null;
          if (cached) cachedParsed = JSON.parse(cached);
        } catch {}

        const bp = await apiRequest<BusinessProfile>("/api/data/business-profile");
        if (!active) return;
        const merged = {
          ...defaultProfile,
          ...cachedParsed,
          ...bp,
          email: bp.email ?? cachedParsed.email ?? "",
          pan: bp.pan ?? cachedParsed.pan ?? "",
          bank_account_name: bp.bank_account_name ?? cachedParsed.bank_account_name ?? "",
          bank_name: bp.bank_name ?? cachedParsed.bank_name ?? "",
          account_number: bp.account_number ?? cachedParsed.account_number ?? "",
          ifsc: bp.ifsc ?? cachedParsed.ifsc ?? "",
          upi_id: bp.upi_id ?? cachedParsed.upi_id ?? "",
          logo_url: bp.logo_url || cachedParsed.logo_url || "",
          payment_qr_url: bp.payment_qr_url || cachedParsed.payment_qr_url || "",
          signature_url: bp.signature_url || cachedParsed.signature_url || "",
          stamp_url: bp.stamp_url || cachedParsed.stamp_url || "",
          default_terms: bp.default_terms || cachedParsed.default_terms || defaultProfile.default_terms,
        };
        setProfile(merged);
        setLogoPreviewUrl(merged.logo_url || "");
        setQrPreviewUrl(merged.payment_qr_url || "");
        setSignaturePreviewUrl(merged.signature_url || "");
        setStampPreviewUrl(merged.stamp_url || "");
        setProfileLoaded(true);

        try {
          localStorage.setItem("abira_business_profile", JSON.stringify(merged));
        } catch {
          // Ignore localStorage errors
        }
      } catch (err) {
        if (active) {
          const hasCached = typeof window !== "undefined" && Boolean(localStorage.getItem("abira_business_profile"));
          if (!hasCached) {
            setMessage({
              text: err instanceof Error ? `Business settings could not be loaded: ${err.message}` : "Business settings could not be loaded.",
              type: "error",
            });
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "qr" | "signature" | "stamp"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const setUploading =
      type === "logo"
        ? setUploadingLogo
        : type === "qr"
        ? setUploadingQR
        : type === "signature"
        ? setUploadingSignature
        : setUploadingStamp;

    try {
      setUploading(true);
      setMessage(null);
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("Choose a PNG, JPEG, or WebP image.");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image files must be 2 MiB or smaller.");
      }

      // Convert to Base64 Data URL immediately for 100% offline and instant persistence
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let updatedKey = "";
      if (type === "logo") {
        setProfile((prev) => ({ ...prev, logo_url: dataUrl }));
        setLogoPreviewUrl(dataUrl);
        updatedKey = "logo_url";
      } else if (type === "qr") {
        setProfile((prev) => ({ ...prev, payment_qr_url: dataUrl }));
        setQrPreviewUrl(dataUrl);
        updatedKey = "payment_qr_url";
      } else if (type === "signature") {
        setProfile((prev) => ({ ...prev, signature_url: dataUrl }));
        setSignaturePreviewUrl(dataUrl);
        updatedKey = "signature_url";
      } else if (type === "stamp") {
        setProfile((prev) => ({ ...prev, stamp_url: dataUrl }));
        setStampPreviewUrl(dataUrl);
        updatedKey = "stamp_url";
      }

      // Save to localStorage immediately
      const currentCached = typeof window !== "undefined" ? localStorage.getItem("abira_business_profile") : null;
      const parsedCached = currentCached ? JSON.parse(currentCached) : { ...profile };
      const updatedProfile = { ...parsedCached, [updatedKey]: dataUrl };
      try {
        localStorage.setItem("abira_business_profile", JSON.stringify(updatedProfile));
      } catch {}

      // Background sync to server API
      try {
        await apiRequest("/api/data/business-profile", {
          method: "PUT",
          body: jsonBody(updatedProfile),
        });
      } catch (err) {
        console.warn("Background server sync notice for uploaded asset:", err);
      }

      const labelMap = {
        logo: "Company Logo",
        qr: "Payment QR code",
        signature: "Authorized Signature",
        stamp: "Company Stamp / Seal",
      };

      setMessage({
        text: `${labelMap[type]} saved successfully!`,
        type: "success",
      });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : `Could not upload ${type}.`,
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileLoaded) {
      setMessage({ text: "Business settings are unavailable. Reload the page before saving.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        business_name: profile.business_name.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        state: profile.state.trim(),
        pincode: profile.pincode.trim(),
        phone: profile.phone.trim(),
        email: profile.email?.trim() || null,
        pan: profile.pan?.trim() ? profile.pan.trim().toUpperCase() : null,
        bank_account_name: profile.bank_account_name?.trim() || null,
        bank_name: profile.bank_name?.trim() || null,
        account_number: profile.account_number?.trim() || null,
        ifsc: profile.ifsc?.trim() ? profile.ifsc.trim().toUpperCase() : null,
        upi_id: profile.upi_id?.trim() || null,
        logo_url: profile.logo_url || null,
        payment_qr_url: profile.payment_qr_url || null,
        signature_url: profile.signature_url || null,
        stamp_url: profile.stamp_url || null,
        default_terms: profile.default_terms?.trim() || null,
      };

      const mergedPayload = { ...profile, ...payload };
      try {
        localStorage.setItem("abira_business_profile", JSON.stringify(mergedPayload));
      } catch {}

      const savedProfile = await apiRequest<BusinessProfile>("/api/data/business-profile", {
        method: "PUT",
        body: jsonBody(payload),
      });
      const finalMerged = { ...savedProfile, ...payload };
      setProfile(finalMerged);
      try {
        localStorage.setItem("abira_business_profile", JSON.stringify(finalMerged));
      } catch {}

      setMessage({
        text: "Business settings and bank credentials updated successfully.",
        type: "success",
      });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? `Business settings could not be saved: ${err.message}` : "Business settings could not be saved.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span>Loading business settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Profile & Invoicing Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Preconfigured profile for ABIRA Enterprises. Configure banking, UPI, company branding, and invoice terms.
          </p>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-start gap-3 text-xs text-slate-800">
        <ShieldCheck className="h-5 w-5 text-[#0b1f3a] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">
            Strict Invoice Title Policy: &quot;INVOICE&quot;
          </p>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            In strict compliance with business guidelines, all generated billing documents display solely <strong>INVOICE</strong>. Headings such as &quot;Commercial Invoice&quot;, &quot;Non-GST Invoice&quot;, or &quot;GST Tax Invoice&quot; are strictly disallowed. Unverified tax assumptions are not applied.
          </p>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline ml-2 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Identification */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#0b1f3a]" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Company Details & Location
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Primary entity identity printed on invoice headers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  required
                  value={profile.business_name}
                  onChange={(e) =>
                    setProfile({ ...profile, business_name: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Official Business Address *</Label>
              <Textarea
                id="address"
                required
                rows={2}
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  value={profile.state}
                  onChange={(e) =>
                    setProfile({ ...profile, state: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode">PIN Code *</Label>
                <Input
                  id="pincode"
                  required
                  value={profile.pincode}
                  onChange={(e) =>
                    setProfile({ ...profile, pincode: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="To be added later"
                  value={profile.email || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pan">Permanent Account Number (PAN)</Label>
                <Input
                  id="pan"
                  placeholder="To be added later (e.g. AAAAA0000A)"
                  value={profile.pan || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, pan: e.target.value })
                  }
                  className="text-xs font-mono uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Banking & Settlement Details */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-[#0b1f3a]" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Settlement & Bank Details
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Account details rendered on invoices for B2B bank transfers and payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank_account_name">Bank Account Name</Label>
                <Input
                  id="bank_account_name"
                  placeholder="e.g. ABIRA Enterprises"
                  value={profile.bank_account_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bank_account_name: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="e.g. HDFC Bank / ICICI Bank"
                  value={profile.bank_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bank_name: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  placeholder="e.g. 50200012345678"
                  value={profile.account_number || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, account_number: e.target.value })
                  }
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  placeholder="e.g. HDFC0001234"
                  value={profile.ifsc || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, ifsc: e.target.value })
                  }
                  className="text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="upi_id">UPI ID / VPA</Label>
                <Input
                  id="upi_id"
                  placeholder="e.g. abiraenterprises@hdfcbank"
                  value={profile.upi_id || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, upi_id: e.target.value })
                  }
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Branding & Official Verification Assets */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[#0b1f3a]" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Visual Assets (Logo, QR Code, Stamp & Signature)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Upload company branding and authorized verification assets used on your generated invoice PDFs. Background-less (transparent PNG) images work best for stamps and signatures.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="block">Company Logo</Label>
                <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[140px]">
                  {logoPreviewUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="relative h-16 w-32 border border-slate-200 rounded bg-white p-1">
                        <Image
                          src={logoPreviewUrl}
                          alt="Logo Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...profile, logo_url: "" };
                          setProfile(updated);
                          setLogoPreviewUrl("");
                          try {
                            localStorage.setItem("abira_business_profile", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">
                        PNG, JPEG, or WebP (Recommended: 300x100px)
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "logo")}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment QR Upload */}
              <div className="space-y-2">
                <Label className="block">Payment QR Code</Label>
                <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[140px]">
                  {qrPreviewUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="relative h-20 w-20 border border-slate-200 rounded bg-white p-1">
                        <Image
                          src={qrPreviewUrl}
                          alt="QR Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...profile, payment_qr_url: "" };
                          setProfile(updated);
                          setQrPreviewUrl("");
                          try {
                            localStorage.setItem("abira_business_profile", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove QR Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <QrCode className="h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">
                        Square QR image for UPI / Instant Pay
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingQR ? "Uploading..." : "Upload QR Code"}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "qr")}
                        disabled={uploadingQR}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Company Stamp / Seal Upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Stamp className="h-3.5 w-3.5 text-[#0b1f3a]" />
                  <Label className="block">Company Stamp / Seal</Label>
                </div>
                <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[140px]">
                  {stampPreviewUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="relative h-20 w-20 border border-slate-200 rounded bg-white p-1 shadow-inner">
                        <Image
                          src={stampPreviewUrl}
                          alt="Stamp Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...profile, stamp_url: "" };
                          setProfile(updated);
                          setStampPreviewUrl("");
                          try {
                            localStorage.setItem("abira_business_profile", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove Stamp
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <Stamp className="h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">
                        Transparent / background-less PNG recommended
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingStamp ? "Uploading..." : "Upload Stamp"}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "stamp")}
                        disabled={uploadingStamp}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Authorized Signature Upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-[#0b1f3a]" />
                  <Label className="block">Authorized Signature</Label>
                </div>
                <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[140px]">
                  {signaturePreviewUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="relative h-16 w-32 border border-slate-200 rounded bg-white p-1 shadow-inner">
                        <Image
                          src={signaturePreviewUrl}
                          alt="Signature Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...profile, signature_url: "" };
                          setProfile(updated);
                          setSignaturePreviewUrl("");
                          try {
                            localStorage.setItem("abira_business_profile", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <PenTool className="h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">
                        Transparent / background-less PNG recommended
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingSignature ? "Uploading..." : "Upload Signature"}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "signature")}
                        disabled={uploadingSignature}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Default Terms & Conditions */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0b1f3a]" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Default Invoice Terms & Conditions
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Standard clauses automatically appended to every generated invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Textarea
              rows={4}
              value={profile.default_terms || ""}
              onChange={(e) =>
                setProfile({ ...profile, default_terms: e.target.value })
              }
              placeholder="Enter standard business terms..."
              className="text-xs font-mono leading-relaxed"
            />
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving || !profileLoaded}
            className="bg-[#0b1f3a] hover:bg-[#132c50] text-white gap-2 px-6"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Business Settings</span>
              </>
            )}
          </Button>
        </div>
      </form>
      <ChangeSharedPasswordForm />
    </div>
  );
}
