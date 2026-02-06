"use server"

import {processAuthCallback, setUserPassword, signIn, signOut} from "@/server/services/auth.service";

export async function loginAction(email:string, password:string){
    return signIn(email, password)
}

export async function logoutAction(){
    return signOut()
}

export async function setPasswordAction(password:string){
    return setUserPassword(password)
}

export async function authCallbackAction(url:string){
    return processAuthCallback(url)
}