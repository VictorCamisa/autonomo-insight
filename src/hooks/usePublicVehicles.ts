import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export interface PublicVehicle {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year_fabrication: number;
  year_model: number;
  color: string;
  km: number;
  fuel_type: string;
  transmission: string;
  doors: number | null;
  sale_price: number | null;
  featured: boolean | null;
  images: {
    id: string;
    image_url: string;
    is_cover: boolean | null;
    display_order: number | null;
  }[];
}

type VehicleRow = Tables<'vehicles'>;
type ImageRow = Tables<'vehicle_images'>;

export function usePublicVehicles() {
  return useQuery({
    queryKey: ['public-vehicles'],
    queryFn: async (): Promise<PublicVehicle[]> => {
      // Buscar todos os veículos disponíveis e com featured = true (para o site público)
      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;
      const vehicles = data as VehicleRow[] | null;
      if (!vehicles || vehicles.length === 0) return [];

      // Filtrar apenas os featured (fallback caso RLS não permita ver todos)
      const featuredVehicles = vehicles.filter(v => v.featured === true);
      if (featuredVehicles.length === 0) return [];

      const vehicleIds = featuredVehicles.map(v => v.id);

      const { data: imgData, error: imagesError } = await supabase
        .from('vehicle_images')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;
      const images = imgData as ImageRow[] | null;

      return featuredVehicles.map(vehicle => {
        // Usar imagens da tabela vehicle_images ou do campo images do veículo
        const vehicleImages = (images || [])
          .filter(img => img.vehicle_id === vehicle.id)
          .map(img => ({ id: img.id, image_url: img.image_url, is_cover: img.is_cover, display_order: img.display_order }));

        // Se não há imagens na tabela, usar o array images do veículo
        const finalImages = vehicleImages.length > 0 
          ? vehicleImages 
          : (vehicle.images || []).map((url, idx) => ({
              id: `img-${idx}`,
              image_url: url,
              is_cover: idx === 0,
              display_order: idx
            }));

        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          version: vehicle.version,
          year_fabrication: vehicle.year_fabrication,
          year_model: vehicle.year_model,
          color: vehicle.color,
          km: vehicle.km,
          fuel_type: vehicle.fuel_type,
          transmission: vehicle.transmission,
          doors: vehicle.doors,
          sale_price: vehicle.sale_price,
          featured: vehicle.featured,
          images: finalImages
        };
      });
    },
  });
}

export function usePublicVehicle(id: string) {
  return useQuery({
    queryKey: ['public-vehicle', id],
    queryFn: async (): Promise<PublicVehicle> => {
      const { data, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .eq('status', 'disponivel')
        .single();

      if (vehicleError) throw vehicleError;
      const vehicle = data as VehicleRow | null;
      if (!vehicle) throw new Error('Vehicle not found');

      const { data: imgData, error: imagesError } = await supabase
        .from('vehicle_images')
        .select('*')
        .eq('vehicle_id', id)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;
      const images = imgData as ImageRow[] | null;

      return {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
        year_fabrication: vehicle.year_fabrication,
        year_model: vehicle.year_model,
        color: vehicle.color,
        km: vehicle.km,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        doors: vehicle.doors,
        sale_price: vehicle.sale_price,
        featured: vehicle.featured,
        images: (images || []).map(img => ({ id: img.id, image_url: img.image_url, is_cover: img.is_cover, display_order: img.display_order }))
      };
    },
    enabled: !!id,
  });
}

export function useFeaturedVehicles(limit = 6) {
  return useQuery({
    queryKey: ['featured-vehicles', limit],
    queryFn: async (): Promise<PublicVehicle[]> => {
      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Buscar mais para filtrar os featured

      if (vehiclesError) throw vehiclesError;
      const vehicles = data as VehicleRow[] | null;
      if (!vehicles || vehicles.length === 0) return [];

      // Filtrar featured e limitar
      const featuredVehicles = vehicles.filter(v => v.featured === true).slice(0, limit);
      if (featuredVehicles.length === 0) return [];

      const vehicleIds = featuredVehicles.map(v => v.id);

      const { data: imgData, error: imagesError } = await supabase
        .from('vehicle_images')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;
      const images = imgData as ImageRow[] | null;

      return featuredVehicles.map(vehicle => {
        const vehicleImages = (images || [])
          .filter(img => img.vehicle_id === vehicle.id)
          .map(img => ({ id: img.id, image_url: img.image_url, is_cover: img.is_cover, display_order: img.display_order }));

        const finalImages = vehicleImages.length > 0 
          ? vehicleImages 
          : (vehicle.images || []).map((url, idx) => ({
              id: `img-${idx}`,
              image_url: url,
              is_cover: idx === 0,
              display_order: idx
            }));

        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          version: vehicle.version,
          year_fabrication: vehicle.year_fabrication,
          year_model: vehicle.year_model,
          color: vehicle.color,
          km: vehicle.km,
          fuel_type: vehicle.fuel_type,
          transmission: vehicle.transmission,
          doors: vehicle.doors,
          sale_price: vehicle.sale_price,
          featured: vehicle.featured,
          images: finalImages
        };
      });
    },
  });
}
