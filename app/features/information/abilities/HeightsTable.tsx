import type { HeightColumn } from '@/server/domains/gameData'

const LABEL = 'text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground'
const GRID = 'grid grid-cols-[48px_48px_1fr] items-center gap-4'

function Header({ className }: { className?: string }) {
    return (
        <div className={`${GRID} -mx-3 px-3 pb-2 ${LABEL} ${className ?? ''}`}>
            <span>Height</span>
            <span>Game</span>
            <span className="text-right">Odds</span>
        </div>
    )
}

function Row({ row, fill }: { row: HeightColumn['rows'][number]; fill: boolean }) {
    return (
        <div className={`group relative ${GRID} -mx-3 px-3 py-1.5`}>
            {fill && (
                <span
                    aria-hidden
                    className="absolute inset-y-0.5 left-0 bg-muted transition-colors duration-150 group-hover:bg-border motion-reduce:transition-none"
                    style={{ width: `${row.fill * 100}%` }}
                />
            )}
            <span className="relative font-mono text-sm font-semibold tabular-nums text-foreground">{row.label}</span>
            <span className="relative font-mono text-xs tabular-nums text-muted-foreground">{row.game}</span>
            <span className="relative text-right font-mono text-sm tabular-nums text-muted-foreground transition-colors duration-150 group-hover:text-foreground motion-reduce:transition-none">
                {row.pct.toFixed(2)}%
            </span>
        </div>
    )
}

export default function HeightsTable({ columns }: { columns: HeightColumn[] }) {
    if (columns.length === 0) {
        return <p className="py-16 text-center text-sm text-muted-foreground">No heights</p>
    }

    return (
        <>
            <div className="hidden grid-cols-3 items-start gap-x-14 md:grid">
                {columns.map(column => (
                    <div key={column.foot}>
                        <Header />
                        {column.rows.map(row => <Row key={row.value} row={row} fill />)}
                    </div>
                ))}
            </div>
            <div className="md:hidden">
                <Header />
                {columns.map(column => (
                    <div key={column.foot} className="mt-6 first:mt-0">
                        {column.rows.map(row => <Row key={row.value} row={row} fill={false} />)}
                    </div>
                ))}
            </div>
        </>
    )
}
