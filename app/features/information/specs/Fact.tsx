export default function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="mb-0.5 block text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{label}</span>
            <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
        </div>
    )
}
