import InformationPicker from '@/app/features/information/InformationPicker'

export default function InformationLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="page-wide pb-20 pt-6">
            <InformationPicker />
            {children}
        </div>
    )
}
