import { redirect } from "next/navigation";

export default async function OldArchiveDetailPage({ params }: { params: Promise<{ region: string; slug: string }> }) {
    const { region, slug } = await params;
    // Past season slug is a valid season — use it as both context season and detail slug.
    redirect(`/${region}/${slug}/archive/${slug}`);
}
