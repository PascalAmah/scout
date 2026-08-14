import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { useCV, useUploadCV } from '../../cv/hooks'

export function ProfilePage() {
  const cvQuery = useCV()
  const upload = useUploadCV()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')

  const profile = cvQuery.isSuccess ? cvQuery.data : null

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate({ file })
    e.target.value = ''
  }

  const onTextUpload = () => {
    const body = text.trim()
    if (!body) return
    upload.mutate({ text: body })
    setText('')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">CV / Portfolio</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          The anchor for matching — one active profile at a time. Uploading replaces your current
          CV and re-ranks your matches.
        </p>

        {profile?.source_file_key ? (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#E5E3DC] bg-[#FAFAF8] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#E7F5EE] text-[#0F6E56]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M14 3v5h5M6 3h8l5 5v13H6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <b className="block text-sm text-[#1F2937]">{profile.source_file_key}</b>
              <span className="text-xs text-[#6B7280]">
                Parsed · uploaded {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                Replace
              </Button>
            </div>
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={onFile}
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => fileRef.current?.click()}
            loading={upload.isPending}
          >
            {profile?.source_file_key ? 'Replace with a file' : 'Upload a PDF or text file'}
          </Button>
          <span className="text-xs text-[#6B7280]">or</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…paste your CV text directly (no file needed)"
          rows={4}
          className="mt-3 w-full rounded-lg border border-[#D6D3C9] p-3 text-sm text-[#1F2937] outline-none focus:border-[#1F2937]"
        />
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" onClick={onTextUpload} disabled={!text.trim()}>
            Use pasted text
          </Button>
        </div>

        {upload.isError ? (
          <p className="mt-3 text-sm text-[#B3261E]">
            Upload failed: {(upload.error as Error).message}
          </p>
        ) : null}
      </section>

      {profile?.structured_data ? (
        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Parsed profile</h2>
            {profile.last_embedded_at ? (
              <span className="text-xs text-[#6B7280]">
                Last embedded {new Date(profile.last_embedded_at).toLocaleString()}
              </span>
            ) : null}
          </div>

          {profile.structured_data.years_of_experience != null ? (
            <p className="mt-3 text-sm text-[#6B7280]">
              <b className="text-[#1F2937]">
                {profile.structured_data.years_of_experience} years
              </b>{' '}
              of experience
            </p>
          ) : null}

          {profile.structured_data.roles.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.structured_data.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-[#D6D3C9] bg-white px-3 py-1 text-xs font-medium text-[#1F2937]"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.structured_data.skills.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.structured_data.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-[#E7F5EE] px-2.5 py-1 text-xs font-semibold text-[#0F6E56]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.structured_data.education.length > 0 ? (
            <p className="mt-4 text-sm text-[#6B7280]">
              {profile.structured_data.education.join(' · ')}
            </p>
          ) : null}

          <div className="mt-6">
            <Link to="/matches">
              <Button variant="ghost">See my matches →</Button>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}