import type { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
}

export function AdminPageHeader({ icon: Icon, title, description, actions, stats }: AdminPageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b-2 border-primary/20">
            <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20 shrink-0">
                    <Icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
                        {title}
                    </h1>
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                </div>
            </div>
            {(stats || actions) && (
                <div className="flex items-center gap-4">
                    {stats}
                    {actions}
                </div>
            )}
        </div>
    );
}
