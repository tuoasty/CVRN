export const DOC_LINK = "font-semibold underline decoration-2 underline-offset-4 rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function DocPage({title, updated, children}: {title: string; updated?: string; children: React.ReactNode}) {
    return (
        <div className="page-narrow pt-7 pb-20">
            <div className="max-w-[75ch] text-sm leading-6">
                <h1 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
                {updated && <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>}
                {children}
            </div>
        </div>
    );
}

export function DocSection({id, title, children}: {id?: string; title: string; children: React.ReactNode}) {
    return (
        <section id={id} className="mt-10 scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
            {children}
        </section>
    );
}

export const CONTACT_EMAIL = "tuoasty@gmail.com";
export const CONTACT_DISCORD = "@tuoasty";

export function ContactLine() {
    return (
        <>
            message <span className="font-semibold">{CONTACT_DISCORD}</span> on Discord or email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={DOC_LINK}>{CONTACT_EMAIL}</a>
        </>
    );
}
