import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderPlus, Layers } from "lucide-react";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { useState } from "react";
import { useRagContext } from "../providers/RAG";
import { toast } from "sonner";

export default function EmptyCollectionsState() {
  const [open, setOpen] = useState(false);
  const { createCollection, setSelectedCollection } = useRagContext();

  const handleSubmit = async (name: string, description: string) => {
    const loadingToast = toast.loading("Criando coleção", {
      richColors: true,
    });
    const newCollection = await createCollection(name, {
      description,
    });
    toast.dismiss(loadingToast);
    if (newCollection) {
      setOpen(false);
      toast.success("Coleção criada com sucesso", { richColors: true });
      setSelectedCollection(newCollection);
    } else {
      toast.warning(
        `Coleção com nome '${name}' não pôde ser criada (provavelmente já existe).`,
        {
          duration: 5000,
          richColors: true,
        },
      );
    }
  };

  return (
    <Card className="bg-muted/20 border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center space-y-6 px-6 py-12 text-center">
        <div className="bg-primary/10 rounded-full p-4">
          <Layers className="text-primary h-12 w-12" />
        </div>

        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            Nenhuma coleção ainda
          </h3>
          <p className="text-muted-foreground">
            Coleções ajudam você a organizar seus documentos e recursos em um
            único lugar. Crie sua primeira coleção para começar.
          </p>
        </div>

        <CreateCollectionDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmit}
          trigger={
            <Button
              variant="brand"
              size="lg"
              className="mt-4 gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Criar sua primeira coleção
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
