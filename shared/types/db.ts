import {Database} from "@/shared/types/db.override";
import {SupabaseClient} from "@supabase/supabase-js";

export type Match =
    Database["public"]["Tables"]["matches"]["Row"];

export type Team =
    Database["public"]["Tables"]["teams"]["Row"];

export type Player =
    Database["public"]["Tables"]["players"]["Row"];

export type Region =
    Database["public"]["Tables"]["regions"]["Row"];

export type Official =
    Database["public"]["Tables"]["officials"]["Row"];

export type MatchOfficial =
    Database["public"]["Tables"]["match_officials"]["Row"];

export type Season =
    Database["public"]["Tables"]["seasons"]["Row"];




export type DBClient = SupabaseClient<Database>;