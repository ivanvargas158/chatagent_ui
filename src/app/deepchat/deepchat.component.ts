import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerEvent, DeepChatResponse, StartPayload, OutAttachment } from '../models/message.models';


@Component({
  selector: 'app-deep-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deepchat.component.html',
  styleUrl: './deepchat.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DeepChatComponent implements OnInit {

  introMessage = { text: 'Chat will connect and stream responses here.' };

  private ws?: WebSocket;
  connected = false;
  //private tokenBuffer = '';
  private threadId = 'chat-a6c8c7d1-023d-4f93-b6fe-823f95c60cde'; // set your real thread id
  //private userId = 'michael+amc@cargologik.com';
  userId = 'patricia.daikuzono@minervafoods.com';
  tenant = 'https://minerva.cargologik.app/api/v2/';
  private token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnQiOiI2NmUzMGViZDYzNjA5NDZhMjU4NmViZDQiLCJjb21wYW55IjoiNjZlMzBlYmQ2MzYwOTQ2YTI1ODZlYmNhIiwidWlkIjoiNjc0ZGRlNGU1ZTQzNDEyYTI4ZWNhODU0Iiwicm9sZSI6Im93bmVyIiwiZG9taW5pbyI6ImNhcmdvbG9naWsuYXBwIiwidXJsIjoibWluZXJ2YS5jYXJnb2xvZ2lrLmFwcCIsImNvbXBhbnlUeXBlIjoic2hpcHBlciIsImRpcmVjdG9yeUJ1Y2tldCI6Im1pbmVydmEtY2FyZ29sb2dpay1hcHAiLCJjb21wYW55TmFtZSI6Ik1pbmVydmEiLCJpc0RlbW8iOmZhbHNlLCJpYXQiOjE3NjA1MzMyMjMsImV4cCI6MTc2MTEzODAyM30.cHVmMQX5wHcSqDv0sctqxiAoIwF_wUZrSgMPJ35TJVw';
  latestAttachedFiles: OutAttachment[] = [];

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
  const chatEl = (document.querySelector('deepchat') || document.getElementById('deepchat')) as any;
  if (!chatEl) return;

  const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

 
  chatEl.addEventListener('input', async (evt: any) => {
  
    const content = evt?.detail?.content;
    if (!content || !Array.isArray(content.files)) return;

    console.log('[DeepChat] input event:', evt?.detail ?? evt);

    const fileObjs = content.files
      .filter((f: any) => f?.ref instanceof File)
      .map((f: any) => f.ref as File);

    this.latestAttachedFiles = await Promise.all(
      fileObjs.map(async (file:File) => ({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        content: await fileToBase64(file),
      }))
    );  

    console.log("[DeepChat] Converted attachments:", this.latestAttachedFiles);
  });
}
 
  responseInterceptor = async (response: any): Promise<DeepChatResponse | undefined> => {
    // If something slips through via HTTP or other paths, normalize or drop here.
    if (response?.event === 'session.started') return undefined; // don't render
    if (response?.event === 'assistant.message' && typeof response.text === 'string') {
      return { text: response.text }; // render as assistant message
    }
    if (response?.event === 'error') {
      return { error: response?.message || 'Unknown error' };
    }
    // Let other already-normalized Deep Chat responses pass
    if (typeof response?.text === 'string' || typeof response?.error === 'string') return response;
    // Drop anything else by default
    return undefined;
  };

  /** Deep Chat "connect" handler to wire your custom WS protocol. */
  connect = {
    websocket: true,
    handler: (_: any, signals: any) => {
      const emitError = (msg: string, detail?: unknown) => {
          console.error('[DeepChat] UI error:', msg, detail);
          signals.onResponse({ error: msg, role: 'system' });
        };
      try {

       //this.ws = new WebSocket('ws://127.0.0.1:8000/api/v1/chat-agent/ws');
        this.ws = new WebSocket('wss://middlewarecl-dev-bdc5gyarffdjg4fu.centralus-01.azurewebsites.net/api/v1/chat-agent/ws');
        this.ws.onopen = () => {
          signals.onOpen();
          this.connected = true;
          console.log('[WS] open');
        };

        this.ws.onmessage = (evt) => {
          console.log('[WS] message:', evt.data);
          let data: ServerEvent;
          try {
            data = JSON.parse(evt.data);
          } catch {
            signals.onResponse({ error: 'Server sent non-JSON message', role: 'system', raw: String(evt.data) });
            return;
          }

          this.handleEvent(data, signals);
        };

        this.ws.onclose = () => { console.log('[WS] close'); signals.onClose(); }
        this.ws.onerror = (e) => { 
          this.connected = false;
          console.error('[WS] error', e); 
          signals.onResponse({ error: 'Connection error', role: 'system' }); 
        }

        
        // Called when user submits a message/files from the UI
        signals.newUserMessage.listener = async (body: any) => {
          try{

            console.log('[DeepChat] newUserMessage listener armed');        

            const msgs = Array.isArray(body?.messages) ? body.messages : [];
            const text = msgs.map((m: any) => m.text).join(" ").trim();

            
            const payload: StartPayload = {
              thread_id: this.threadId,
              user_id: this.userId,
              message: text,
              attachments: this.latestAttachedFiles, //attachments,
              chat_history: [], // optionally map your in-memory history
              token: this.token
            };

            this.ws?.send(JSON.stringify(payload));

          } catch (err) {
            this.connected = false;
            emitError('Failed to initialize WebSocket', err);
            signals.onClose();
          }

          
        };
      } catch {
        this.connected = false;
        signals.onResponse({ error: 'Failed to initialize WebSocket', role: 'system' });
        signals.onClose();
      }
    },
  };

  /** Map your WS protocol -> Deep Chat responses. */
  private handleEvent(event: ServerEvent, signals: any) {
    console.log("handleEvent..");
    switch (event.type) {
      case 'assistant.started':
        //no event to handle here
        break;
      case 'assistant.token': {
        const finalText = (typeof event.text === 'string' && event.text.length ? event.text : '') ?? '';
        signals.onResponse({ text: finalText });
        break;
      }
      case 'assistant.completed':
        //no event to handle here
        break;
      case 'error':
        signals.onResponse({ error: `Error: ${event.message}` || 'Unknown error' });
        break;
      default:
        // progress / node events are handled via events() observable by the component
        break;
    }
  }

}