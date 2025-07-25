"use client";

import { useEffect, forwardRef, ForwardedRef, useState } from "react";
import { Lightbulb, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConfigField,
  ConfigFieldAgents,
  ConfigFieldRAG,
  ConfigFieldTool,
} from "@/features/chat/components/configuration-sidebar/config-field";
import { ConfigSection } from "@/features/chat/components/configuration-sidebar/config-section";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/hooks/use-agents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import _ from "lodash";
import { useMCPContext } from "@/providers/MCP";
import { Search } from "@/components/ui/tool-search";
import { useSearchTools } from "@/hooks/use-search-tools";
import { useFetchPreselectedTools } from "@/hooks/use-fetch-preselected-tools";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { useAgentsContext } from "@/providers/Agents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUserCreatedDefaultAssistant } from "@/lib/agent-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocalStorage } from "@/hooks/use-local-storage";

function NameAndDescriptionAlertDialog({
  name,
  setName,
  description,
  setDescription,
  open,
  setOpen,
  handleSave,
}: {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleSave: () => void;
}) {
  const handleSaveAgent = () => {
    setOpen(false);
    handleSave();
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nome e Descrição do Agente</AlertDialogTitle>
          <AlertDialogDescription>
            Por favor, dê um nome e uma descrição opcional para seu novo agente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              placeholder="Nome do Agente"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              placeholder="Descrição do Agente"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSaveAgent}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AIConfigPanelProps {
  className?: string;
  open: boolean;
}

export const ConfigurationSidebar = forwardRef<
  HTMLDivElement,
  AIConfigPanelProps
>(({ className, open }, ref: ForwardedRef<HTMLDivElement>) => {
  const { configsByAgentId, resetConfig } = useConfigStore();
  const { tools, setTools, getTools, cursor } = useMCPContext();
  const [agentId] = useQueryState("agentId");
  const [deploymentId] = useQueryState("deploymentId");
  const [threadId] = useQueryState("threadId");
  const { agents, refreshAgentsLoading } = useAgentsContext();
  const {
    getSchemaAndUpdateConfig,
    configurations,
    toolConfigurations,
    ragConfigurations,
    agentsConfigurations,
    loading,
    supportedConfigs,
  } = useAgentConfig();
  const { updateAgent, createAgent } = useAgents();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [
    openNameAndDescriptionAlertDialog,
    setOpenNameAndDescriptionAlertDialog,
  ] = useState(false);

  const { toolSearchTerm, debouncedSetSearchTerm, displayTools } =
    useSearchTools(tools, {
      preSelectedTools: toolConfigurations[0]?.default?.tools,
    });
  const { loadingMore, setLoadingMore } = useFetchPreselectedTools({
    tools,
    setTools,
    getTools,
    cursor,
    toolConfigurations,
    searchTerm: toolSearchTerm,
  });

  const [showProTipAlert, setShowProTipAlert] = useLocalStorage(
    "showProTipAlert",
    true,
  );

  useEffect(() => {
    if (
      !agentId ||
      !deploymentId ||
      loading ||
      !agents?.length ||
      refreshAgentsLoading
    )
      return;

    const selectedAgent = agents.find(
      (a) => a.assistant_id === agentId && a.deploymentId === deploymentId,
    );
    if (!selectedAgent) {
      toast.error("Falha ao obter configuração do agente.", {
        richColors: true,
      });
      return;
    }

    getSchemaAndUpdateConfig(selectedAgent);
  }, [agentId, deploymentId, agents, refreshAgentsLoading]);

  const handleSave = async () => {
    if (!agentId || !deploymentId || !agents?.length) return;
    const selectedAgent = agents.find(
      (a) => a.assistant_id === agentId && a.deploymentId === deploymentId,
    );
    if (!selectedAgent) {
      toast.error("Falha ao salvar configuração.", {
        richColors: true,
        description: "Não foi possível encontrar o agente selecionado.",
      });
      return;
    }
    if (isUserCreatedDefaultAssistant(selectedAgent) && !newName) {
      setOpenNameAndDescriptionAlertDialog(true);
      return;
    } else if (isUserCreatedDefaultAssistant(selectedAgent) && newName) {
      const newAgent = await createAgent(deploymentId, selectedAgent.graph_id, {
        name: newName,
        description: newDescription,
        config: configsByAgentId[agentId],
      });
      if (!newAgent) {
        toast.error("Falha ao criar agente", { richColors: true });
        return;
      }
      // Reload the page, using the new assistant ID and deployment ID
      const newQueryParams = new URLSearchParams({
        agentId: newAgent.assistant_id,
        deploymentId,
        ...(threadId ? { threadId } : {}),
      });
      window.location.href = `/?${newQueryParams.toString()}`;
      return;
    }

    const updatedAgent = await updateAgent(agentId, deploymentId, {
      config: configsByAgentId[agentId],
    });
    if (!updatedAgent) {
      toast.error("Falha ao atualizar configuração do agente");
      return;
    }

    toast.success("Configuração do agente salva com sucesso");
  };

  return (
    <div
      ref={ref}
      className={cn(
        "fixed top-0 right-0 z-10 h-screen border-l border-gray-200 bg-white shadow-lg transition-all duration-300",
        open ? "w-80 md:w-xl" : "w-0 overflow-hidden border-l-0",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold">Configuração do Agente</h2>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!agentId) return;
                        resetConfig(agentId);
                      }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Redefinir
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Redefinir a configuração para o último estado salvo</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="mr-1 h-4 w-4" />
                      Salvar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Salvar suas alterações no agente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {showProTipAlert && (
            <div className="p-4">
              <Alert variant="info">
                <Lightbulb className="size-4" />
                <AlertTitle>
                  Dica
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1 right-2 hover:bg-transparent"
                    onClick={() => setShowProTipAlert(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  As alterações feitas na configuração serão salvas
                  automaticamente, mas só serão mantidas entre sessões se você
                  clicar em "Salvar".
                </AlertDescription>
              </Alert>
            </div>
          )}
          <Tabs
            defaultValue="general"
            className="flex flex-1 flex-col overflow-y-auto"
          >
            <TabsList className="flex-shrink-0 justify-start bg-transparent px-4 pt-2">
              <TabsTrigger value="general">Geral</TabsTrigger>
              {supportedConfigs.includes("tools") && (
                <TabsTrigger value="tools">Ferramentas</TabsTrigger>
              )}
              {supportedConfigs.includes("rag") && (
                <TabsTrigger value="rag">RAG</TabsTrigger>
              )}
              {supportedConfigs.includes("supervisor") && (
                <TabsTrigger value="supervisor">
                  Agentes Supervisores
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="flex-1 overflow-y-auto">
              <TabsContent
                value="general"
                className="m-0 p-4"
              >
                <ConfigSection title="Configuração">
                  {loading || !agentId ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    configurations.map((c, index) => (
                      <ConfigField
                        key={`${c.label}-${index}`}
                        id={c.label}
                        label={c.label}
                        type={
                          c.type === "boolean" ? "switch" : (c.type ?? "text")
                        }
                        description={c.description}
                        placeholder={c.placeholder}
                        options={c.options}
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        agentId={agentId}
                      />
                    ))
                  )}
                </ConfigSection>
              </TabsContent>

              {supportedConfigs.includes("tools") && (
                <TabsContent
                  value="tools"
                  className="m-0 overflow-y-auto p-4"
                >
                  <ConfigSection title="Ferramentas Disponíveis">
                    <Search
                      onSearchChange={debouncedSetSearchTerm}
                      placeholder="Buscar ferramentas..."
                    />
                    <div className="flex-1 space-y-4 overflow-y-auto rounded-md">
                      {agentId &&
                        displayTools.length > 0 &&
                        displayTools.map((c, index) => (
                          <ConfigFieldTool
                            key={`${c.name}-${index}`}
                            id={c.name}
                            label={c.name}
                            description={c.description}
                            agentId={agentId}
                            toolId={toolConfigurations[0]?.label}
                          />
                        ))}
                      {agentId &&
                        displayTools.length === 0 &&
                        toolSearchTerm && (
                          <p className="mt-4 text-center text-sm text-slate-500">
                            Nenhuma ferramenta encontrada com "{toolSearchTerm}
                            ".
                          </p>
                        )}
                      {!agentId && (
                        <p className="mt-4 text-center text-sm text-slate-500">
                          Selecione um agente para ver as ferramentas.
                        </p>
                      )}
                      {agentId && tools.length === 0 && !toolSearchTerm && (
                        <p className="mt-4 text-center text-sm text-slate-500">
                          Nenhuma ferramenta disponível para este agente.
                        </p>
                      )}
                      {cursor && !toolSearchTerm && (
                        <div className="flex justify-center py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setLoadingMore(true);
                                const moreTool = await getTools(cursor);
                                setTools((prevTools) => [
                                  ...prevTools,
                                  ...moreTool,
                                ]);
                              } catch (error) {
                                console.error(
                                  "Failed to load more tools:",
                                  error,
                                );
                              } finally {
                                setLoadingMore(false);
                              }
                            }}
                            disabled={loadingMore || loading}
                          >
                            {loadingMore ? "Carregando..." : "Carregar mais"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </ConfigSection>
                </TabsContent>
              )}

              {supportedConfigs.includes("rag") && (
                <TabsContent
                  value="rag"
                  className="m-0 overflow-y-auto p-4"
                >
                  <ConfigSection title="RAG do Agente">
                    {agentId && (
                      <ConfigFieldRAG
                        id={ragConfigurations[0].label}
                        label={ragConfigurations[0].label}
                        agentId={agentId}
                      />
                    )}
                  </ConfigSection>
                </TabsContent>
              )}

              {supportedConfigs.includes("supervisor") && (
                <TabsContent
                  value="supervisor"
                  className="m-0 overflow-y-auto p-4"
                >
                  <ConfigSection title="Agentes Supervisores">
                    {agentId && (
                      <ConfigFieldAgents
                        id={agentsConfigurations[0].label}
                        label={agentsConfigurations[0].label}
                        agentId={agentId}
                      />
                    )}
                  </ConfigSection>
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      )}
      <NameAndDescriptionAlertDialog
        name={newName}
        setName={setNewName}
        description={newDescription}
        setDescription={setNewDescription}
        open={openNameAndDescriptionAlertDialog}
        setOpen={setOpenNameAndDescriptionAlertDialog}
        handleSave={handleSave}
      />
    </div>
  );
});

ConfigurationSidebar.displayName = "ConfigurationSidebar";
