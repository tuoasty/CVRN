import {Suspense} from "react";
import MatchList from "@/components/MatchList";
import RobloxPlayerSearch from "@/components/RobloxPlayerSearch";

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