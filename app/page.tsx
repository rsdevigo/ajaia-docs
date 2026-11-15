import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";
import ImportFile from "@/components/ImportFile";
import NewDocumentButton from "@/components/NewDocumentButton";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsForUser, type DocumentListItem } from "@/lib/documents";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function DocumentRow({ doc, showOwner }: { doc: DocumentListItem; showOwner: boolean }) {
  return (
    <li className="flex items-center gap-2 rounded border bg-white px-4 py-3 hover:border-blue-400">
      <Link href={`/documents/${doc.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{doc.title}</p>
          <p className="text-xs text-gray-500">
            {showOwner && <>Owner: {doc.ownerName} · </>}
            Edited {dateFormat.format(doc.updatedAt)}
          </p>
        </div>
        {showOwner && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">
            {doc.role}
          </span>
        )}
      </Link>
      {doc.role === "owner" && <DeleteDocumentButton id={doc.id} title={doc.title} />}
    </li>
  );
}

function Section({
  title,
  docs,
  showOwner,
  empty,
}: {
  title: string;
  docs: DocumentListItem[];
  showOwner: boolean;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {docs.length === 0 ? (
        <p className="rounded border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-500">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <DocumentRow key={d.id} doc={d} showOwner={showOwner} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, sharedWithMe } = await listDocumentsForUser(user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <NewDocumentButton />
      </div>
      <ImportFile />
      <Section
        title="My documents"
        docs={owned}
        showOwner={false}
        empty="You haven't created any documents yet. Click “New document” to start."
      />
      <Section
        title="Shared with me"
        docs={sharedWithMe}
        showOwner
        empty="Nothing has been shared with you yet."
      />
    </main>
  );
}
