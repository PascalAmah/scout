import { createFileRoute } from '@tanstack/react-router'

import { ResumeStudioIndexPage } from '../features/resume-studio/pages/ResumeStudioIndexPage'

export const Route = createFileRoute('/_app/resume-studio/')({
  component: ResumeStudioIndexPage,
})
