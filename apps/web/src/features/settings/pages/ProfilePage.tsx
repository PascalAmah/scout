import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import {
  useCreateCVProfile,
  useCV,
  useCVProfiles,
  useDeleteCVProfile,
  useUpdateCVProfile,
  useUploadCV,
} from '../../cv/hooks'

export function ProfilePage() {
  const cvQuery = useCV()
  const profilesQuery = useCVProfiles()
  const upload = useUploadCV()
  const createProfile = useCreateCVProfile()
  const updateProfile = useUpdateCVProfile()
  const deleteProfile = useDeleteCVProfile()

  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')

  const profile = cvQuery.isSuccess ? cvQuery.data : null
  const profiles = profilesQuery.data ?? []

  const onReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate({ file })
    e.target.value = ''
  }

  const onReplaceText = () => {
    const body = text.trim()
    if (!body) return
    upload.mutate({ text: body })
    setText('')
  }

  const onCreateProfile = () => {
    const body = newText.trim()
    const name = newName.trim()
    if (!body || !name) return
    createProfile.mutate({ name, text: body })
    setNewText('')
    setNewName('')
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">CV / Portfolio</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Multiple profiles let you position yourself differently — “backend” vs “product”. The{' '}
          <b>default</b> anchors your matches; uploading to it re-ranks them.
        </p>

        {/* Profile list */}
        {profiles.length > 0 ? (
          <ul className="mt-5 divide-y divide-[#F0EEE7] rounded-lg border border-[#E5E3DC]">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-[#1F2937]">
                    {p.name}
                    {p.is_default ? (
                      <span className="rounded-full bg-[#E7F5EE] px-2 py-0.5 text-[10px] font-semibold text-[#0F6E56]">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[#6B7280]">
                    {p.source_file_key ?? 'pasted text'} · updated{' '}
                    {new Date(p.updated_at).toLocaleDateString()}
                    {p.last_embedded_at ? ` · embedded` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.is_default ? (
                    <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                      Replace
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      loading={updateProfile.isPending}
                      onClick={() => updateProfile.mutate({ id: p.id, patch: { is_default: true } })}
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    loading={deleteProfile.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete the “${p.name}” profile?`)) {
                        deleteProfile.mutate(p.id)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-[#6B7280]">
            No CV yet — upload one below and it becomes your default profile.
          </p>
        )}

        {/* Default profile upload (file) */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={onReplaceFile}
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
          <Button variant="ghost" onClick={onReplaceText} disabled={!text.trim()}>
            Use pasted text
          </Button>
        </div>

        {upload.isError || createProfile.isError ? (
          <p className="mt-3 text-sm text-[#B3261E]">
            {(upload.error ?? createProfile.error)?.message ?? 'Something went wrong.'}
          </p>
        ) : null}
      </section>

      {/* New named profile */}
      <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-[#1F2937]">New profile</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Add another positioning (e.g. “Product” or “Backend”) without replacing your default.
        </p>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Profile name (e.g. Product)"
          className="mt-4 w-full rounded-lg border border-[#D6D3C9] p-3 text-sm text-[#1F2937] outline-none focus:border-[#1F2937]"
        />
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="…paste that CV's text here"
          rows={4}
          className="mt-3 w-full rounded-lg border border-[#D6D3C9] p-3 text-sm text-[#1F2937] outline-none focus:border-[#1F2937]"
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={onCreateProfile}
            loading={createProfile.isPending}
            disabled={!newName.trim() || !newText.trim()}
          >
            Create profile
          </Button>
        </div>
      </section>

      {profile?.structured_data ? (
        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">
              Parsed profile — {profile.name}
            </h2>
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
