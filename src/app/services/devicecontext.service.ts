import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class DeviceContextService {
  private infoTerminalSubject = new BehaviorSubject<any>({});
  infoTerminal$ = this.infoTerminalSubject.asObservable();
  deviceType: string = 'unknown';

  constructor() {}

  async loadConfigFile(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.deviceType = 'pc';
      this.readConfigFromAssetsInBrowser();
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      this.deviceType = 'android';
      const permissionGranted = await this.requestExternalStoragePermission();
      if (permissionGranted) {
        await this.ensureConfigDirectoryExists(); //Crear ruta
        await this.copyConfigToExternalStorage(); // Copiar CONFIG del proyecto
        await this.readConfigFromExternalStorage();
      } else {
        this.infoTerminalSubject.next({ error: 'Permiso de almacenamiento externo denegado' });
      }
    }
    console.log('Device Type:', this.deviceType);
  }

  private async requestExternalStoragePermission(): Promise<boolean> {
    const permissions = await Filesystem.requestPermissions();
    return permissions.publicStorage === 'granted';
  }

  private async ensureConfigDirectoryExists() {
    try {
      await Filesystem.mkdir({
        path: 'CONFIG',
        directory: Directory.Documents,
        recursive: true  // Crea la carpeta y sus subdirectorios si no existen
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message !== 'Directory exists') {
          console.error('Error al crear la carpeta CONFIG:', error.message);
        }
      } else {
        console.error('Error desconocido al crear la carpeta CONFIG:', error);
      }
    }
  }

  private async copyConfigToExternalStorage() {
    try {
      await Filesystem.readFile({
        path: 'CONFIG/CONFIG.xml',
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      console.log('El archivo CONFIG.xml ya existe. No se copiará.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('File does not exist')) {
        console.log('El archivo CONFIG.xml no existe. Procediendo a copiarlo.');
        const response = await fetch('assets/CONFIG/CONFIG.xml');
        if (!response.ok) {
          throw new Error(`Error al cargar CONFIG.xml: ${response.statusText}`);
        }
        const configData = await response.text();

        await Filesystem.writeFile({
          path: 'CONFIG/CONFIG.xml',
          data: configData,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
      } else {
        console.error('Error inesperado al verificar la existencia de CONFIG.xml:', error);
      }
    }
  }

  private async readConfigFromExternalStorage() {
    try {
      const result = await Filesystem.readFile({
        path: 'CONFIG/CONFIG.xml',
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      const data = typeof result.data === 'string' ? result.data : await this.blobToString(result.data);
      this.parseConfigXML(data);

    } catch (error) {
      console.error('Error al leer CONFIG.xml desde Directory.Documents:', error);
      this.infoTerminalSubject.next({ error: 'Error al leer el archivo desde el almacenamiento externo' });
    }
  }

  // Esto es útil porque algunos métodos de lectura de archivos pueden devolver datos en formato Blob
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
        PDA: xml.getElementsByTagName('PDA')[0].textContent,
        Gestor: xml.getElementsByTagName('Gestor')[0].textContent,
        CENTRO: xml.getElementsByTagName('CENTRO')[0].textContent,
        SIG: xml.getElementsByTagName('SIG')[0].textContent
      };
      this.infoTerminalSubject.next(parsedData);
    } catch (error) {
      console.error('Error al analizar el XML:', error);
      this.infoTerminalSubject.next({ error: 'Error al analizar el archivo XML' });
    }
  }
}
