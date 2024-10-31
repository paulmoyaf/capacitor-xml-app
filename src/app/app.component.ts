import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { DeviceContextService } from './services/devicecontext.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>{{ title }}</h1>
    <p>{{ deviceMessage }}</p>
    <div *ngIf="infoTerminal && !infoTerminal.error">
      <p>PDA: {{ infoTerminal.PDA }}</p>
      <p>Gestor: {{ infoTerminal.Gestor }}</p>
      <p>Centro: {{ infoTerminal.CENTRO }}</p>
      <p>SIG: {{ infoTerminal.SIG }}</p>
    </div>
    <p *ngIf="infoTerminal?.error">{{ infoTerminal.error }}</p>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Capacitor XML PoolApp';
  deviceMessage: string = '';
  infoTerminal: any;

  constructor(
    private deviceContext: DeviceContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.deviceContext.loadConfigFile().then(() => {
      this.deviceMessage = `Iniciando desde: ${this.deviceContext.deviceType}`;
    });

    this.deviceContext.infoTerminal$.subscribe(data => {
      this.infoTerminal = data;
      this.cdr.detectChanges();
    });
  }
}
