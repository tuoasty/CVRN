"use client";

import {useRouter} from "next/navigation";
import {OptionRow} from "@/app/components/filters/OptionRow";

export type RegionPickerOption = {code: string; name: string; published: boolean};

export default function RegionPicker({
    regions,
    active,
    pos,
}: {
    regions: RegionPickerOption[];
    active: string;
    pos: string;
}) {
    const router = useRouter();

    return (
        <div className="mb-4 flex items-center">
            <OptionRow
                label="Region"
                layout="inline"
                mono
                options={regions.map(r => ({
                    value: r.code.toUpperCase(),
                    label: r.code.toUpperCase(),
                    title: r.published ? r.name : `${r.name} (not published yet)`,
                }))}
                value={active.toUpperCase()}
                onChange={code => {
                    if (code === null) return;
                    router.push(`?region=${code.toLowerCase()}&pos=${pos.toLowerCase()}`, {scroll: false});
                }}
            />
        </div>
    );
}
