// chat.js — Chat with PDF UI logic
import { sb } from './supabase-client.js';
import { esc } from './app.js';

export async function getChatHistory(documentId) {
  const { data, error } = await sb
    .from('chat_messages')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getChatHistory:', error); return []; }
  return data || [];
}

export async function sendChatMessage(documentId, message) {
  // Save user message
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await sb.from('chat_messages').insert({
    user_id: user.id,
    document_id: documentId,
    role: 'user',
    content: message,
  });

  // Call the chat-pdf Edge Function
  const { data, error } = await sb.functions.invoke('chat-pdf', {
    body: { document_id: documentId, message },
  });

  if (error) return { error };

  // Save assistant response
  if (data?.response) {
    await sb.from('chat_messages').insert({
      user_id: user.id,
      document_id: documentId,
      role: 'assistant',
      content: data.response,
    });
  }

  return { data };
}

export function renderChat(container, messages, onSend) {
  container.innerHTML = '';

  // Messages area
  const msgArea = document.createElement('div');
  msgArea.className = 'chat-messages';
  msgArea.id = 'chat-messages';

  if (messages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chat-empty';
    empty.innerHTML = '<p>Ask any question about this lecture PDF.</p><p class="chat-empty-hint">Examples: "What is the main topic?", "Explain the key formula", "Summarize chapter 3"</p>';
    msgArea.appendChild(empty);
  }

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-msg chat-${msg.role}`;
    div.innerHTML = `<div class="chat-bubble">${esc(msg.content).replace(/\n/g, '<br/>')}</div>`;
    msgArea.appendChild(div);
  });

  container.appendChild(msgArea);

  // Input area
  const inputWrap = document.createElement('div');
  inputWrap.className = 'chat-input-wrap';
  inputWrap.innerHTML = `
    <input type="text" class="chat-input" placeholder="Ask a question about this PDF…" id="chat-input" />
    <button class="btn btn-accent btn-sm chat-send-btn" id="chat-send">Send</button>
  `;
  container.appendChild(inputWrap);

  // Wire up events
  const input = inputWrap.querySelector('#chat-input');
  const sendBtn = inputWrap.querySelector('#chat-send');

  const doSend = () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    onSend(msg);
  };

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  // Scroll to bottom
  setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
}

export function appendMessage(container, role, content) {
  const msgArea = container.querySelector('#chat-messages');
  if (!msgArea) return;

  // Remove empty state if present
  const empty = msgArea.querySelector('.chat-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `chat-msg chat-${role}`;
  div.innerHTML = `<div class="chat-bubble">${esc(content).replace(/\n/g, '<br/>')}</div>`;
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;
  return div;
}

export function showTypingIndicator(container) {
  const msgArea = container.querySelector('#chat-messages');
  if (!msgArea) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-assistant chat-typing-indicator';
  div.innerHTML = '<div class="chat-bubble"><div class="spinner"></div> Thinking…</div>';
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;
  return div;
}

export function removeTypingIndicator(container) {
  const el = container.querySelector('.chat-typing-indicator');
  if (el) el.remove();
}
