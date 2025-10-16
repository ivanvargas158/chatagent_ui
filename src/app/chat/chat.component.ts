import { Component, OnDestroy, OnInit,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../service/chat.service';
import { ServerEvent, StartPayload,OutAttachment } from '../models/message.models';
import { v4 as uuidv4 } from 'uuid';


@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatComponent implements OnInit, OnDestroy {
    input = '';
    threadId = uuidv4();
    logs: ServerEvent[] = [];
    nodeProgress = new Map<string, number>();
    selectedFiles: File[] = [];

    constructor(public chat: ChatService) { }


    ngOnInit(): void {
        this.chat.connect();
        this.chat.events().subscribe((e) => {
            this.logs.push(e);
            if (e.type === 'progress' && (e as any).node) {
                const pct = typeof (e as any).percentage === 'number' ? (e as any).percentage : 0;
                this.nodeProgress.set((e as any).node, pct);
            }
        });
        
    }


    ngOnDestroy(): void {
        this.chat.disconnect();
    }


    async send(): Promise<void> {
        const attachments: OutAttachment[] = await this.buildAttachments(this.selectedFiles);
        const payload: StartPayload = { 
            thread_id: this.threadId, 
            message: this.input,
            attachments: attachments,
            chat_history:[],
            user_id:"michael+amc@cargologik.com"
        };
        this.chat.sendStart(payload);
        this.input = '';
        this.selectedFiles = [];    


    }

    

    trackByIdx(i: number) { return i; }
    nodes(): string[] { return Array.from(this.nodeProgress.keys()); }
    pct(node: string): number { return this.nodeProgress.get(node) ?? 0; }

    private sendOverWs(payload: any) {
    // your existing websocket service call here
    // this.chatService.send(payload);
    }
    canSend(): boolean {
        return !!this.input.trim() || this.selectedFiles.length > 0;
    }
    onFileSelected(evt: Event) {
        const input = evt.target as HTMLInputElement;
        if (!input.files || !input.files.length) return;
        // Keep all newly selected files
        this.selectedFiles = Array.from(input.files);
    }
    private async buildAttachments(files: File[]): Promise<OutAttachment[]> {
        const out: OutAttachment[] = [];
        for (const f of files) {
            const dataBase64 = await this.fileToBase64(f);
            out.push({
                filename: f.name,
                mimeType: f.type || 'application/octet-stream',
                dataBase64
            });
            }
        return out;
    }
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
        const reader = new FileReader();
        // Use readAsArrayBuffer to avoid DataURL prefix; then btoa
        reader.onload = () => {
            const buffer = reader.result as ArrayBuffer;
            const bytes = new Uint8Array(buffer);
            // Convert to binary string for btoa
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
            }
            resolve(btoa(binary)); // raw base64, no 'data:*;base64,' prefix
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
        });
    }
    
}