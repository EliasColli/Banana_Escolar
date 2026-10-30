enum UserRole {
  admin,
  tecnico,
  usuario;

  static UserRole fromString(String value) {
    switch (value) {
      case 'ADMIN':
        return UserRole.admin;
      case 'TECNICO':
        return UserRole.tecnico;
      default:
        return UserRole.usuario;
    }
  }

  String get apiValue => switch (this) {
        UserRole.admin => 'ADMIN',
        UserRole.tecnico => 'TECNICO',
        UserRole.usuario => 'USUARIO',
      };

  String get label => switch (this) {
        UserRole.admin => 'Administrador',
        UserRole.tecnico => 'Técnico',
        UserRole.usuario => 'Solicitante',
      };
}

class User {
  const User({
    required this.id,
    required this.nombre,
    required this.correo,
    required this.rol,
    required this.activo,
  });

  final int id;
  final String nombre;
  final String correo;
  final UserRole rol;
  final bool activo;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] as num).toInt(),
      nombre: json['nombre'] as String,
      correo: json['correo'] as String,
      rol: UserRole.fromString(json['rol'] as String),
      activo: json['activo'] as bool? ?? true,
    );
  }
}
