import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCVProfileRequest,
  cvProfilesRequest,
  cvRequest,
  deleteCVProfileRequest,
  updateCVProfileRequest,
  uploadCVRequest,
  type CVProfilePatch,
} from './api'

const CV_KEYS = ['cv', 'cv-profiles']

function invalidateCv(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of CV_KEYS) void queryClient.invalidateQueries({ queryKey: [key] })
  void queryClient.invalidateQueries({ queryKey: ['matches'] })
}

export function useCV() {
  return useQuery({
    queryKey: ['cv'],
    queryFn: cvRequest,
    retry: false,
  })
}

export function useCVProfiles() {
  return useQuery({
    queryKey: ['cv-profiles'],
    queryFn: cvProfilesRequest,
    retry: false,
  })
}

export function useUploadCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, text }: { file?: File; text?: string }) => uploadCVRequest(file, text),
    onSuccess: () => invalidateCv(queryClient),
  })
}

export function useCreateCVProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, file, text }: { name: string; file?: File; text?: string }) =>
      createCVProfileRequest(name, file, text),
    onSuccess: () => invalidateCv(queryClient),
  })
}

export function useUpdateCVProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CVProfilePatch }) =>
      updateCVProfileRequest(id, patch),
    onSuccess: () => invalidateCv(queryClient),
  })
}

export function useDeleteCVProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCVProfileRequest(id),
    onSuccess: () => invalidateCv(queryClient),
  })
}
