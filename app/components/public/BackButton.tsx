"use client";

import {useRouter} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {Button} from "@/app/components/ui/button";

export default function BackButton() {
    const router = useRouter();
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-sm -ml-2"
        >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
        </Button>
    );
}
