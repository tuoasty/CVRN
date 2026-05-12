import {notFound} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {Trophy, Medal, Award, ChevronLeft} from "lucide-react";
import {getSeasonDetailAction} from "@/app/actions/season.actions";
import {getAllRegionsAction} from "@/app/actions/region.actions";
import {syncAwardAvatars, needsAvatarSync} from "@/server/domains/season/helpers/syncAwardAvatars";
import {runInBackground} from "@/server/utils/runInBackground";
import {SeasonDetail} from "@/server/domains/season";

const PLACE_META = {
    1: {label: "Champion",  color: "text-yellow-500", Icon: Trophy},
    2: {label: "Runner-Up", color: "text-slate-400",  Icon: Medal},
    3: {label: "3rd Place", color: "text-amber-700",  Icon: Medal},
} as const;

function TeamLogo({name, logoUrl}: {name: string; logoUrl: string | null}) {
    if (logoUrl) {
        return (
            <Image src={logoUrl} alt={name} width={28} height={28}
                className="rounded-sm object-contain mix-blend-multiply dark:mix-blend-screen" />
        );
    }
    return (
        <div className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary">
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function PodiumEntry({entry}: {entry: SeasonDetail["season_podium"][number]}) {
    const place = entry.place as 1 | 2 | 3;
    const meta = PLACE_META[place] ?? {label: `${place}th`, color: "text-muted-foreground", Icon: Medal};
    const {label, color, Icon} = meta;

    return (
        <div className={`flex items-center gap-3 ${place !== 1 ? "opacity-80" : ""}`}>
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <TeamLogo name={entry.teams.name} logoUrl={entry.teams.logo_url} />
            <div>
                <p className={`font-semibold leading-none ${place === 1 ? "text-base" : "text-sm"}`}>
                    {entry.teams.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}

function AvatarPlaceholder({username}: {username: string}) {
    return (
        <div className="w-full aspect-[3/4] rounded-sm bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
                {(username ?? "?").slice(0, 2).toUpperCase()}
            </span>
        </div>
    );
}

function AwardCard({award}: {award: SeasonDetail["season_awards"][number]}) {
    const {award_name, full_avatar_url, players} = award;

    return (
        <div className="panel p-3 flex flex-col gap-2 w-36 shrink-0">
            {full_avatar_url ? (
                <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden">
                    <Image
                        src={full_avatar_url}
                        alt={players.username ?? "Player"}
                        fill
                        className="object-cover object-top"
                        sizes="144px"
                    />
                </div>
            ) : (
                <AvatarPlaceholder username={players.username ?? "?"} />
            )}
            <div>
                <p className="font-semibold text-sm leading-snug">{award_name}</p>
                <p className="text-xs text-muted-foreground">{players.username}</p>
            </div>
        </div>
    );
}

export default async function SeasonDetailPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;

    const [seasonResult, regionsResult] = await Promise.all([
        getSeasonDetailAction(slug),
        getAllRegionsAction(),
    ]);

    if (!seasonResult.ok) {
        if (seasonResult.error.code === "NOT_FOUND") notFound();
        throw new Error(seasonResult.error.message);
    }

    const season = seasonResult.value;

    if (season.season_awards.some(a => needsAvatarSync(a.full_avatar_synced_at))) {
        runInBackground(() => syncAwardAvatars(season.id), "syncAwardAvatars");
    }
    const regions = regionsResult.ok ? regionsResult.value : [];
    const regionName = regions.find(r => r.id === season.region_id)?.name ?? "Unknown";

    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "?";

    const sorted = [...season.season_podium].sort((a, b) => a.place - b.place);

    return (
        <div className="page-narrow space-y-6 py-6">
            <Link
                href="/archive"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                League History
            </Link>

            <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {season.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    {regionName} · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                </p>
            </div>

            {sorted.length > 0 && (
                <div className="panel p-5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Podium
                    </p>
                    <div className="space-y-3 border-l-2 border-primary/20 pl-4">
                        {sorted.map(e => <PodiumEntry key={e.place} entry={e} />)}
                    </div>
                </div>
            )}

            {season.season_awards.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Award className="h-3 w-3" /> Awards
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {season.season_awards.map(a => (
                            <AwardCard key={a.id} award={a} />
                        ))}
                    </div>
                </div>
            )}

            {sorted.length === 0 && season.season_awards.length === 0 && (
                <div className="panel p-6 text-center">
                    <p className="text-muted-foreground text-sm">Results not yet recorded.</p>
                </div>
            )}
        </div>
    );
}
