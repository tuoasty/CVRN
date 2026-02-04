import { AlertCircle } from 'lucide-react';

export default function ErrorDisplay({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{message}</p>
            </div>
        </div>
    );
}