import { createFileRoute } from '@tanstack/react-router'

import { VersionDetailPage } from '../features/resume-studio/pages/VersionDetailPage'

export const Route = createFileRoute('/_app/resume-studio/$versionId')({
  component: VersionDetailPage,
})
