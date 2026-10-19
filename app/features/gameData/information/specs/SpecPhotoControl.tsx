"use client"

import { useRef, useState } from 'react'
import { toast } from '@/app/utils/toast'
import SpecPhoto from '@/app/features/spec/SpecPhoto'
import { IMAGE_PROFILES } from '@/shared/storage/imageProfiles'
import type { Spec } from '@/shared/types/db'
import { useInformation } from '../InformationProvider'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const ACTION = 'font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50'

export default function SpecPhotoControl({ spec }: { spec: Spec }) {
    const { saveSpecPhoto, removeSpecPhoto } = useInformation()
    const input = useRef<HTMLInputElement>(null)
    const [pending, setPending] = useState(false)

    const run = async (work: () => Promise<boolean>) => {
        setPending(true)
        try {
            await work()
        } finally {
            setPending(false)
        }
    }

    const pick = (file: File | undefined) => {
        if (input.current) input.current.value = ''
        if (!file) return
        if (!ACCEPTED.includes(file.type)) return toast.error('Photo not saved', 'Use PNG, JPEG or WebP')
        if (file.size > IMAGE_PROFILES.specPhoto.maxFileSize) return toast.error('Photo not saved', 'Max 2.5MB')
        void run(() => saveSpecPhoto(spec.id, file))
    }

    return (
        <div className="flex items-end gap-4">
            <SpecPhoto url={spec.photo_url} name={spec.name} sizes="96px" className="w-24" />
            <div className="flex items-baseline gap-4 text-sm">
                <button type="button" className={ACTION} disabled={pending} onClick={() => input.current?.click()}>
                    {spec.photo_url ? 'Replace' : 'Upload'}
                </button>
                {spec.photo_url && (
                    <button type="button" className={ACTION} disabled={pending} onClick={() => void run(() => removeSpecPhoto(spec.id))}>
                        Remove
                    </button>
                )}
            </div>
            <input
                ref={input}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                onChange={e => pick(e.target.files?.[0])}
            />
        </div>
    )
}
