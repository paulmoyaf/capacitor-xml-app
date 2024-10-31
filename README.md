Crea un archivo CONFIG/CONFIG.xml dentro de la carpeta de Documents del alamcenamiento de los Android

El archivo lo copia desde: assets/CONFIG/CONFIG.xml que se encuentra en el proyecto


Pasos importantes
en Manifest:
  <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />

en file_paths.xml (android\app\src\main\res\xml\file_paths.xml):
    <?xml version="1.0" encoding="utf-8"?>
    <paths xmlns:android="http://schemas.android.com/apk/res/android">
        <external-path name="config_files" path="CONFIG/" />
    </paths>

Opcional para ejecutar un script
SCRIPT PARA IMPLEMENTAR: "build:capacitor": "npm run build -- --project=capacitor-xml-app --configuration=production && npx cap copy && npx cap sync --inline"
