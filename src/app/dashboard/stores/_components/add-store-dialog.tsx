"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { canCreateStore } from "@/lib/auth/roles";
import { useAuthAccess } from "@/components/domain/role-provider";

export function AddStoreDialog() {
  const t = useTranslations("Stores");
  const router = useRouter();
  const access = useAuthAccess();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!canCreateStore(access)) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (res.ok) {
        // Auto-scrape runs in the background via after() on the server.
        // The response returns immediately so the dialog closes fast.
        toast(t("storeAdded"), {
          description: t("storeAddedScraping"),
        });
        setUrl("");
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || t("addFailed"));
      }
    } catch {
      toast.error(t("addFailed"));
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger — DESIGN.md §5: primary bg, border-strong, hard-shadow */}
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{
            fontFamily: "var(--font-mono)",
            border: "2px solid var(--border-strong)",
            boxShadow: "var(--hard-shadow)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("addStore")}
        </button>
      </DialogTrigger>
      {/* Dialog — DESIGN.md §5: border-strong + hard-shadow */}
      <DialogContent
        className="p-0 gap-0"
        style={{
          border: "2px solid var(--border-strong)",
          boxShadow: "var(--hard-shadow)",
          backgroundColor: "var(--card)",
          borderRadius: 0,
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--primary-text)",
            }}
          >
            {t("addStore")}
          </DialogTitle>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {t("addStoreDescription")}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="mb-5">
            <Label
              htmlFor="store-url"
              className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--foreground)",
                opacity: 0.5,
              }}
            >
              {t("storeUrl")}
            </Label>
            <Input
              id="store-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full px-3 py-2.5 text-xs border-2 outline-none transition-all duration-100 focus:border-primary"
              style={{
                backgroundColor: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                borderRadius: 0,
              }}
              autoFocus
            />
          </div>
          {/* Submit — DESIGN.md §5: primary button with hard-shadow */}
          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none"
            style={{
              fontFamily: "var(--font-mono)",
              border: "2px solid var(--border-strong)",
              boxShadow: "var(--hard-shadow)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("startMonitoring")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
