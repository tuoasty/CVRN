import { cn } from '@/lib/utils'

export default function Collapse({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
    return (
        <div
            inert={!open}
            className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                className,
            )}
        >
            <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
    )
}
