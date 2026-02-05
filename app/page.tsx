import {Suspense} from "react";
import MatchList from "@/app/components/MatchList";
import RobloxPlayerSearch from "@/app/components/RobloxPlayerSearch";

export default async function PublicHome(){
    return(
        <>
         <h1>Public Page</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <MatchList/>
            </Suspense>
            <RobloxPlayerSearch></RobloxPlayerSearch>
        </>
    )
}