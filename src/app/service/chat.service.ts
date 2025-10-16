import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ServerEvent, ChatMessage, StartPayload } from '../models/message.models';
 

@Injectable({ providedIn: 'root' })
export class ChatService {
    private ws?: WebSocket;
    private events$ = new Subject<ServerEvent>();
    private messages$ = new BehaviorSubject<ChatMessage[]>([]);
    private connected$ = new BehaviorSubject<boolean>(false);
    constructor(private zone: NgZone) {

    }
    connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN ||
            this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const url = "ws://127.0.0.1:8000/api/v1/chat-agent/ws";
        this.ws = new WebSocket(url);
        this.ws.onopen = () => this.zone.run(() => this.connected$.next(true));
        this.ws.onclose = () => this.zone.run(() => this.connected$.next(false));
        this.ws.onerror = (ev) => console.error('WebSocket error', ev);
        this.ws.onmessage = (msg) => {
            try {
                const data: ServerEvent = JSON.parse(msg.data);
                this.zone.run(() => {
                    this.events$.next(data);
                    this.handleEvent(data);
                });
            } catch (e) {
                console.warn('Non-JSON message', msg.data);
            }
        };
    }
    disconnect(): void {
        this.ws?.close();
        this.ws = undefined;
    }
    isConnected(): Observable<boolean> {
        return this.connected$.asObservable();
    }
    events(): Observable<ServerEvent> {
        return this.events$.asObservable();
    }
    messages(): Observable<ChatMessage[]> {
        return this.messages$.asObservable();
    }
    sendStart(payload: StartPayload): void {
        this.ws?.send(JSON.stringify(payload));
        this.pushMessage({ role: 'user', text: payload.message ?? '' });
    }
    private pushMessage(m: ChatMessage) {
        this.messages$.next([...this.messages$.value, m]);
    }
    private handleEvent(ev: ServerEvent) {
        switch (ev.type) {
            case 'assistant.started':
                this.pushMessage({ role: 'assistant', text: '' });
                break;
            case 'assistant.token': {
                const msgs = this.messages$.value.slice();
                const last = msgs.pop();
                if (last && last.role === 'assistant') {
                    last.text += ev.text;
                    msgs.push(last);
                    this.messages$.next(msgs);
                } else {
                    this.pushMessage({ role: 'assistant', text: ev.text });
                }
                break;
            }
            case 'assistant.completed':
                break;
            case 'error':
                this.pushMessage({ role: 'system', text: `Error: ${ev.message}` });
                break;
            default:
                // progress / node events are handled via events() observable by the component
                break;
        }
    }
}
