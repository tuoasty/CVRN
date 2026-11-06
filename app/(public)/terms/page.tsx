import type {Metadata} from "next";
import Link from "next/link";
import {ContactLine, DOC_LINK, DocPage, DocSection} from "@/app/components/public/DocPage";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "The rules for using the CVRN website.",
};

export default function TermsPage() {
    return (
        <DocPage title="Terms of Service" updated="6 November 2026">
            <p className="mt-4">
                These terms cover your use of the CVRN website. By using the site, you agree to them. If you don&apos;t agree, please don&apos;t use the site.
            </p>

            <DocSection title="Using the site">
                <p>
                    The site is free to read. Don&apos;t try to disrupt it, overload it, get around its access controls, or reach the staff areas without an account the league gave you.
                </p>
            </DocSection>

            <DocSection title="Stats and records">
                <p>
                    League staff record match results and player stats from the league&apos;s match sheets. They can contain mistakes. We correct them when they are reported, but we don&apos;t guarantee that any stat, standing or record is complete or accurate.
                </p>
            </DocSection>

            <DocSection title="Players on the site">
                <p>
                    The site shows the Roblox username, display name, avatar and league stats of players who have played in the league. How that information is handled is covered in the{" "}
                    <Link href="/privacy" prefetch={false} className={DOC_LINK}>Privacy Policy</Link>. To have your profile removed, <ContactLine />.
                </p>
            </DocSection>

            <DocSection title="Artwork and content">
                <p>
                    The CVRN logo, landing art and section graphics belong to the artists named in the{" "}
                    <Link href="/about#credits" prefetch={false} className={DOC_LINK}>credits</Link>. Don&apos;t reuse them without permission.
                </p>
                <p>
                    CVRN is not affiliated with or endorsed by Roblox Corporation. Roblox and the Roblox logo are trademarks of Roblox Corporation.
                </p>
            </DocSection>

            <DocSection title="Other services">
                <p>
                    The site links to Roblox, Discord and Google Sheets. Those services have their own terms, and we aren&apos;t responsible for them.
                </p>
            </DocSection>

            <DocSection title="Changes">
                <p>
                    We may update these terms. The date at the top shows when they last changed.
                </p>
            </DocSection>

            <DocSection title="Contact">
                <p>
                    For questions about these terms, <ContactLine />.
                </p>
            </DocSection>
        </DocPage>
    );
}
