import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";

interface AskResponse {
  answer: string;
  method: "direct-query" | "ai" | "unsupported" | "error";
}

const SUGGESTED = ["Show today's enquiries", "Which proposals are pending?", "Which projects are delayed?", "Show monthly revenue"];

export function AiAssistantPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Array<{ question: string; response: AskResponse }>>([]);

  const ask = useMutation({
    mutationFn: (q: string) => api.post<AskResponse>("/ai/ask", { question: q }),
    onSuccess: (response, q) => setHistory((h) => [...h, { question: q, response }]),
  });

  const handleAsk = (q: string) => {
    if (!q.trim()) return;
    ask.mutate(q);
    setQuestion("");
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">AI Business Assistant</h1>
        <p className="text-sm text-white/40 mt-1">
          A few questions are answered directly from live data. Everything else needs an AI key configured — see the
          README.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => handleAsk(s)} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white/60 hover:text-white">
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {history.map((entry, i) => (
          <Card key={i}>
            <div className="text-sm text-white/50 mb-2">You asked: {entry.question}</div>
            <div className="text-sm text-white">{entry.response.answer}</div>
            <div className="text-[10px] text-white/30 mt-2 uppercase tracking-wide">{entry.response.method}</div>
          </Card>
        ))}
        {ask.isPending && <p className="text-xs text-white/40">Thinking…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about leads, proposals, projects, revenue…"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-indigo"
        />
        <button type="submit" className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4">
          Ask
        </button>
      </form>
    </div>
  );
}
