import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileWithMatch {
  file: File;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export default function BulkPhotoUpload() {
  const { data: vehicles = [] } = useVehicles();
  const [files, setFiles] = useState<FileWithMatch[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeText = (text: string) => {
    return text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  };

  const findVehicleByFilename = (filename: string) => {
    const normalizedFilename = normalizeText(filename);
    
    for (const vehicle of vehicles) {
      if (!vehicle.plate) continue;
      const normalizedPlate = normalizeText(vehicle.plate);
      
      if (normalizedFilename.includes(normalizedPlate)) {
        return {
          id: vehicle.id,
          plate: vehicle.plate,
          model: `${vehicle.brand} ${vehicle.model}`
        };
      }
    }
    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesWithMatch: FileWithMatch[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const match = findVehicleByFilename(file.name);
      
      filesWithMatch.push({
        file,
        vehicleId: match?.id || null,
        vehiclePlate: match?.plate || null,
        vehicleModel: match?.model || null,
        status: 'pending'
      });
    }

    setFiles(prev => [...prev, ...filesWithMatch]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    const filesToUpload = files.filter(f => f.vehicleId && f.status === 'pending');
    
    if (filesToUpload.length === 0) {
      toast.error('Nenhum arquivo com veículo associado para enviar');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let completed = 0;
    const total = filesToUpload.length;

    // Group files by vehicle
    const filesByVehicle: Record<string, FileWithMatch[]> = {};
    filesToUpload.forEach(f => {
      if (!f.vehicleId) return;
      if (!filesByVehicle[f.vehicleId]) {
        filesByVehicle[f.vehicleId] = [];
      }
      filesByVehicle[f.vehicleId].push(f);
    });

    for (const vehicleId of Object.keys(filesByVehicle)) {
      const vehicleFiles = filesByVehicle[vehicleId];
      const uploadedUrls: string[] = [];

      // Get existing images for this vehicle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vehicle } = await (supabase as any)
        .from('vehicles')
        .select('images')
        .eq('id', vehicleId)
        .single();

      const existingImages = vehicle?.images || [];

      for (const fileData of vehicleFiles) {
        // Update status
        setFiles(prev => prev.map(f => 
          f.file === fileData.file ? { ...f, status: 'uploading' as const } : f
        ));

        try {
          const fileExt = fileData.file.name.split('.').pop();
          const fileName = `${vehicleId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          const { error } = await supabase.storage
            .from('vehicle-images')
            .upload(fileName, fileData.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(urlData.publicUrl);

          setFiles(prev => prev.map(f => 
            f.file === fileData.file ? { ...f, status: 'success' as const } : f
          ));
        } catch (error) {
          console.error('Upload error:', error);
          setFiles(prev => prev.map(f => 
            f.file === fileData.file ? { ...f, status: 'error' as const, errorMessage: 'Erro no upload' } : f
          ));
        }

        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      // Update vehicle with all new images
      if (uploadedUrls.length > 0) {
        const allImages = [...existingImages, ...uploadedUrls];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('vehicles')
          .update({ images: allImages })
          .eq('id', vehicleId);
      }
    }

    setIsUploading(false);
    
    const successCount = files.filter(f => f.status === 'success').length;
    toast.success(`${successCount} foto(s) enviada(s) com sucesso!`);
  };

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };

  const clearAll = () => {
    setFiles([]);
    setUploadProgress(0);
  };

  const matchedCount = files.filter(f => f.vehicleId).length;
  const unmatchedCount = files.filter(f => !f.vehicleId).length;
  const pendingCount = files.filter(f => f.status === 'pending' && f.vehicleId).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
          <h1 className="text-2xl font-bold">Upload em Massa de Fotos</h1>
          <p className="text-muted-foreground">
            Envie várias fotos de uma vez. Nomeie os arquivos com a placa do veículo para associação automática.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Selecionar Fotos
            </CardTitle>
            <CardDescription>
              Ex: <code className="bg-muted px-1 rounded">ABC1234_foto1.jpg</code>, <code className="bg-muted px-1 rounded">DEF5678_2.png</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="bulk-upload"
                disabled={isUploading}
              />
              <label 
                htmlFor="bulk-upload" 
                className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <span className="text-lg font-medium">Clique ou arraste fotos aqui</span>
                <span className="text-sm text-muted-foreground">
                  JPG, PNG, WEBP (máx. 5MB cada)
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="default">{matchedCount} associadas</Badge>
                    {unmatchedCount > 0 && (
                      <Badge variant="destructive">{unmatchedCount} sem veículo</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Limpar tudo
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {files.map((fileData, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          fileData.vehicleId ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {fileData.status === 'pending' && (
                            fileData.vehicleId ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )
                          )}
                          {fileData.status === 'uploading' && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          )}
                          {fileData.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {fileData.status === 'error' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          
                          <div>
                            <p className="font-medium text-sm">{fileData.file.name}</p>
                            {fileData.vehicleId ? (
                              <p className="text-xs text-muted-foreground">
                                → {fileData.vehiclePlate} - {fileData.vehicleModel}
                              </p>
                            ) : (
                              <p className="text-xs text-yellow-600">
                                Placa não encontrada no nome do arquivo
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {fileData.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(fileData.file)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-center text-muted-foreground">
                      Enviando... {uploadProgress}%
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleUpload}
                  disabled={isUploading || pendingCount === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar {pendingCount} foto(s)
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
