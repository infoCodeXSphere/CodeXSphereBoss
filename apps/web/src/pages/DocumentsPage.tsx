import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { FileText } from "lucide-react";

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  type: string;
  createdAt: string;
}

const DOC_TYPES = ["CONTRACT", "NDA", "PROPOSAL", "QUOTATION", "INVOICE", "DESIGN", "REQUIREMENT", "MEETING_NOTES", "TECHNICAL_DOC", "OTHER"];

export function DocumentsPage() {
  const { data: documents, isLoading } = useQuery({ queryKey: ["documents"], queryFn: () => api.get<Document[]>("/documents") });
  const [docType, setDocType] = useState("OTHER");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      return api.postForm("/documents", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Document Management</h1>
        <p className="text-sm text-white/40 mt-1">Contracts, NDAs, proposals, and technical documents — versioned.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
            }}
            className="text-sm text-white/60 file:bg-brand-indigo file:text-white file:border-0 file:rounded-lg file:px-3 file:py-2 file:text-sm file:mr-3"
          />
          {upload.isPending && <span className="text-xs text-white/40">Uploading…</span>}
        </div>
      </Card>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {documents?.map((doc) => (
          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer">
            <Card>
              <FileText size={18} className="text-brand-cyan mb-2" />
              <div className="text-sm text-white truncate">{doc.fileName}</div>
              <div className="text-xs text-white/40 mt-1">
                {doc.type.replace(/_/g, " ")} · {new Date(doc.createdAt).toLocaleDateString()}
              </div>
            </Card>
          </a>
        ))}
        {documents?.length === 0 && <p className="text-white/40 text-sm">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}
