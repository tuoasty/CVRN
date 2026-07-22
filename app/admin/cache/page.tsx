"use client";

import {useState} from "react";
import {DatabaseZap, RefreshCw, Trash2, TriangleAlert} from "lucide-react";
import {AdminPageHeader} from "@/app/components/admin/AdminPageHeader";
import {Button} from "@/app/components/ui/button";
import {Badge} from "@/app/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {purgeCacheTagAction, purgeAllCacheAction} from "@/app/actions/cache.actions";
import {CACHE_TAG_INFO, CACHE_TAG_ORDER} from "@/server/cache/tagInfo";
import type {CacheTag} from "@/server/cache/tags";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {cn} from "@/lib/utils";

export default function AdminCachePage() {
    // A single in-flight value disables every button during a purge. Purges are fast and
    // concurrent ones serve no purpose.
    const [purging, setPurging] = useState<CacheTag | "all" | null>(null);
    const [confirmAll, setConfirmAll] = useState(false);

    const handlePurge = async (tag: CacheTag) => {
        setPurging(tag);
        try {
            const result = await purgeCacheTagAction({tag});
            if (!result.ok) {
                toast.error("Purge failed", result.error.message);
                return;
            }
            toast.success(
                `${CACHE_TAG_INFO[tag].label} cache cleared`,
                "The next page view will re-query.",
            );
        } catch (err) {
            clientLogger.error("AdminCachePage", "Exception purging cache tag", {err, tag});
            toast.error("Something went wrong");
        } finally {
            setPurging(null);
        }
    };

    const handlePurgeAll = async () => {
        setConfirmAll(false);
        setPurging("all");
        try {
            const result = await purgeAllCacheAction();
            if (!result.ok) {
                toast.error("Purge failed", result.error.message);
                return;
            }
            toast.success("All caches cleared", "Every public page will re-render on next view.");
        } catch (err) {
            clientLogger.error("AdminCachePage", "Exception purging all caches", {err});
            toast.error("Something went wrong");
        } finally {
            setPurging(null);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={DatabaseZap}
                    title="Cache"
                    description="Public pages are cached and refresh automatically when a mutation or sync changes data. Purge a tag when data changed underneath the app — a view migration, direct SQL, or a Supabase-side edit."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {CACHE_TAG_ORDER.map((tag) => {
                        const info = CACHE_TAG_INFO[tag];
                        return (
                            <div key={tag} className="panel p-4 flex flex-col gap-2">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-semibold">{info.label}</span>
                                    <Badge
                                        variant="outline"
                                        className="rounded-sm text-xs font-mono shrink-0"
                                    >
                                        {info.readCount} read{info.readCount !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{info.description}</p>
                                <p className="text-[11px] text-muted-foreground/70">
                                    Affects: {info.affects}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-sm gap-2 mt-auto"
                                    disabled={purging !== null}
                                    onClick={() => handlePurge(tag)}
                                >
                                    {purging === tag ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3 w-3" />
                                    )}
                                    Reset {info.label} cache
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Separated deliberately: this one is not the same kind of action. */}
                <div className="panel p-4 mt-6 border-destructive/30 flex flex-col sm:flex-row sm:items-center gap-3">
                    <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Reset all caches</p>
                        <p className="text-xs text-muted-foreground">
                            Clears all {CACHE_TAG_ORDER.length} tags. Every public page re-renders on
                            its next view — a few thousand renders. Use when you do not know which tag
                            is stale. Super admins only.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn("rounded-sm gap-2 shrink-0", "border-destructive/40 text-destructive hover:bg-destructive/10")}
                        disabled={purging !== null}
                        onClick={() => setConfirmAll(true)}
                    >
                        {purging === "all" ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                        Reset everything
                    </Button>
                </div>
            </div>

            <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset all caches?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This clears every cache tag and forces a re-render of essentially every
                            public page. It is safe — no data is lost — but it is not free, so prefer
                            purging the specific tag you know is stale.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-sm" onClick={handlePurgeAll}>
                            Reset everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
