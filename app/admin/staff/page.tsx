"use client";

import {useStaffPage} from "@/app/hooks/useStaffPage";
import {RoleMappingSection} from "@/app/features/staff/RoleMappingSection";
import {StaffListSection} from "@/app/features/staff/StaffListSection";
import {Button} from "@/app/components/ui/button";
import {Skeleton} from "@/app/components/ui/skeleton";

function StaffSkeleton() {
    return (
        <div aria-hidden>
            {[0, 1].map(section => (
                <div key={section} className={section === 0 ? "mt-8" : "mt-11"}>
                    <Skeleton className="h-6 w-40 motion-reduce:animate-none" />
                    <Skeleton className="mt-2 h-4 w-96 max-w-full motion-reduce:animate-none" />
                    <div className="mt-4 space-y-5">
                        {[0, 1, 2, 3].map(row => (
                            <Skeleton key={row} className="h-8 w-full motion-reduce:animate-none" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AdminStaffPage() {
    const {page, isLoading, error, mutate} = useStaffPage();

    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Staff</h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Site access comes from Discord roles on the CVRN server. Mapping and block changes apply on each person&apos;s next request; role changes on Discord take up to 5 minutes.
            </p>

            {page ? (
                <div className="mt-8 flex flex-col gap-11">
                    <StaffListSection accounts={page.accounts} onSaved={() => mutate()} />
                    <RoleMappingSection roles={page.roles} guildRoles={page.guildRoles} onSaved={() => mutate()} />
                </div>
            ) : error ? (
                <div className="py-16 text-center">
                    <p className="text-sm text-foreground">Couldn&apos;t load staff.</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-4 rounded-sm max-md:h-11" onClick={() => void mutate()}>
                        Try again
                    </Button>
                </div>
            ) : isLoading ? (
                <StaffSkeleton />
            ) : null}
        </div>
    );
}
