import { ContactsListView } from '@/components/crm/ContactsListView';

export default function Leads() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contatos</h1>
        <p className="text-muted-foreground">Visão unificada de todos os leads e clientes</p>
      </div>

      {/* Content */}
      <ContactsListView />
    </div>
  );
}
