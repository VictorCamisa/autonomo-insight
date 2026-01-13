import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export function useElevenLabsVoices() {
  return useQuery({
    queryKey: ['elevenlabs-voices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('elevenlabs-voices');
      
      if (error) {
        console.error('Error fetching ElevenLabs voices:', error);
        throw error;
      }
      
      return data.voices as ElevenLabsVoice[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: 1,
  });
}
