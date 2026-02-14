"use client";

import React, { useState } from "react";
import Image from "next/image";
import { createTeamAction } from "@/app/actions/team.actions";

export default function CreateTeamForm() {
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [region, setRegion] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];

        if (!selected) return;

        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !file || !region.trim()) {
            setError("Team name, logo and region are required");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await createTeamAction(name, file, region);

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            setSuccess("Team created successfully!");

            setName("");
            setFile(null);
            setPreview(null);

        } catch (error) {
            console.log(error)
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Create New Team</h2>

            <form onSubmit={handleSubmit}>

                <div>
                    <input
                        type="text"
                        placeholder="Team name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={loading}
                    />
                </div>

                <div>
                    <input
                        type="text"
                        placeholder="Region (AS / NA / EU)"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {preview && (
                    <div>
                        <Image
                            src={preview}
                            alt="Logo Preview"
                            width={150}
                            height={150}
                        />
                    </div>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Team"}
                </button>

            </form>

            {error && <div style={{ color: "red" }}>{error}</div>}
            {success && <div style={{ color: "green" }}>{success}</div>}
        </div>
    );
}
