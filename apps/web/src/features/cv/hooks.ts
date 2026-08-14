import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cvRequest, uploadCVRequest } from './api'

export function useCV() {
  return useQuery({
    queryKey: ['cv'],
    queryFn: cvRequest,
    retry: false,
  })
}

export function useUploadCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, text }: { file?: File; text?: string }) => uploadCVRequest(file, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cv'] })
      void queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}