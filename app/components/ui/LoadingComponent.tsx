type Props = {
    isPending: boolean;
}

export default function LoadingComponent(p:Props){
    if(p.isPending){
        return (
            <div className="fixed top-[80px] left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }
}