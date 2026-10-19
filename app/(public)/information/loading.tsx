export default function InformationLoading() {
    return (
        <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="h-5 w-full animate-pulse bg-muted/40 motion-reduce:animate-none" />
            ))}
        </div>
    )
}
