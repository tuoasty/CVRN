export default function PlaceholderTab({ title, body }: { title: string; body: string }) {
    return (
        <div className="py-16 max-w-[62ch]">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
    )
}
