import type {Metadata} from "next";
import Link from "next/link";
import {ContactLine, DOC_LINK, DocPage, DocSection} from "@/app/components/public/DocPage";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "What the CVRN website collects, why, who handles it and how to have it removed.",
};

export default function PrivacyPage() {
    return (
        <DocPage title="Privacy Policy" updated="6 November 2026">
            <p className="mt-4">
                This policy explains what the CVRN website collects, why, who handles it and how to have it removed. The site is run by toast (@tuoasty), who is responsible for the data described here.
            </p>

            <DocSection title="League players">
                <p>
                    If you have played in the league, the site shows your Roblox user ID, username, display name and avatar, along with your team, match results, stats and awards. Names and avatars come from your public Roblox profile. Results and stats come from the match sheets league staff keep.
                </p>
                <p>
                    We publish this to keep a public record of the league. The CVR: Retro game also reads these public stats from the site to show them in game.
                </p>
            </DocSection>

            <DocSection title="Visitors">
                <p>
                    You don&apos;t need an account to use the site. There are no ads and no tracking cookies. The site stores two things in your browser:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>a cookie named <span className="font-mono">cvrn_last_ctx</span> that remembers the last region and season you viewed, for one year;</li>
                    <li>your light or dark theme choice, in your browser&apos;s local storage.</li>
                </ul>
                <p>Both are only used to show you the site the way you left it.</p>
            </DocSection>

            <DocSection title="Staff">
                <p>
                    League staff sign in to a staff area. For them, we store an email address and a role, set sign-in cookies, and keep their last selected region and season in the browser.
                </p>
            </DocSection>

            <DocSection title="Logs">
                <p>
                    Like most websites, our hosting and network providers record requests to the site, including IP address, browser and the page requested. These logs are used to keep the site running and secure and to count overall traffic, and are kept only for a short time.
                </p>
            </DocSection>

            <DocSection title="Who handles the data">
                <p>
                    We use service providers for hosting, the database and staff sign-in, file storage, network protection and content delivery, staff invitation emails, and the spreadsheets stats are recorded in. They process data only to provide those services.
                </p>
                <p>Some of them may process data outside your country. We don&apos;t sell or share data with anyone else.</p>
            </DocSection>

            <DocSection title="How long we keep it">
                <p>
                    Player profiles and stats are kept for as long as the league archive exists, unless you ask us to remove them. Staff accounts are deleted when someone leaves staff. Logs are kept only briefly.
                </p>
            </DocSection>

            <DocSection title="Your choices">
                <p>
                    You can ask to see the data the site holds about you, have it corrected, or have your profile removed. If you are in the EU or UK, these are your rights under data protection law, and you can also complain to your local data protection authority. To make a request, <ContactLine />.
                </p>
            </DocSection>

            <DocSection title="Children">
                <p>
                    The league is run through Discord, which requires users to be at least 13, or older in some countries. The site is not meant for children under 13. If you believe a profile on the site belongs to someone under 13, contact us and we will remove it.
                </p>
            </DocSection>

            <DocSection title="Changes">
                <p>
                    We may update this policy. The date at the top shows when it last changed. See also the{" "}
                    <Link href="/terms" prefetch={false} className={DOC_LINK}>Terms of Service</Link>.
                </p>
            </DocSection>
        </DocPage>
    );
}
