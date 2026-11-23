import type { PublicServeStyle } from '@/server/domains/gameData'

const LABEL = 'text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground'
const GRID = 'grid grid-cols-[minmax(0,1fr)_64px] items-baseline gap-4'

export default function ServeStylesTable({ styles }: { styles: PublicServeStyle[] }) {
    if (styles.length === 0) {
        return <p className="py-16 text-center text-sm text-muted-foreground">No serve styles</p>
    }

    return (
        <div className="max-w-2xl">
            <div className={`${GRID} pb-2 ${LABEL}`}>
                <span>Style</span>
                <span className="text-right">Odds</span>
            </div>
            {styles.map(style => (
                <div key={style.slug} id={`style-${style.slug}`} className={`${GRID} py-2.5`}>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{style.name}</p>
                        {style.text && <p className="mt-0.5 text-sm text-muted-foreground">{style.text}</p>}
                    </div>
                    <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">{style.oddsPct.toFixed(2)}%</span>
                </div>
            ))}
        </div>
    )
}
