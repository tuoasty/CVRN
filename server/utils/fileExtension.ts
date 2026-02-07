function mimeToExt(mime: string) {
    const map: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    };

    return map[mime] ?? "bin";
}

export function getFileExtension(file: File) {
    if (file.type) {
        return mimeToExt(file.type);
    }

    return file.name.split(".").pop()?.toLowerCase() ?? "bin";
}