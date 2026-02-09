import type {Database} from "@/database.types";
import {SupabaseClient} from "@supabase/supabase-js";

export type Match =
    Database["public"]["Tables"]["matches"]["Row"];

export type Team =
    Database["public"]["Tables"]["teams"]["Row"];

export type Player =
    Database["public"]["Tables"]["players"]["Row"];

export type DBClient = SupabaseClient<Database>;