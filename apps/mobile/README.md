# Banana Escolar · App móvil (Flutter)

Consume **la misma API REST** del monorepo; no tiene base de datos propia.

## Ejecutar

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/v1
```

- Emulador Android: `10.0.2.2` apunta al host.
- Dispositivo físico: usa la IP local del equipo.
- iOS simulator: `http://localhost:3000/v1`.

No se pasan secretos por `--dart-define`.

## Arquitectura

```text
lib/
├── app/                  MaterialApp, tema, shell
├── core/                 config, red/Dio, storage seguro, errores
├── features/
│   ├── auth/             modelos, repositorio, AuthController, login
│   ├── reports/          modelos, repositorio, providers, pantallas
│   └── profile/          cuenta y cierre de sesión
└── main.dart
```

Flujo: **View → Provider/Controller → Repository → Dio → NestJS**. Riverpod
gestiona estado y DI; los tokens viven en `flutter_secure_storage`.

## Funcionalidad

- Login con cuentas demo.
- Listado con alcance por rol (propias / asignadas / todas), filtro por estado,
  paginación y pull-to-refresh.
- Registro de reportes con categoría, descripción, ubicación y prioridad.
- Detalle con estado, técnico, solución y fechas.
- Técnico: iniciar atención y registrar solución.
- Logout y perfil.

## Calidad

```bash
flutter analyze
flutter test
```
