import { useState, useRef } from 'react';
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
  GripVertical
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

interface VehiclePhotosUploadProps {
  vehicleId: string;
  images: string[] | null;
  onImagesUpdate: (images: string[]) => void;
  isManager: boolean;
}

export function VehiclePhotosUpload({ vehicleId, images, onImagesUpdate, isManager }: VehiclePhotosUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [...(images || [])];
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

        uploadedUrls.push(urlData.publicUrl);
        uploaded++;
        setUploadProgress(Math.round((uploaded / totalFiles) * 100));
      }

      // Update vehicle with new images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('vehicles')
        .update({ images: uploadedUrls })
        .eq('id', vehicleId);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Erro ao atualizar veículo');
      } else {
        onImagesUpdate(uploadedUrls);
        toast.success(`${uploaded} foto(s) enviada(s) com sucesso`);
      }
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

  const handleDeleteImage = async (imageUrl: string, index: number) => {
    try {
      // Deletar da tabela vehicle_images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from('vehicle_images')
        .delete()
        .eq('vehicle_id', vehicleId)
        .eq('image_url', imageUrl);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast.error('Erro ao remover foto');
        return;
      }

      // Atualizar lista local
      const newImages = (images || []).filter((_, i) => i !== index);
      onImagesUpdate(newImages);
      toast.success('Foto removida com sucesso');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const setMainImage = async (index: number) => {
    if (index === 0 || !images) return;
    
    try {
      // Reordenar array - mover imagem selecionada para primeira posição
      const newImages = [...images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected);

      // Atualizar no banco
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicles')
        .update({ images: newImages })
        .eq('id', vehicleId);

      if (error) {
        console.error('Set main image error:', error);
        toast.error('Erro ao definir foto principal');
      } else {
        onImagesUpdate(newImages);
        toast.success('Foto principal atualizada');
      }
    } catch (error) {
      console.error('Set main image error:', error);
      toast.error('Erro ao definir foto principal');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Fotos do Veículo
        </CardTitle>
        <CardDescription>
          {images?.length || 0} foto(s) • A primeira foto será a principal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {isManager && (
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
                    JPG, PNG, WEBP (máx. 5MB cada)
                  </span>
                </>
              )}
            </label>
          </div>
        )}

        {/* Images Grid */}
        {images && images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => (
              <div 
                key={index} 
                className={`relative group aspect-video rounded-lg overflow-hidden border ${index === 0 ? 'ring-2 ring-primary' : ''}`}
              >
                <img
                  src={imageUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                
                {/* Badge for main image */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Principal
                  </div>
                )}

                {/* Actions overlay */}
                {isManager && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {index !== 0 && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setMainImage(index)}
                      >
                        <GripVertical className="h-4 w-4 mr-1" />
                        Principal
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
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
                          <AlertDialogAction onClick={() => handleDeleteImage(imageUrl, index)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma foto cadastrada</p>
            {isManager && (
              <p className="text-sm">Clique acima para adicionar fotos</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
