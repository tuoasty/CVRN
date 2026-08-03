import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";

export default function StandingsLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            {}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                        <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <Skeleton className="h-6 w-28 rounded-sm" />
                        <Skeleton className="h-3 w-52 rounded-sm" />
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="text-right space-y-1.5">
                            <Skeleton className="h-2.5 w-12 rounded-sm ml-auto" />
                            <Skeleton className="h-6 w-8 rounded-sm ml-auto" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {}
                <div className="panel p-4 border-l-4 border-l-primary/30">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-64 rounded-sm" />
                        <Skeleton className="h-9 w-40 rounded-sm" />
                    </div>
                </div>

                {}
                <div className="rounded-sm border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2 border-border">
                                <TableHead className="w-20 text-center">RANK</TableHead>
                                <TableHead>TEAM</TableHead>
                                <TableHead className="text-center">RECORD</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">WIN %</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">SETS</TableHead>
                                <TableHead className="text-center">LVR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-center py-4">
                                        <Skeleton className="h-6 w-8 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded shrink-0" />
                                            <Skeleton className="h-5 w-32 rounded-sm" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center py-4">
                                        <Skeleton className="h-5 w-14 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center py-4">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <Skeleton className="h-5 w-16 rounded-sm mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
