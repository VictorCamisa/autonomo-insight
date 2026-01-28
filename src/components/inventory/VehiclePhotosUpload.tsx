import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Trash2,
  GripVertical,
  Tag,
  Filter
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Categorias disponíveis para fotos
const PHOTO_CATEGORIES = [
  { value: 'geral', label: 'Geral', color: 'bg-gray-500' },
  { value: 'exterior_frontal', label: 'Exterior - Frontal', color: 'bg-blue-500' },
  { value: 'exterior_traseira', label: 'Exterior - Traseira', color: 'bg-blue-600' },
  { value: 'exterior_lateral_esq', label: 'Exterior - Lateral Esquerda', color: 'bg-blue-400' },
  { value: 'exterior_lateral_dir', label: 'Exterior - Lateral Direita', color: 'bg-blue-300' },
  { value: 'interior_painel', label: 'Interior - Painel', color: 'bg-green-500' },
  { value: 'interior_bancos', label: 'Interior - Bancos', color: 'bg-green-600' },
  { value: 'interior_traseiro', label: 'Interior - Banco Traseiro', color: 'bg-green-400' },
  { value: 'interior_porta_malas', label: 'Interior - Porta-malas', color: 'bg-green-300' },
  { value: 'motor', label: 'Motor', color: 'bg-orange-500' },
  { value: 'rodas', label: 'Rodas/Pneus', color: 'bg-purple-500' },
  { value: 'documentos', label: 'Documentos', color: 'bg-yellow-500' },
  { value: 'detalhes', label: 'Detalhes', color: 'bg-pink-500' },
];

interface VehicleImage {
  id: string;
  vehicle_id: string;
  image_url: string;
  is_cover: boolean | null;
  display_order: number | null;
  category: string | null;
  created_at: string;
}

interface VehiclePhotosUploadProps {
  vehicleId: string;
  images: string[] | null;
  onImagesUpdate: (images: string[]) => void;
  isManager: boolean;
}

export function VehiclePhotosUpload({ vehicleId, images, onImagesUpdate, isManager }: VehiclePhotosUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('geral');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Buscar imagens da tabela vehicle_images com categoria
  const { data: vehicleImages = [], refetch: refetchImages } = useQuery({
    queryKey: ['vehicle-images-with-category', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_images')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching vehicle images:', error);
        return [];
      }
      return (data || []) as VehicleImage[];
    },
  });

  // Sincronizar imagens antigas (da coluna vehicles.images) para vehicle_images
  const syncLegacyImages = async () => {
    if (!images || images.length === 0 || vehicleImages.length > 0) return;
    
    setIsSyncing(true);
    try {
      // Verificar quais imagens já existem na tabela vehicle_images
      const existingUrls = vehicleImages.map(img => img.image_url);
      const newImages = images.filter(url => !existingUrls.includes(url));
      
      if (newImages.length > 0) {
        const insertData = newImages.map((url, index) => ({
          vehicle_id: vehicleId,
          image_url: url,
          category: 'geral',
          display_order: index,
          is_cover: index === 0
        }));

        const { error } = await supabase
          .from('vehicle_images')
          .insert(insertData);

        if (error) {
          console.error('Error syncing legacy images:', error);
          toast.error('Erro ao sincronizar fotos antigas');
        } else {
          await refetchImages();
          toast.success(`${newImages.length} foto(s) sincronizada(s)! Agora você pode categorizar cada uma.`);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sincronizar quando detectar imagens antigas
  useEffect(() => {
    if (images && images.length > 0 && vehicleImages.length === 0 && !isSyncing) {
      syncLegacyImages();
    }
  }, [images, vehicleImages.length]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let uploaded = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máximo 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${vehicleId}/${Date.now()}-${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('vehicle-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(fileName);

        // Inserir na tabela vehicle_images com categoria
        const maxOrder = vehicleImages.length > 0 
          ? Math.max(...vehicleImages.map(img => img.display_order || 0)) 
          : -1;

        const { error: insertError } = await supabase
          .from('vehicle_images')
          .insert({
            vehicle_id: vehicleId,
            image_url: urlData.publicUrl,
            category: selectedCategory,
            display_order: maxOrder + 1 + i,
            is_cover: vehicleImages.length === 0 && i === 0
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error(`Erro ao salvar ${file.name}`);
          continue;
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / totalFiles) * 100));
      }

      // Atualizar também a coluna images do veículo (fallback)
      const allImages = [...(images || [])];
      const newImages = await supabase
        .from('vehicle_images')
        .select('image_url')
        .eq('vehicle_id', vehicleId)
        .order('display_order', { ascending: true });
      
      if (newImages.data) {
        const imageUrls = newImages.data.map(img => img.image_url);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('vehicles')
          .update({ images: imageUrls })
          .eq('id', vehicleId);
        
        onImagesUpdate(imageUrls);
      }

      await refetchImages();
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`${uploaded} foto(s) enviada(s) com sucesso na categoria "${PHOTO_CATEGORIES.find(c => c.value === selectedCategory)?.label}"`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar fotos');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (image: VehicleImage) => {
    try {
      // Deletar da tabela vehicle_images
      const { error } = await supabase
        .from('vehicle_images')
        .delete()
        .eq('id', image.id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Erro ao remover foto');
        return;
      }

      // Atualizar coluna images do veículo
      const remainingImages = vehicleImages
        .filter(img => img.id !== image.id)
        .map(img => img.image_url);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('vehicles')
        .update({ images: remainingImages })
        .eq('id', vehicleId);

      onImagesUpdate(remainingImages);
      await refetchImages();
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Foto removida com sucesso');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const setMainImage = async (image: VehicleImage) => {
    try {
      // Remover is_cover de todas as outras imagens
      await supabase
        .from('vehicle_images')
        .update({ is_cover: false })
        .eq('vehicle_id', vehicleId);

      // Definir a nova imagem como cover
      await supabase
        .from('vehicle_images')
        .update({ is_cover: true, display_order: 0 })
        .eq('id', image.id);

      // Reordenar para que a imagem principal seja a primeira
      const reorderedImages = [
        image.image_url,
        ...vehicleImages.filter(img => img.id !== image.id).map(img => img.image_url)
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('vehicles')
        .update({ images: reorderedImages })
        .eq('id', vehicleId);

      onImagesUpdate(reorderedImages);
      await refetchImages();
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Foto principal atualizada');
    } catch (error) {
      console.error('Set main image error:', error);
      toast.error('Erro ao definir foto principal');
    }
  };

  const updateImageCategory = async (image: VehicleImage, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_images')
        .update({ category: newCategory })
        .eq('id', image.id);

      if (error) {
        console.error('Update category error:', error);
        toast.error('Erro ao atualizar categoria');
        return;
      }

      await refetchImages();
      toast.success('Categoria atualizada');
    } catch (error) {
      console.error('Update category error:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  // Filtrar imagens por categoria
  const filteredImages = filterCategory === 'all' 
    ? vehicleImages 
    : vehicleImages.filter(img => img.category === filterCategory);

  // Contagem por categoria
  const categoryCounts = PHOTO_CATEGORIES.map(cat => ({
    ...cat,
    count: vehicleImages.filter(img => img.category === cat.value).length
  }));

  const getCategoryInfo = (categoryValue: string | null) => {
    return PHOTO_CATEGORIES.find(c => c.value === categoryValue) || PHOTO_CATEGORIES[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Fotos do Veículo
        </CardTitle>
        <CardDescription>
          {vehicleImages.length} foto(s) • A primeira foto será a principal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {isManager && (
          <div className="space-y-3">
            {/* Seletor de Categoria para Upload */}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Categoria para upload:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
                disabled={isUploading}
              />
              <label 
                htmlFor="photo-upload" 
                className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm font-medium">Enviando... {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm font-medium">Clique para adicionar fotos</span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP (máx. 5MB cada) • Categoria: <strong>{getCategoryInfo(selectedCategory).label}</strong>
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Filtro por Categoria */}
        {vehicleImages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por categoria:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterCategory('all')}
              >
                Todas ({vehicleImages.length})
              </Badge>
              {categoryCounts.filter(c => c.count > 0).map((cat) => (
                <Badge 
                  key={cat.value}
                  variant={filterCategory === cat.value ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterCategory(cat.value)}
                >
                  <div className={`w-2 h-2 rounded-full ${cat.color} mr-1`} />
                  {cat.label} ({cat.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Images Grid */}
        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => {
              const categoryInfo = getCategoryInfo(image.category);
              return (
                <div 
                  key={image.id} 
                  className={`relative group aspect-video rounded-lg overflow-hidden border ${image.is_cover ? 'ring-2 ring-primary' : ''}`}
                >
                  <img
                    src={image.image_url}
                    alt={categoryInfo.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Badge for main image */}
                  {image.is_cover && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className={`absolute bottom-2 left-2 text-white text-xs px-2 py-1 rounded ${categoryInfo.color}`}>
                    {categoryInfo.label}
                  </div>

                  {/* Actions overlay */}
                  {isManager && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {/* Category Selector */}
                      <Select 
                        value={image.category || 'geral'} 
                        onValueChange={(val) => updateImageCategory(image, val)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs bg-white/90">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PHOTO_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-2">
                        {!image.is_cover && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-8 text-xs"
                            onClick={() => setMainImage(image)}
                          >
                            <GripVertical className="h-3 w-3 mr-1" />
                            Principal
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-8">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteImage(image)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{filterCategory === 'all' ? 'Nenhuma foto cadastrada' : 'Nenhuma foto nesta categoria'}</p>
            {isManager && filterCategory === 'all' && (
              <p className="text-sm">Clique acima para adicionar fotos</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}