import Image from "next/image";

export default function NavbarLogo({ className }: { className?: string }) {
    return (
        <>
            <Image
                src="/logo-light.png"
                alt="CVRN"
                width={120}
                height={28}
                priority
                className={`h-7 w-auto dark:hidden ${className ?? ""}`}
            />
            <Image
                src="/logo-dark.png"
                alt="CVRN"
                width={120}
                height={28}
                priority
                className={`hidden h-7 w-auto dark:block ${className ?? ""}`}
            />
        </>
    );
}
