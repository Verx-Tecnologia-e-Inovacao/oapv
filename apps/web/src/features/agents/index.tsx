import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "./components/page-header";
import { TemplatesList } from "./components/templates-list";
import { AgentDashboard } from "./components/agent-dashboard";

export default function AgentsInterfaceV2() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Agentes"
        description="Gerencie seus agentes em diferentes modelos"
      />

      <Tabs
        defaultValue="templates"
        className="mt-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Modelos</TabsTrigger>
          <TabsTrigger value="all-agents">Todos os Agentes</TabsTrigger>
        </TabsList>

        <TabsContent
          value="templates"
          className="mt-6"
        >
          <Suspense fallback={<p>Carregando...</p>}>
            <TemplatesList />
          </Suspense>
        </TabsContent>

        <TabsContent
          value="all-agents"
          className="mt-6"
        >
          <Suspense fallback={<p>Carregando...</p>}>
            <AgentDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
