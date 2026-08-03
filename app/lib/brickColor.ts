function hexToHsl(hex: string): [number, number, number] {
    const clean = hex.replace(/^#/, "");
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
    const sn = s / 100;
    const ln = l / 100;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function getBrickDisplayColor(
    hex: string | null | undefined,
    isDark: boolean,
): string | null {
    if (!hex) return null;
    try {
        const [h, s, l] = hexToHsl(hex);
        if (isDark && l < 20) return hslToHex(h, s, 45);
        if (!isDark && l > 82) return hslToHex(h, s, 58);
        return hex;
    } catch {
        return hex;
    }
}
