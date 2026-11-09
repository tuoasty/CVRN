import sharp from "sharp";

export async function readImageDimensions(file: File | Blob): Promise<{width: number; height: number} | null> {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const metadata = await sharp(buffer).metadata();
        const width = metadata.autoOrient?.width ?? metadata.width;
        const height = metadata.autoOrient?.height ?? metadata.height;
        if (!width || !height) return null;
        return {width, height};
    } catch {
        return null;
    }
}
