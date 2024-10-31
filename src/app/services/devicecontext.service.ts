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
        await this.ensureConfigDirectoryExists();  // Asegura que la carpeta CONFIG exista
        await this.copyConfigToExternalStorage();
        await this.readConfigFromExternalStorage();
      } else {
        this.infoTerminalSubject.next({ error: 'Permiso de almacenamiento externo denegado' });
      }
    }
    console.log('Device Type:', this.deviceType);
  }

  // Solicita permiso para acceder al almacenamiento externo en Android 11+
  private async requestExternalStoragePermission(): Promise<boolean> {
    const permissions = await Filesystem.requestPermissions();
    return permissions.publicStorage === 'granted';
  }

  // Verifica y crea la carpeta CONFIG en Directory.External si no existe
  private async ensureConfigDirectoryExists() {
    try {
      await Filesystem.mkdir({
        path: 'CONFIG',
        directory: Directory.External,
        recursive: true  // Crea la carpeta y sus subdirectorios si no existen
      });
      console.log('Carpeta CONFIG creada en Directory.External');
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


  // Copia CONFIG.xml desde assets a Directory.External
  private async copyConfigToExternalStorage() {
    try {
      // Leemos el archivo desde los assets
      const response = await fetch('assets/CONFIG.xml');
      if (!response.ok) {
        throw new Error(`Error al cargar CONFIG.xml: ${response.statusText}`);
      }
      const configData = await response.text();

      // Guardamos el archivo en Directory.External
      await Filesystem.writeFile({
        path: 'CONFIG/CONFIG.xml',
        data: configData,
        directory: Directory.External,
        encoding: Encoding.UTF8
      });

      console.log('Archivo CONFIG.xml copiado a Directory.External');
    } catch (error) {
      console.error('Error al copiar CONFIG.xml a Directory.External:', error);
    }
  }

  // Lee CONFIG.xml desde Directory.External
  private async readConfigFromExternalStorage() {
    try {
      console.log('Intentando leer CONFIG.xml desde Directory.External');
      const result = await Filesystem.readFile({
        path: 'CONFIG/CONFIG.xml',
        directory: Directory.External,
        encoding: Encoding.UTF8
      });

      const data = typeof result.data === 'string' ? result.data : await this.blobToString(result.data);
      this.parseConfigXML(data);

    } catch (error) {
      console.error('Error al leer CONFIG.xml desde Directory.External:', error);
      this.infoTerminalSubject.next({ error: 'Error al leer el archivo desde el almacenamiento externo' });
    }
  }

  // Convierte Blob a String si es necesario
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

  // Función para parsear el archivo XML y extraer los datos
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
