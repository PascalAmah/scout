import { Link } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useSession } from '../../auth/hooks'
import {
  useCreateCVProfile,
  useCV,
  useCVProfiles,
  useDeleteCVProfile,
  useUpdateCVProfile,
  useUploadCV,
} from '../../cv/hooks'
import { SettingsPanel } from '../components/SettingsPanel'

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '?').trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function ProfilePage() {
  const { user } = useSession()
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
  const parsed = profile?.structured_data

  const onReplaceFile = (e: ChangeEvent<HTMLInputElement>) => {
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
    <div className="space-y-5">
      <SettingsPanel title="Profile" description="How you appear across Scout">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-charcoal text-[18px] font-bold text-white">
            {initialsOf(user?.full_name)}
          </div>
          <div>
            <p className="text-sm text-muted">
              Identity and contact are set at sign-up.
            </p>
            <Link
              to="/onboarding"
              className="text-[13px] font-semibold text-emerald-dark hover:underline"
            >
              Edit your role &amp; location preferences →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-full-name"
              className="mb-1.5 block text-xs font-semibold text-charcoal"
            >
              Full name
            </label>
            <Input
              id="settings-full-name"
              value={user?.full_name ?? ''}
              readOnly
            />
          </div>
          <div>
            <label
              htmlFor="settings-email"
              className="mb-1.5 block text-xs font-semibold text-charcoal"
            >
              Email
            </label>
            <Input id="settings-email" value={user?.email ?? ''} readOnly />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="CV / Portfolio"
        description="The anchor for matching — one active profile at a time"
      >
{cvQuery.isLoading ? (
          <p className="text-sm text-muted">Loading your CV…</p>
        ) : profile ? (
          <>
            {/* Active CV card */}
            <div className="mb-4 flex items-center gap-[14px] rounded-md border border-line bg-paper px-[18px] py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-emerald-tint">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-[19px] w-[19px] stroke-emerald-dark"
                  aria-hidden
                >
                  <path d="M14 3v5h5M6 3h8l5 5v13H6z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <b className="flex flex-wrap items-center gap-2 text-[13.5px] text-charcoal">
                  <span className="truncate">
                    {profile.source_file_key ?? 'Pasted CV'}
                  </span>
                  {parsed ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-tint px-[9px] py-[3px] text-[10.5px] font-bold text-emerald-dark">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="h-2 w-2"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Parsed
                    </span>
                  ) : null}
                </b>
                <span className="text-[11.5px] text-muted">
                  Updated {new Date(profile.updated_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  loading={upload.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  Replace
                </Button>
              </div>
            </div>

            {parsed?.skills.length ? (
              <>
                <p className="mb-[10px] text-[11.5px] font-semibold text-muted">
                  Parsed skills
                </p>
                <div className="mb-[18px] flex flex-wrap gap-1.5">
                  {parsed.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-[7px] border border-line bg-white px-[10px] py-1 text-[11.5px] text-charcoal"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {/* Parsed stats */}
            <div className="flex gap-6">
              <div>
                <b className="block font-mono text-[18px] text-charcoal">
                  {parsed?.years_of_experience ?? '—'}
                </b>
                <span className="text-[11px] text-muted">years experience</span>
              </div>
              <div>
                <b className="block font-mono text-[18px] text-charcoal">
                  {parsed?.roles.length ?? '—'}
                </b>
                <span className="text-[11px] text-muted">roles found</span>
              </div>
              <div>
                <b className="block font-mono text-[18px] text-charcoal">
                  {parsed?.skills.length ?? '—'}
                </b>
                <span className="text-[11px] text-muted">skills extracted</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[11.5px] text-muted-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                className="h-3.5 w-3.5 stroke-emerald-dark"
                aria-hidden
              >
                <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
              </svg>
              Encrypted at rest. Never used to train external models. Delete
              anytime.
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              No CV yet — upload one below and it becomes your default profile.
            </p>
            <Button onClick={() => fileRef.current?.click()} loading={upload.isPending}>
              Upload a PDF or text file
            </Button>
          </>
        )}

        {/* Hidden file input — replaces the default profile */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={onReplaceFile}
        />

        {/* Paste-as-replace for the default profile */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…paste CV text to replace the default profile"
          rows={3}
          className="mt-4 w-full rounded-sm border border-line-strong bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-muted-2 focus:border-emerald focus:outline-2 focus:outline-emerald focus:outline-offset-1"
        />
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" onClick={onReplaceText} disabled={!text.trim()}>
            Use pasted text
          </Button>
        </div>
{/* Named profiles */}
        {profiles.length > 0 ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              Profiles
            </p>
            <ul className="divide-y divide-line">
              {profiles.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-charcoal">
                      {p.name}
                      {p.is_default ? (
                        <span className="rounded-pill bg-emerald-tint px-2 py-0.5 text-[10px] font-semibold text-emerald-dark">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {p.source_file_key ?? 'pasted text'} · updated{' '}
                      {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {p.is_default ? (
                      <Button
                        variant="ghost"
                        loading={upload.isPending}
                        onClick={() => fileRef.current?.click()}
                      >
                        Replace
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        loading={updateProfile.isPending}
                        onClick={() =>
                          updateProfile.mutate({
                            id: p.id,
                            patch: { is_default: true },
                          })
                        }
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
          </div>
        ) : null}

        {/* Create a new named profile */}
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            Add a profile
          </p>
          <p className="mb-3 text-xs text-muted">
            Another positioning (e.g. “Product” or “Backend”) without replacing
            your default.
          </p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name (e.g. Product)"
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="…paste that CV's text here"
            rows={3}
            className="mt-3 w-full rounded-sm border border-line-strong bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-muted-2 focus:border-emerald focus:outline-2 focus:outline-emerald focus:outline-offset-1"
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
        </div>

        {upload.isError || createProfile.isError ? (
          <p className="mt-3 text-sm text-brick">
            {(upload.error ?? createProfile.error)?.message ??
              'Something went wrong.'}
          </p>
        ) : null}
      </SettingsPanel>
    </div>
  )
}