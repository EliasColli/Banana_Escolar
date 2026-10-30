class Category {
  const Category({required this.id, required this.nombre});

  final int id;
  final String nombre;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(id: (json['id'] as num).toInt(), nombre: json['nombre'] as String);
  }
}
