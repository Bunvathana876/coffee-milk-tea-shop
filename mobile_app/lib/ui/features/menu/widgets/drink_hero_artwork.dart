import 'dart:ui' as ui;
import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/product_image_url.dart';

/// Displays verified product cutouts over navy and opaque catalog photos across
/// the full hero, without a simulated cup or a decorative photo frame.
class DrinkHeroArtwork extends StatefulWidget {
  const DrinkHeroArtwork({
    super.key,
    required this.imageUrl,
    required this.productName,
    required this.size,
    required this.heroHeight,
    required this.imageTop,
    this.imageProvider,
  });

  final String? imageUrl;
  final String productName;
  final double size;
  final double heroHeight;
  final double imageTop;

  /// Allows deterministic image rendering tests without a live catalog server.
  final ImageProvider? imageProvider;

  @override
  State<DrinkHeroArtwork> createState() => _DrinkHeroArtworkState();
}

class _DrinkHeroArtworkState extends State<DrinkHeroArtwork> {
  ImageStream? _probeStream;
  ImageStreamListener? _probeListener;
  String? _resolvedUrl;
  ImageProvider? _resolvedProvider;
  bool? _transparentCutout;
  bool _imageFailed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _resolveImage();
  }

  @override
  void didUpdateWidget(covariant DrinkHeroArtwork oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl ||
        oldWidget.imageProvider != widget.imageProvider) {
      _resolveImage();
    }
  }

  void _resolveImage() {
    final url = widget.imageUrl;
    if (url == _resolvedUrl && widget.imageProvider == _resolvedProvider) {
      return;
    }
    _removeProbe();
    _resolvedUrl = url;
    _resolvedProvider = widget.imageProvider;
    _transparentCutout = null;
    _imageFailed = false;
    if ((url == null || url.isEmpty) && widget.imageProvider == null) return;
    if (widget.imageProvider == null &&
        url != null &&
        url.startsWith('https://res.cloudinary.com/dr5o7ft6/')) {
      _transparentCutout = true;
      return;
    }
    final imageSource = widget.imageProvider;

    // Decode a tiny copy from the same cached image bytes; avoid inspecting
    // full-resolution pixels on the UI thread.
    final provider = ResizeImage(
      imageSource ?? CachedNetworkImageProvider(productImageUrl(url!, width: 800)),
      width: 48,
      height: 48,
    );
    final stream = provider.resolve(createLocalImageConfiguration(context));
    final listener = ImageStreamListener(
      (info, _) async {
        try {
          final bytes = await info.image.toByteData(
            format: ui.ImageByteFormat.rawRgba,
          );
          if (!mounted ||
              widget.imageUrl != url ||
              widget.imageProvider != imageSource) {
            return;
          }
          setState(() {
            _transparentCutout =
                bytes != null &&
                hasTransparentCutoutEdges(
                  bytes,
                  info.image.width,
                  info.image.height,
                );
          });
        } catch (_) {
          if (mounted &&
              widget.imageUrl == url &&
              widget.imageProvider == imageSource) {
            setState(() => _transparentCutout = false);
          }
        }
      },
      onError: (_, _) {
        if (mounted &&
            widget.imageUrl == url &&
            widget.imageProvider == imageSource) {
          setState(() => _imageFailed = true);
        }
      },
    );
    _probeStream = stream;
    _probeListener = listener;
    stream.addListener(listener);
  }

  void _removeProbe() {
    if (_probeStream != null && _probeListener != null) {
      _probeStream!.removeListener(_probeListener!);
    }
    _probeStream = null;
    _probeListener = null;
  }

  @override
  void dispose() {
    _removeProbe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.imageUrl;
    final size = widget.size;
    if (((url == null || url.isEmpty) && widget.imageProvider == null) ||
        _imageFailed) {
      return _centered(_fallback(size));
    }
    if (_transparentCutout == null) {
      return _centered(
        SizedBox(
          width: size,
          height: size,
          child: Center(
            child: CircularProgressIndicator(
              semanticsLabel: 'Loading ${widget.productName} image',
              color: AppColors.secondaryLight.withAlpha(190),
              strokeWidth: 2,
            ),
          ),
        ),
      );
    }

    final provider = widget.imageProvider ?? CachedNetworkImageProvider(productImageUrl(url!, width: 800));
    final photo = Image(
      key: const Key('drink-detail-product-image'),
      image: provider,
      semanticLabel: '${widget.productName} product photo',
      fit: BoxFit.contain,
      width: size,
      height: size,
      loadingBuilder: (context, child, progress) => progress == null
          ? child
          : Center(
              child: CircularProgressIndicator(
                semanticsLabel: 'Loading ${widget.productName} image',
                color: AppColors.secondaryLight.withAlpha(190),
                strokeWidth: 2,
              ),
            ),
      errorBuilder: (_, _, _) => _fallback(size),
    );
    if (_transparentCutout! ||
        (url != null && url.startsWith('https://res.cloudinary.com/dr5o7ft6/'))) {
      return _centered(
        SizedBox(
          key: const Key('drink-hero-cutout'),
          width: size,
          height: size,
          child: photo,
        ),
      );
    }
    return SizedBox(
      key: const Key('drink-hero-photo'),
      height: widget.heroHeight,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image(
            image: provider,
            semanticLabel: '${widget.productName} product photo',
            fit: BoxFit.cover,
            alignment: Alignment.center,
            errorBuilder: (_, _, _) => _fallback(size),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x6617294D),
                  Color(0x0017294D),
                  Color(0xB317294D),
                ],
                stops: [0, .46, 1],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _centered(Widget child) => SizedBox(
    height: widget.imageTop + widget.size,
    width: double.infinity,
    child: Align(alignment: Alignment.bottomCenter, child: child),
  );

  Widget _fallback(double size) => Semantics(
    label: '${widget.productName} image unavailable',
    image: true,
    child: Container(
      key: const Key('drink-detail-image-fallback'),
      width: size * .68,
      height: size * .68,
      decoration: BoxDecoration(
        color: AppColors.secondaryLight.withAlpha(32),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.secondaryLight.withAlpha(85)),
      ),
      child: Icon(
        Icons.local_cafe_rounded,
        color: AppColors.secondaryLight,
        size: size * .32,
      ),
    ),
  );
}

/// Conservative cutout check: transparent corners and edge midpoints, plus an
/// opaque center. A photo with rounded transparent corners stays a photo.
bool hasTransparentCutoutEdges(ByteData bytes, int width, int height) {
  if (width < 3 || height < 3) return false;
  final edges = [
    (0, 0),
    (width - 1, 0),
    (0, height - 1),
    (width - 1, height - 1),
    (width ~/ 2, 0),
    (width ~/ 2, height - 1),
    (0, height ~/ 2),
    (width - 1, height ~/ 2),
  ];
  int alpha(int x, int y) => bytes.getUint8((y * width + x) * 4 + 3);
  return edges.every((point) => alpha(point.$1, point.$2) < 32) &&
      alpha(width ~/ 2, height ~/ 2) > 128;
}
