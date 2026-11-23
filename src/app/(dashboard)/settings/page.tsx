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
  FolderCheck,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangeSharedPasswordForm } from "@/components/auth/change-shared-password-form";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { HARDCODED_BUSINESS_PROFILE } from "@/lib/constants/business-defaults";
import type { BusinessProfile } from "@/types/database.types";

const defaultProfile: Omit<BusinessProfile, "created_at" | "updated_at"> = {
  ...HARDCODED_BUSINESS_PROFILE,
  email: HARDCODED_BUSINESS_PROFILE.email || "",
  pan: HARDCODED_BUSINESS_PROFILE.pan || "",
  bank_account_name: HARDCODED_BUSINESS_PROFILE.bank_account_name || "",
  bank_name: HARDCODED_BUSINESS_PROFILE.bank_name || "",
  account_number: HARDCODED_BUSINESS_PROFILE.account_number || "",
  ifsc: HARDCODED_BUSINESS_PROFILE.ifsc || "",
  upi_id: HARDCODED_BUSINESS_PROFILE.upi_id || "",
  account1_label: HARDCODED_BUSINESS_PROFILE.account1_label || "Account 1 (Primary - UP Gramin Bank)",
  account2_label: HARDCODED_BUSINESS_PROFILE.account2_label || "Account 2 (Secondary)",
  account2_bank_name: HARDCODED_BUSINESS_PROFILE.account2_bank_name || "",
  account2_account_number: HARDCODED_BUSINESS_PROFILE.account2_account_number || "",
  account2_ifsc: HARDCODED_BUSINESS_PROFILE.account2_ifsc || "",
  account2_bank_account_name: HARDCODED_BUSINESS_PROFILE.account2_bank_account_name || "",
  account2_upi_id: HARDCODED_BUSINESS_PROFILE.account2_upi_id || "",
  account2_payment_qr_url: HARDCODED_BUSINESS_PROFILE.account2_payment_qr_url || "",
  default_payment_account: (HARDCODED_BUSINESS_PROFILE.default_payment_account as any) || "account1",
  logo_url: HARDCODED_BUSINESS_PROFILE.logo_url || "",
  payment_qr_url: HARDCODED_BUSINESS_PROFILE.payment_qr_url || "",
  signature_url: HARDCODED_BUSINESS_PROFILE.signature_url || "",
  stamp_url: HARDCODED_BUSINESS_PROFILE.stamp_url || "",
};

export default function SettingsPage() {
  const [profile, setProfile] = React.useState(defaultProfile);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingQR, setUploadingQR] = React.useState(false);
  const [uploadingAccount2QR, setUploadingAccount2QR] = React.useState(false);
  const [uploadingSignature, setUploadingSignature] = React.useState(false);
  const [uploadingStamp, setUploadingStamp] = React.useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = React.useState("");
  const [account2QrPreviewUrl, setAccount2QrPreviewUrl] = React.useState("");
  const [signaturePreviewUrl, setSignaturePreviewUrl] = React.useState("");
  const [stampPreviewUrl, setStampPreviewUrl] = React.useState("");
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [driveStatus, setDriveStatus] = React.useState<{
    configured: boolean;
    folderUrl: string | null;
    clientEmail: string | null;
  } | null>(null);

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
        if (parsed.account2_payment_qr_url) setAccount2QrPreviewUrl(parsed.account2_payment_qr_url);
        if (parsed.signature_url) setSignaturePreviewUrl(parsed.signature_url);
        if (parsed.stamp_url) setStampPreviewUrl(parsed.stamp_url);
        setProfileLoaded(true);
        setLoading(false);
      }
    } catch {
      // Ignore localStorage errors
    }

    async function loadDriveStatus() {
      try {
        const res = await apiRequest<{
          configured: boolean;
          folderUrl: string | null;
          clientEmail: string | null;
        }>("/api/drive/status");
        if (active) setDriveStatus(res);
      } catch (e) {
        console.warn("Drive status load notice:", e);
      }
    }
    void loadDriveStatus();

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
          business_name: bp.business_name || defaultProfile.business_name,
          address: bp.address || defaultProfile.address,
          city: bp.city || defaultProfile.city,
          state: bp.state || defaultProfile.state,
          pincode: bp.pincode || defaultProfile.pincode,
          phone: bp.phone || defaultProfile.phone,
          email: bp.email || cachedParsed.email || defaultProfile.email,
          pan: bp.pan || cachedParsed.pan || defaultProfile.pan,
          bank_account_name: bp.bank_account_name || cachedParsed.bank_account_name || defaultProfile.bank_account_name,
          bank_name: bp.bank_name || cachedParsed.bank_name || defaultProfile.bank_name,
          account_number: bp.account_number || cachedParsed.account_number || defaultProfile.account_number,
          ifsc: bp.ifsc || cachedParsed.ifsc || defaultProfile.ifsc,
          upi_id: bp.upi_id || cachedParsed.upi_id || defaultProfile.upi_id,
          account1_label: bp.account1_label || cachedParsed.account1_label || defaultProfile.account1_label,
          account2_label: bp.account2_label || cachedParsed.account2_label || defaultProfile.account2_label,
          account2_bank_name: bp.account2_bank_name ?? cachedParsed.account2_bank_name ?? defaultProfile.account2_bank_name,
          account2_account_number: bp.account2_account_number ?? cachedParsed.account2_account_number ?? defaultProfile.account2_account_number,
          account2_ifsc: bp.account2_ifsc ?? cachedParsed.account2_ifsc ?? defaultProfile.account2_ifsc,
          account2_bank_account_name: bp.account2_bank_account_name ?? cachedParsed.account2_bank_account_name ?? defaultProfile.account2_bank_account_name,
          account2_upi_id: bp.account2_upi_id ?? cachedParsed.account2_upi_id ?? defaultProfile.account2_upi_id,
          account2_payment_qr_url: bp.account2_payment_qr_url || cachedParsed.account2_payment_qr_url || defaultProfile.account2_payment_qr_url,
          default_payment_account: bp.default_payment_account || cachedParsed.default_payment_account || defaultProfile.default_payment_account,
          logo_url: bp.logo_url || cachedParsed.logo_url || defaultProfile.logo_url,
          payment_qr_url: bp.payment_qr_url || cachedParsed.payment_qr_url || defaultProfile.payment_qr_url,
          signature_url: bp.signature_url || cachedParsed.signature_url || defaultProfile.signature_url,
          stamp_url: bp.stamp_url || cachedParsed.stamp_url || defaultProfile.stamp_url,
          default_terms: bp.default_terms || cachedParsed.default_terms || defaultProfile.default_terms,
        };
        setProfile(merged);
        setLogoPreviewUrl(merged.logo_url || "");
        setQrPreviewUrl(merged.payment_qr_url || "");
        setAccount2QrPreviewUrl(merged.account2_payment_qr_url || "");
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
    type: "logo" | "qr" | "account2_qr" | "signature" | "stamp"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const setUploading =
      type === "logo"
        ? setUploadingLogo
        : type === "qr"
        ? setUploadingQR
        : type === "account2_qr"
        ? setUploadingAccount2QR
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
      } else if (type === "account2_qr") {
        setProfile((prev) => ({ ...prev, account2_payment_qr_url: dataUrl }));
        setAccount2QrPreviewUrl(dataUrl);
        updatedKey = "account2_payment_qr_url";
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
        qr: "Account 1 Payment QR code",
        account2_qr: "Account 2 Payment QR code",
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
        business_name: profile.business_name.trim() || HARDCODED_BUSINESS_PROFILE.business_name,
        address: profile.address.trim() || HARDCODED_BUSINESS_PROFILE.address,
        city: profile.city.trim() || HARDCODED_BUSINESS_PROFILE.city,
        state: profile.state.trim() || HARDCODED_BUSINESS_PROFILE.state,
        pincode: profile.pincode.trim() || HARDCODED_BUSINESS_PROFILE.pincode,
        phone: profile.phone.trim() || HARDCODED_BUSINESS_PROFILE.phone,
        email: profile.email?.trim() || HARDCODED_BUSINESS_PROFILE.email || null,
        pan: profile.pan?.trim() ? profile.pan.trim().toUpperCase() : (HARDCODED_BUSINESS_PROFILE.pan || null),
        bank_account_name: profile.bank_account_name?.trim() || HARDCODED_BUSINESS_PROFILE.bank_account_name || null,
        bank_name: profile.bank_name?.trim() || HARDCODED_BUSINESS_PROFILE.bank_name || null,
        account_number: profile.account_number?.trim() || HARDCODED_BUSINESS_PROFILE.account_number || null,
        ifsc: profile.ifsc?.trim() ? profile.ifsc.trim().toUpperCase() : (HARDCODED_BUSINESS_PROFILE.ifsc || null),
        upi_id: profile.upi_id?.trim() || HARDCODED_BUSINESS_PROFILE.upi_id || null,
        account1_label: profile.account1_label?.trim() || HARDCODED_BUSINESS_PROFILE.account1_label || "Account 1 (Primary - UP Gramin Bank)",
        account2_label: profile.account2_label?.trim() || HARDCODED_BUSINESS_PROFILE.account2_label || "Account 2 (Secondary)",
        account2_bank_name: profile.account2_bank_name?.trim() || null,
        account2_account_number: profile.account2_account_number?.trim() || null,
        account2_ifsc: profile.account2_ifsc?.trim() ? profile.account2_ifsc.trim().toUpperCase() : null,
        account2_bank_account_name: profile.account2_bank_account_name?.trim() || null,
        account2_upi_id: profile.account2_upi_id?.trim() || null,
        account2_payment_qr_url: profile.account2_payment_qr_url || null,
        default_payment_account: profile.default_payment_account || "account1",
        logo_url: profile.logo_url || HARDCODED_BUSINESS_PROFILE.logo_url || null,
        payment_qr_url: profile.payment_qr_url || HARDCODED_BUSINESS_PROFILE.payment_qr_url || null,
        signature_url: profile.signature_url || HARDCODED_BUSINESS_PROFILE.signature_url || null,
        stamp_url: profile.stamp_url || HARDCODED_BUSINESS_PROFILE.stamp_url || null,
        default_terms: profile.default_terms?.trim() || HARDCODED_BUSINESS_PROFILE.default_terms || null,
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

      {/* Google Drive Backup Status Card */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs ${
          driveStatus?.configured
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-amber-50/70 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-start gap-3">
          <FolderCheck
            className={`h-5 w-5 shrink-0 mt-0.5 ${
              driveStatus?.configured ? "text-emerald-700" : "text-amber-700"
            }`}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">
                Google Drive Automated Backup:{" "}
                {driveStatus?.configured ? "Connected & Active" : "Pending Configuration"}
              </p>
              {driveStatus?.configured && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                </span>
              )}
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {driveStatus?.configured
                ? `Generated invoices are automatically backed up as PDF files into financial year subfolders. Connected via: ${driveStatus.clientEmail || "Service Account"}.`
                : "To activate automated server-side backup of invoice PDFs to your Google Drive, set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID in environment variables (.env.local / Vercel)."}
            </p>
          </div>
        </div>

        {driveStatus?.folderUrl && (
          <a
            href={driveStatus.folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0b1f3a] text-white hover:bg-[#132c50] font-medium text-xs shadow-sm self-start sm:self-auto shrink-0"
          >
            <span>Open Invoices Folder</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
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

        {/* Section 2: Multi-Account Banking & Settlement Details */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-[#0b1f3a]" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Payment Receiving Accounts (Multi-Account Setup)
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Default for New Invoices:</span>
                <select
                  value={profile.default_payment_account || "account1"}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      default_payment_account: e.target.value as "account1" | "account2",
                    })
                  }
                  className="h-7 text-xs border border-slate-200 rounded px-2 bg-white font-medium"
                >
                  <option value="account1">{profile.account1_label || "Account 1 (Primary)"}</option>
                  <option value="account2">{profile.account2_label || "Account 2 (Secondary)"}</option>
                </select>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Configure multiple bank accounts. You can easily switch between them when generating each invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Account 1 (Primary) */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-xs text-slate-900">Account 1 (Primary Account)</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Primary Hardcoded Base
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="account1_label">Account Display Label</Label>
                  <Input
                    id="account1_label"
                    value={profile.account1_label || ""}
                    onChange={(e) => setProfile({ ...profile, account1_label: e.target.value })}
                    placeholder="e.g. Account 1 (UP Gramin Bank - Dheerendra Singh)"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank_account_name">Bank Account Holder Name</Label>
                  <Input
                    id="bank_account_name"
                    value={profile.bank_account_name || ""}
                    onChange={(e) => setProfile({ ...profile, bank_account_name: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={profile.bank_name || ""}
                    onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={profile.account_number || ""}
                    onChange={(e) => setProfile({ ...profile, account_number: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input
                    id="ifsc"
                    value={profile.ifsc || ""}
                    onChange={(e) => setProfile({ ...profile, ifsc: e.target.value })}
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="upi_id">UPI ID / VPA</Label>
                  <Input
                    id="upi_id"
                    placeholder="e.g. 8882511472@upi"
                    value={profile.upi_id || ""}
                    onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                {/* Account 1 QR */}
                <div className="space-y-1.5">
                  <Label>Account 1 Payment QR Code</Label>
                  <div className="flex items-center gap-3">
                    {qrPreviewUrl ? (
                      <div className="relative h-14 w-14 border border-slate-200 rounded bg-white p-1 shrink-0">
                        <Image src={qrPreviewUrl} alt="QR 1" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="h-14 w-14 border border-dashed border-slate-200 rounded flex items-center justify-center bg-white shrink-0">
                        <QrCode className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingQR ? "Uploading..." : "Upload QR 1"}</span>
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
            </div>

            {/* Account 2 (Secondary) */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-xs text-slate-900">Account 2 (Secondary Account)</span>
                </div>
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Configurable Account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="account2_label">Account Display Label</Label>
                  <Input
                    id="account2_label"
                    value={profile.account2_label || ""}
                    onChange={(e) => setProfile({ ...profile, account2_label: e.target.value })}
                    placeholder="e.g. Account 2 (HDFC / ICICI Bank)"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account2_bank_account_name">Bank Account Holder Name</Label>
                  <Input
                    id="account2_bank_account_name"
                    placeholder="e.g. ABIRA Enterprises"
                    value={profile.account2_bank_account_name || ""}
                    onChange={(e) => setProfile({ ...profile, account2_bank_account_name: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account2_bank_name">Bank Name</Label>
                  <Input
                    id="account2_bank_name"
                    placeholder="e.g. HDFC Bank"
                    value={profile.account2_bank_name || ""}
                    onChange={(e) => setProfile({ ...profile, account2_bank_name: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account2_account_number">Account Number</Label>
                  <Input
                    id="account2_account_number"
                    placeholder="e.g. 50200012345678"
                    value={profile.account2_account_number || ""}
                    onChange={(e) => setProfile({ ...profile, account2_account_number: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account2_ifsc">IFSC Code</Label>
                  <Input
                    id="account2_ifsc"
                    placeholder="e.g. HDFC0001234"
                    value={profile.account2_ifsc || ""}
                    onChange={(e) => setProfile({ ...profile, account2_ifsc: e.target.value })}
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account2_upi_id">UPI ID / VPA</Label>
                  <Input
                    id="account2_upi_id"
                    placeholder="e.g. abira@hdfcbank"
                    value={profile.account2_upi_id || ""}
                    onChange={(e) => setProfile({ ...profile, account2_upi_id: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                {/* Account 2 QR */}
                <div className="space-y-1.5">
                  <Label>Account 2 Payment QR Code</Label>
                  <div className="flex items-center gap-3">
                    {account2QrPreviewUrl ? (
                      <div className="relative h-14 w-14 border border-slate-200 rounded bg-white p-1 shrink-0">
                        <Image src={account2QrPreviewUrl} alt="QR 2" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="h-14 w-14 border border-dashed border-slate-200 rounded flex items-center justify-center bg-white shrink-0">
                        <QrCode className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingAccount2QR ? "Uploading..." : "Upload QR 2"}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "account2_qr")}
                        disabled={uploadingAccount2QR}
                      />
                    </label>
                    {account2QrPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...profile, account2_payment_qr_url: "" };
                          setProfile(updated);
                          setAccount2QrPreviewUrl("");
                          try {
                            localStorage.setItem("abira_business_profile", JSON.stringify(updated));
                          } catch {}
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
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
                Visual Assets (Logo, Stamp & Signature)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Upload company branding and authorized verification assets used on your generated invoice PDFs. Background-less (transparent PNG) images work best for stamps and signatures.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
