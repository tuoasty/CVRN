import { redirect } from "next/navigation";

export default async function OldArchiveDetailPage({ params }: { params: Promise<{ region: string; slug: string }> }) {
    const { region, slug } = await params;

    redirect(`/${region}/${slug}/archive/${slug}`);
}
