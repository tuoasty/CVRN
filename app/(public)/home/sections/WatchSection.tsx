import Link from "next/link";
import VodFacade from "@/app/features/media/VodFacade";
import {SectionHeading} from "./SectionHeading";
import type {VodItem} from "../model/types";

export function WatchSection({vod}: {vod: VodItem}) {
    return (
        <section aria-label="Watch">
            <SectionHeading title="Watch" href={vod.matchHref} linkLabel="Match page" />
            <div className="mt-3">
                <VodFacade videoUrl={vod.videoUrl} title={vod.title} sizes="(min-width: 1024px) 900px, 100vw" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
                {vod.matchHref ? (
                    <Link href={vod.matchHref} className="hover:text-foreground hover:underline hover:underline-offset-4">
                        {vod.caption}
                    </Link>
                ) : (
                    vod.caption
                )}
            </p>
        </section>
    );
}
