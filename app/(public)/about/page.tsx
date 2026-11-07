import type {Metadata} from "next";
import {ContactLine, DOC_LINK, DocPage, DocSection} from "@/app/components/public/DocPage";

export const metadata: Metadata = {
    title: "About",
    description: "What CVRN is, who runs it, who made it and how to reach us.",
};

const STAFF = [
    {name: "CertifiedEddy", role: "Owner"},
    {name: "keirahela", role: "Developer"},
    {name: "Hunter", role: "Council"},
    {name: "curse", role: "Council"},
    {name: "Ardmair", role: "Council"},
    {name: "tee", role: "Council"},
    {name: "Aaron5959", role: "Council"},
];

const CREDITS = [
    {work: "Site design and development", by: "toast (@tuoasty)"},
    {work: "Logo and section graphics", by: "CH332Y (@slayden_dirksz)"},
    {work: "Landing art", by: "BKIIZ"},
];

const DISCORD = "https://discord.gg/bXtNACsuWF";

function Rows({rows}: {rows: {key: string; label: string; value: string}[]}) {
    return (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-2 text-sm sm:max-w-md">
            {rows.map(row => (
                <div key={row.key} className="contents">
                    <dt className="font-semibold">{row.label}</dt>
                    <dd className="text-muted-foreground">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function AboutPage() {
    return (
        <DocPage title="About">
            <p className="mt-4">
                CVRN, short for CVR Network, is the hub for CVR: Retro on Roblox. Check standings, match results, player stats and records for every region, and look up abilities, builds and patch notes for the game.
            </p>

            <DocSection title="Staff">
                <Rows rows={STAFF.map(s => ({key: s.name, label: s.name, value: s.role}))} />
            </DocSection>

            <DocSection id="credits" title="Credits">
                <Rows rows={CREDITS.map(c => ({key: c.work, label: c.work, value: c.by}))} />
            </DocSection>

            <DocSection id="contact" title="Contact">
                <p>
                    Questions about the game or the league go to the{" "}
                    <a href={DISCORD} target="_blank" rel="noopener noreferrer" className={DOC_LINK}>main Discord</a>.
                </p>
                <p>
                    For anything else, including removing your data from the site, <ContactLine />.
                </p>
            </DocSection>
        </DocPage>
    );
}
