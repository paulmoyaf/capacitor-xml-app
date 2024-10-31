import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class DeviceContextService {
  private infoTerminalSubject = new BehaviorSubject<any>({});
  infoTerminal$ = this.infoTerminalSubject.asObservable();
  deviceType: string = 'unknown';


  async loadConfigFile(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.deviceType = 'pc';
      this.readConfigFromAssetsInBrowser();
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      this.deviceType = 'android';
      await this.copyConfigToInternalStorage();  // Copiamos el archivo a almacenamiento interno
      await this.readConfigFromAndroid();
    }
    console.log('Device Type:', this.deviceType);
  }

  private async copyConfigToInternalStorage() {
    try {
      // Leemos el archivo desde los assets con fetch
      const response = await fetch('assets/CONFIG.xml');
      if (!response.ok) {
        throw new Error(`Error al cargar CONFIG.xml: ${response.statusText}`);
      }
      const configData = await response.text();

      // Guardamos el archivo en Directory.Data
      await Filesystem.writeFile({
        path: 'CONFIG.xml',
        data: configData,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      console.log('Archivo CONFIG.xml copiado a Directory.Data');
    } catch (error) {
      console.error('Error al copiar CONFIG.xml a Directory.Data:', error);
    }
  }


  private async readConfigFromAndroid() {
    try {
      console.log('Intentando leer CONFIG.xml desde Directory.Data');
      const result = await Filesystem.readFile({
        path: 'CONFIG.xml',  // Ruta dentro del directorio de datos de la app
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      console.log('Archivo CONFIG.xml encontrado:', result);
      const data = typeof result.data === 'string' ? result.data : await this.blobToString(result.data);
      this.parseConfigXML(data);

    } catch (error) {
      console.error('Error al leer CONFIG.xml en Directory.Data:', error);
      this.infoTerminalSubject.next({ error: 'Error al leer el archivo en Android' });
    }
  }

  private async blobToString(blob: Blob): Promise<string> {
    return await blob.text();
  }

  private readConfigFromAssetsInBrowser() {
    fetch('assets/CONFIG/CONFIG.xml')
      .then(response => {
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo XML: ${response.statusText}`);
        }
        return response.text();
      })
      .then(data => this.parseConfigXML(data))
      .catch(error => {
        console.error('Error al leer el archivo en navegador:', error);
        this.infoTerminalSubject.next({ error: 'Error al leer el archivo en navegador' });
      });
  }

  private parseConfigXML(data: string) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(data, 'text/xml');
      const parsedData = {
        PDA: xml.getElementsByTagName('PDA')[0]?.textContent || 'No disponible',
        Gestor: xml.getElementsByTagName('Gestor')[0]?.textContent || 'No disponible',
        CENTRO: xml.getElementsByTagName('CENTRO')[0]?.textContent || 'No disponible',
        SIG: xml.getElementsByTagName('SIG')[0]?.textContent || 'No disponible'
      };
      console.log('Datos parseados:', parsedData);
      this.infoTerminalSubject.next(parsedData);
    } catch (error) {
      console.error('Error al analizar el XML:', error);
      this.infoTerminalSubject.next({ error: 'Error al analizar el archivo XML' });
    }
  }
}
