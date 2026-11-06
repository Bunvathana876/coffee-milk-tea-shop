import 'cart_item_model.dart';

/// A local cart estimate. It has no server ID, reference, status, or payment.
class OfflineOrderPreview {
  final List<CartItemModel> items;
  final double estimatedTotalUsd;

  OfflineOrderPreview(List<CartItemModel> cartItems)
      : items = List.unmodifiable(cartItems),
        estimatedTotalUsd = cartItems.fold(0, (sum, item) => sum + item.subtotalUsd);
}
