import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/** Resultado de takePhoto: path persistente, webPath para previsualización y opcionalmente geolocalización. */
export interface TakePhotoResult {
  /** Ruta en el sistema de archivos del dispositivo (persistente). */
  path: string;
  /** URL para previsualización (img src). */
  webPath: string;
  /** Datos en base64 para enviar al backend (ej. FormData). */
  base64Data: string;
  /** Geolocalización en el momento de la captura, si está disponible y permitida. */
  location?: { lat: number; lng: number };
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  /**
   * Captura una foto con la cámara del dispositivo (no galería) para evidencias del handshake.
   * Guarda la imagen en el sistema de archivos y opcionalmente captura geolocalización.
   * @throws Si el usuario cancela, deniega permisos o falla la cámara/archivos.
   */
  async takePhoto(): Promise<TakePhotoResult> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!photo.path && !photo.webPath) {
        throw new Error('La cámara no devolvió una imagen válida.');
      }

      const webPath = photo.webPath ?? photo.path ?? '';

      // Obtener datos en base64 para guardar y para enviar al backend
      const base64Data = await this.fetchAsBase64(webPath);
      if (!base64Data) {
        throw new Error('No se pudo leer el contenido de la imagen.');
      }

      // Guardar en el sistema de archivos del dispositivo
      const fileName = `handshake_${Date.now()}.jpeg`;
      const path = await this.saveToFilesystem(fileName, base64Data);

      // Intentar capturar geolocalización (auditoría: verificar que el partner está en la obra)
      let location: { lat: number; lng: number } | undefined;
      try {
        location = await this.captureLocation();
      } catch {
        // No bloqueamos el flujo si la ubicación falla; solo no la enviamos
      }

      return {
        path,
        webPath,
        base64Data,
        ...(location && { location }),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('cancelled')) {
        console.warn('[CameraService] Usuario canceló la captura.');
        throw new Error('Captura cancelada.');
      }
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
        console.error('[CameraService] Permisos de cámara denegados.');
        throw new Error('Se necesitan permisos de cámara para tomar la evidencia.');
      }
      console.error('[CameraService] Error al tomar foto:', err);
      throw err instanceof Error ? err : new Error('Error al abrir la cámara o guardar la imagen.');
    }
  }

  /**
   * Convierte la URI/webPath de la foto a base64 (para Filesystem.writeFile y para subir).
   */
  private async fetchAsBase64(webPath: string): Promise<string> {
    const response = await fetch(webPath);
    if (!response.ok) {
      throw new Error(`Error al leer la imagen: ${response.status}`);
    }
    const blob = await response.blob();
    return this.blobToBase64(blob);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result?.includes(',') ? result.split(',')[1] : result;
        resolve(base64 ?? '');
      };
      reader.onerror = () => reject(new Error('Error al convertir imagen a base64'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Guarda la imagen en el directorio de datos de la app (persistente).
   */
  private async saveToFilesystem(fileName: string, base64Data: string): Promise<string> {
    const isNative = Capacitor.isNativePlatform();
    const directory = isNative ? Directory.Data : Directory.Cache;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory,
    });
    return result.uri;
  }

  /**
   * Intenta obtener la posición actual (navegador o Capacitor).
   * No bloquea si el usuario deniega o no hay soporte.
   */
  private async captureLocation(): Promise<{ lat: number; lng: number } | undefined> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 8000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          clearTimeout(timeout);
          resolve(undefined);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
      );
    });
  }
}
