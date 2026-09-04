import { useRef, useState } from 'react'

import { ApiRequestError } from '../../../lib/api-client'
import { uploadCVRequest } from '../../cv/api'

export function ResumeStep({
  onUploaded,
  onUploadingChange,
}: {
  onUploaded: (fileName: string) => void
  onUploadingChange?: (uploading: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(true)
    onUploadingChange?.(true)
    try {
      await uploadCVRequest(file)
      setFileName(file.name)
      onUploaded(file.name)
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Upload failed. Try a PDF or text file.',
      )
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  return (
    <div>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        Add your resume and Scout grounds every match in your real experience — no invented
        skills, ever. Your matches refresh in the background; you can skip this for now.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-line-strong bg-paper px-6 py-10 text-center transition-colors hover:border-emerald hover:bg-emerald-tint/40 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-6 w-6 stroke-muted" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="text-sm font-semibold text-charcoal">
          {uploading ? 'Uploading…' : fileName ? 'Upload a different resume' : 'Upload your resume'}
        </span>
        <span className="text-xs text-muted-2">PDF or text · encrypted at rest</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {fileName && !error ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-dark">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="h-4 w-4 stroke-emerald" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="font-medium">{fileName}</span>
          <span className="text-muted">uploaded — refreshing your matches in the background</span>
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-brick" role="alert">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[13px] w-[13px] shrink-0 stroke-brick" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  )
}
