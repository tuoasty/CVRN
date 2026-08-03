import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";

interface PublicPageHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function PublicPageHeader({ icon: Icon, title, subtitle, actions }: PublicPageHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    {/* Solid, not gradient-clipped text: the gradient reduced contrast on
                        the tail of every title and carried no meaning. Weight and size do
                        the work, per DESIGN.md's headline token. */}
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {subtitle === undefined && <Skeleton className="h-3 w-48 rounded-sm mt-0.5" />}
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {actions && <div>{actions}</div>}
        </div>
    );
}
