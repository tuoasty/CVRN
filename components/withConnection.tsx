import {ComponentType} from "react";
import {connection} from "next/server";

export function withConnection<P extends object>(
    Component: ComponentType<P>
){
    return async function WithConnectionWrapper(props: P){
        await connection();
        return <Component {...props}/>
    }
}