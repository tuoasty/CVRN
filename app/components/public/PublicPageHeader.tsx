import { Skeleton } from "@/app/components/ui/skeleton";

interface PublicPageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function PublicPageHeader({ title, subtitle, actions }: PublicPageHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                {subtitle === undefined && <Skeleton className="mt-1.5 h-3.5 w-48 rounded-[2px]" />}
                {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
        </div>
    );
}

export function PublicPageHeaderSkeleton({ titleWidth = "w-40" }: { titleWidth?: string }) {
    return (
        <div>
            <Skeleton className={`h-8 ${titleWidth} rounded-[2px]`} />
            <Skeleton className="mt-1.5 h-3.5 w-56 rounded-[2px]" />
        </div>
    );
}
