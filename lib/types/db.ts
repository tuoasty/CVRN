import type {Database} from "@/database.types";

export type Match =
    Database["public"]["Tables"]["matches"]["Row"];

export type Team =
    Database["public"]["Tables"]["teams"]["Row"];

export type Player =
    Database["public"]["Tables"]["players"]["Row"];