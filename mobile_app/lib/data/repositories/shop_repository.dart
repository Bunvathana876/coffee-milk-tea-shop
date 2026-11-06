import '../models/category_model.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

/// Repository managing categories and drinks catalog.
/// Implements automatic fallback to offline seed data when backend is not running.
class ShopRepository {
  final ApiService _apiService;

  ShopRepository({required ApiService apiService}) : _apiService = apiService;

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  Future<List<CategoryModel>> getCategories() async {
    try {
      final list = await _apiService.getCategories();
      if (list.isNotEmpty) return list;
    } catch (_) {
      // Fallback to offline catalog if backend server is unreachable
    }
    return defaultCategories;
  }

  // -------------------------------------------------------------
  // Products
  // -------------------------------------------------------------
  Future<List<ProductModel>> getProducts({int? categoryId, String? search}) async {
    try {
      final list = await _apiService.getProducts(categoryId: categoryId, search: search);
      if (list.isNotEmpty) return list;
    } catch (_) {
      // Fallback to offline products
    }

    // Filter fallback list locally
    var items = List<ProductModel>.from(defaultProducts);
    if (categoryId != null && categoryId > 0) {
      items = items.where((p) => p.categoryId == categoryId).toList();
    }
    if (search != null && search.trim().isNotEmpty) {
      final q = search.trim().toLowerCase();
      items = items.where((p) =>
        p.name.toLowerCase().contains(q) ||
        (p.description?.toLowerCase().contains(q) ?? false)
      ).toList();
    }
    return items;
  }

  // -------------------------------------------------------------
  // Built-in Sample / Offline Fallback Menu
  // -------------------------------------------------------------
  static const List<CategoryModel> defaultCategories = [
    CategoryModel(
      id: 1,
      name: 'Coffee',
      description: 'Artisan espresso drinks and slow-brewed coffees',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
      productCount: 4,
    ),
    CategoryModel(
      id: 2,
      name: 'Milk Tea',
      description: 'Handcrafted loose leaf milk teas with chewy boba',
      image: 'https://images.unsplash.com/photo-1558857563-b37cf5a1334c?w=600&auto=format&fit=crop&q=80',
      productCount: 4,
    ),
    CategoryModel(
      id: 3,
      name: 'Fruit Tea',
      description: 'Refreshing iced teas infused with real tropical fruits',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
      productCount: 3,
    ),
    CategoryModel(
      id: 4,
      name: 'Matcha',
      description: 'Authentic stone-ground Uji matcha lattes',
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      productCount: 3,
    ),
    CategoryModel(
      id: 5,
      name: 'Smoothies',
      description: 'Creamy tropical fruit frappes and blends',
      image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80',
      productCount: 2,
    ),
  ];

  static const List<ProductModel> defaultProducts = [
    // Coffee
    ProductModel(
      id: 1,
      name: 'Iced Americano',
      categoryId: 1,
      categoryName: 'Coffee',
      description: 'Bold double espresso poured over purified chilled water and crisp ice.',
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.00,
    ),
    ProductModel(
      id: 2,
      name: 'Iced Latte',
      categoryId: 1,
      categoryName: 'Coffee',
      description: 'Freshly pulled espresso layered smoothly with velvety chilled whole milk.',
      image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.50,
    ),
    ProductModel(
      id: 3,
      name: 'Spanish Latte',
      categoryId: 1,
      categoryName: 'Coffee',
      description: 'Rich espresso blended with silky steamed milk and sweet condensed milk drizzle.',
      image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 3.00,
    ),
    ProductModel(
      id: 4,
      name: 'Caramel Macchiato',
      categoryId: 1,
      categoryName: 'Coffee',
      description: 'Vanilla steamed milk marked with rich espresso and house-made buttery caramel drizzle.',
      image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 3.25,
    ),

    // Milk Tea
    ProductModel(
      id: 5,
      name: 'Classic Boba Milk Tea',
      categoryId: 2,
      categoryName: 'Milk Tea',
      description: 'Fragrant black tea slow-brewed with fresh cream and warm brown sugar tapioca boba.',
      image: 'https://images.unsplash.com/photo-1558857563-b37cf5a1334c?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.75,
    ),
    ProductModel(
      id: 6,
      name: 'Brown Sugar Fresh Milk',
      categoryId: 2,
      categoryName: 'Milk Tea',
      description: 'Tora tiger stripe brown sugar syrup coated over fresh whole milk with chewy boba.',
      image: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 3.00,
    ),
    ProductModel(
      id: 7,
      name: 'Thai Milk Tea',
      categoryId: 2,
      categoryName: 'Milk Tea',
      description: 'Authentic spiced Ceylon tea with sweetened condensed milk and crushed ice.',
      image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.75,
    ),
    ProductModel(
      id: 8,
      name: 'Taro Milk Tea',
      categoryId: 2,
      categoryName: 'Milk Tea',
      description: 'Sweet, nutty purple taro blended smoothly with green jasmine tea and milk.',
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.85,
    ),

    // Fruit Tea
    ProductModel(
      id: 9,
      name: 'Mango Passion Fruit Tea',
      categoryId: 3,
      categoryName: 'Fruit Tea',
      description: 'Tropical blend of ripe alphonso mango puree and tangy passionfruit over jasmine green tea.',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.75,
    ),
    ProductModel(
      id: 10,
      name: 'Strawberry Peach Green Tea',
      categoryId: 3,
      categoryName: 'Fruit Tea',
      description: 'Sweet crushed strawberries and juicy white peach steeped in fragrant jasmine tea.',
      image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 2.75,
    ),

    // Matcha
    ProductModel(
      id: 11,
      name: 'Uji Matcha Latte',
      categoryId: 4,
      categoryName: 'Matcha',
      description: 'First-harvest ceremonial grade Japanese matcha whisked into creamy oat or whole milk.',
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 3.25,
    ),
    ProductModel(
      id: 12,
      name: 'Strawberry Matcha Cloud',
      categoryId: 4,
      categoryName: 'Matcha',
      description: 'Layers of fresh strawberry puree, cold milk, and stone-ground matcha foam.',
      image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=600&auto=format&fit=crop&q=80',
      basePriceUsd: 3.75,
    ),
  ];
}
