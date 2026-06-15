# a — Flashcards

## Flashcard 1
**Q:** What is the ReAct pattern and why is it important for agents?
**A:** ReAct interleaves reasoning (plan), actions (tool calls), and observations (tool results). It improves factuality because the agent looks up information instead of guessing. The engineering challenge is controlling loops, tool misuse, and context growth.

## Flashcard 2
**Q:** How do you prevent prompt injection in agent systems using RAG and tools?
**A:** Treat retrieved text as untrusted. Use a strict system policy: never follow instructions from documents, only extract facts. Separate tool outputs from system instructions. Validate tool arguments, restrict tool capabilities, and use allowlists/sandboxes. Apply content filters and always enforce policy in code, not just prompts.

## Flashcard 3
**Q:** Explain the difference between short-term and long-term memory in agents, and when to use each storage type.
**A:** Short-term memory is the immediate context window (recent turns, tool outputs). Long-term memory is stored externally (databases, vector stores). Use summaries for session events (decisions, preferences), embeddings for large semantic retrieval (docs, past tickets), and structured memory for stable facts (user units/language). Combine them for effective recall.

## Flashcard 4
**Q:** What is context budgeting and why is it important for agent reliability?
**A:** Context budgeting is allocating the limited context window among instructions, recent chat, retrieved docs, and memory. For example, max 30% for retrieved docs, 20% for memory summary. When budgets are exceeded, compress via summarization, deduplication, and dropping low-value content. This prevents critical instructions from being crowded out, ensuring agent behavior remains stable.

## Flashcard 5
**Q:** How do you choose between dense, sparse, and hybrid retrieval for RAG?
**A:** Dense retrieval (embeddings) matches meaning; sparse retrieval (BM25) excels at exact keywords. Hybrid combines both for better recall, especially for technical terms or mixed queries. Many production systems use hybrid retrieval then re-rank with a cross-encoder or LLM. The choice depends on domain, language, and whether exact matches are important.

## Flashcard 6
**Q:** What is checkpointing and why is it critical for production agents?
**A:** Checkpointing saves the workflow state after each step (inputs, tool calls, outputs, prompt versions). It enables resumption after failures, timeouts, or human approvals. It also supports auditability, reproducibility, and debugging by allowing you to replay a run from a given point.

## Flashcard 7
**Q:** What are the key differences between a supervisor agent and a single agent with tools?
**A:** A single agent with tools is one decision-maker calling external functions. A supervisor agent coordinates specialist agents (retriever, coder, critic) by routing tasks and merging outputs. Multi-agent improves specialization and safety but adds coordination overhead and can hide errors if not instrumented. Use multi-agent only when tasks truly benefit from decomposition.

## Flashcard 8
**Q:** How do you ensure tool safety in a multi-agent system?
**A:** Centralize tool execution behind a policy gate. Even if a specialist agent requests a tool, the executor enforces allowlists, scopes, rate limits, and human-in-the-loop for high-risk actions. Restrict each agent's tool set to what is needed (least privilege). Log all requests and rejections. This reduces blast radius if an agent is compromised or confused.

## Flashcard 9
**Q:** Describe a practical multi-agent design for producing a report with RAG.
**A:** Use a retriever agent to gather and rank sources, a summarizer agent to extract key points with citations, a writer agent to draft the report, and a critic agent to check for unsupported claims. A supervisor orchestrates: retrieve → summarize → draft → verify. If verification fails, loop back to retrieval. This balances quality and grounding.

## Flashcard 10
**Q:** What are the most important observability signals for debugging agent behavior?
**A:** Structured logs with request IDs, tracing spans for each agent step and tool call, and metrics for latency, token usage, and errors. Capture prompts and tool arguments (sanitized). Add a replay mechanism to reproduce a run from a trace ID. This is essential for diagnosing intermittent failures and understanding 'why the agent did that'.

## Flashcard 11
**Q:** How do you handle streaming responses in a production agent API?
**A:** Stream tokens from the model when possible for better UX. For tool calls, stream progress events (e.g., 'Searching...', 'Calling API...') instead of raw tool outputs. Ensure backpressure and timeouts. If streaming fails, fall back to a full response. Streaming does not replace correctness or citations; it is a UX layer.

## Flashcard 12
**Q:** What is the biggest anti-pattern when adopting an agent framework, and how do you avoid it?
**A:** The biggest anti-pattern is copy-pasting demo code and treating the framework as the architecture. Framework is an implementation tool; architecture is your state model, tool boundaries, data contracts, and safety rules. Avoid by starting small, hardening layers (schemas, error handling, evaluation), and isolating framework-specific code so core logic remains portable.

## Flashcard 13
**Q:** Explain the concept of 'grounded generation' and how to enforce citations in RAG.
**A:** Grounded generation means every model claim should be supported by retrieved evidence. Enforce citations by formatting retrieved chunks with IDs and requiring the model to reference them in its output. You can then automatically verify that cited chunks actually support the statement, reducing hallucinated references.

## Flashcard 14
**Q:** What are common failure modes of long-term memory and their mitigations?
**A:** Common failures: retrieving irrelevant chunks, storing noisy/unverified information, feedback loops where hallucinations get stored as memory, stale preferences, and conflicting memories. Mitigations: validate before storing (store only verified facts), use decay/expiration, apply a 'do not store' policy for uncertain content, and always include provenance (source and timestamp).

## Flashcard 15
**Q:** How do you test probabilistic outputs of LLM-driven agents?
**A:** Test deterministic layers (parsers, tool adapters, routing rules) with unit tests. For LLM steps, use 'golden' prompts with snapshots and evaluate with metrics like exact match, JSON schema validity, or rubric-based scoring. Add integration tests that mock tools and control seeds/temperature. Goal is to detect regressions, not prove perfect correctness.

---
> Generated by Smart PDF Lecture Summarizer on 2026-06-15
