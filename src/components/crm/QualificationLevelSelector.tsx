import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Target, 
  ChevronDown, 
  Zap, 
  Scale, 
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useQualificationLevels, 
  useCurrentQualificationLevel, 
  useSetCurrentQualificationLevel,
  FIELD_LABELS
} from '@/hooks/useQualificationSettings';
import { cn } from '@/lib/utils';

const levelIcons: Record<string, React.ReactNode> = {
  Q1: <Zap className="h-4 w-4 text-yellow-500" />,
  Q2: <Scale className="h-4 w-4 text-blue-500" />,
  Q3: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const levelColors: Record<string, string> = {
  Q1: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  Q2: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  Q3: 'bg-green-500/10 text-green-700 border-green-500/30',
};

export function QualificationLevelSelector() {
  const { data: levels = [] } = useQualificationLevels();
  const { data: currentLevel = 'Q2' } = useCurrentQualificationLevel();
  const setLevelMutation = useSetCurrentQualificationLevel();
  
  const [open, setOpen] = useState(false);
  
  const currentLevelData = levels.find(l => l.level === currentLevel);
  
  const handleSelect = (level: string) => {
    if (level !== currentLevel) {
      setLevelMutation.mutate(level);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 border",
            levelColors[currentLevel] || 'bg-muted'
          )}
        >
          <Target className="h-4 w-4" />
          <span className="font-semibold">{currentLevel}</span>
          <span className="hidden sm:inline text-xs opacity-80">
            {currentLevelData?.name || 'Qualificação'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Nível de Qualificação
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {levels.map((level) => (
          <DropdownMenuItem 
            key={level.level}
            onClick={() => handleSelect(level.level)}
            className={cn(
              "flex flex-col items-start gap-1 py-3 cursor-pointer",
              currentLevel === level.level && "bg-muted"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              {levelIcons[level.level]}
              <span className="font-semibold">{level.level}</span>
              <span className="text-sm">{level.name}</span>
              {currentLevel === level.level && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              {level.description}
            </p>
            <div className="flex flex-wrap gap-1 pl-6 mt-1">
              {level.required_fields.slice(0, 4).map((field) => (
                <Badge key={field} variant="outline" className="text-[10px] py-0">
                  {FIELD_LABELS[field] || field}
                </Badge>
              ))}
              {level.required_fields.length > 4 && (
                <Badge variant="outline" className="text-[10px] py-0">
                  +{level.required_fields.length - 4}
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            A Gabi vai conduzir a conversa de acordo com o nível selecionado, coletando os dados correspondentes.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for header
export function QualificationLevelBadge() {
  const { data: currentLevel = 'Q2' } = useCurrentQualificationLevel();
  const { data: levels = [] } = useQualificationLevels();
  
  const currentLevelData = levels.find(l => l.level === currentLevel);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("cursor-default", levelColors[currentLevel])}>
          {levelIcons[currentLevel]}
          <span className="ml-1">{currentLevel}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{currentLevelData?.name}</p>
        <p className="text-xs text-muted-foreground">{currentLevelData?.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
