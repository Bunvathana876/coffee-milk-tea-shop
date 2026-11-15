import 'dart:async';

import 'package:flutter/material.dart';

/// Shows the user-approved, pre-designed artwork without duplicating its text.
/// Place inside the existing Home/Menu scroll view.
class BrandBannerCarousel extends StatefulWidget {
  const BrandBannerCarousel({
    super.key,
    this.onBannerTap,
    this.isActive = true,
  });

  /// Optional real navigation action, supplied by the existing Menu screen.
  final ValueChanged<int>? onBannerTap;
  final bool isActive;

  @override
  State<BrandBannerCarousel> createState() => _BrandBannerCarouselState();
}

class _BrandBannerCarouselState extends State<BrandBannerCarousel>
    with WidgetsBindingObserver {
  static const _paths = <String>[
    'assets/home_refresh/banners/banner_01.png',
    'assets/home_refresh/banners/banner_02.png',
    'assets/home_refresh/banners/banner_03.png',
  ];
  static const _cobalt = Color(0xFF1345A3);
  static const _cream = Color(0xFFFFF8DF);
  final PageController _controller = PageController();
  Timer? _advanceTimer;
  int _active = 0;
  bool _appActive = true;
  bool _interacting = false;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _appActive =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scheduleAdvance();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    if (reduceMotion != _reduceMotion) {
      _reduceMotion = reduceMotion;
      _cancelAdvance();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _scheduleAdvance();
      });
    }
  }

  @override
  void didUpdateWidget(covariant BrandBannerCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isActive != widget.isActive) {
      _cancelAdvance();
      if (widget.isActive) _scheduleAdvance();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appActive = state == AppLifecycleState.resumed;
    if (_appActive) {
      _scheduleAdvance();
    } else {
      _cancelAdvance();
    }
  }

  bool get _canAdvance =>
      mounted &&
      widget.isActive &&
      _appActive &&
      !_reduceMotion &&
      !_interacting &&
      _controller.hasClients;

  void _cancelAdvance() {
    _advanceTimer?.cancel();
    _advanceTimer = null;
  }

  void _scheduleAdvance([Duration delay = const Duration(seconds: 5)]) {
    if (!_canAdvance || _advanceTimer != null) return;
    _advanceTimer = Timer(delay, () async {
      _advanceTimer = null;
      if (!_canAdvance) return;
      await _controller.animateToPage(
        (_active + 1) % _paths.length,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOutCubic,
      );
      if (_canAdvance) _scheduleAdvance();
    });
  }

  void _pauseForTouch() {
    _interacting = true;
    _cancelAdvance();
  }

  void _resumeAfterTouch() {
    _interacting = false;
    _scheduleAdvance(const Duration(seconds: 8));
  }

  Future<void> _selectPage(int index) async {
    _pauseForTouch();
    if (_controller.hasClients) {
      if (_reduceMotion) {
        _controller.jumpToPage(index);
      } else {
        await _controller.animateToPage(
          index,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOutCubic,
        );
      }
    }
    if (mounted) _resumeAfterTouch();
  }

  @override
  void dispose() {
    _cancelAdvance();
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Artwork 1 & 2 are 2:1, artwork 3 is roughly 2.22:1.
        // 2.0:1 with contain displays every headline and cup without cropping.
        AspectRatio(
          aspectRatio: 2.0,
          child: Listener(
            onPointerDown: (_) => _pauseForTouch(),
            onPointerUp: (_) => _resumeAfterTouch(),
            onPointerCancel: (_) => _resumeAfterTouch(),
            child: PageView.builder(
              key: const Key('home-banner-pages'),
              controller: _controller,
              itemCount: _paths.length,
              onPageChanged: (index) => setState(() => _active = index),
              itemBuilder: (context, index) {
                final artwork = ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: ColoredBox(
                    color: _cream,
                    child: Image.asset(
                      _paths[index],
                      key: Key('home-banner-image-$index'),
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.contain, // Never crop the pre-rendered text.
                      filterQuality: FilterQuality.medium,
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(
                            child: Icon(
                              Icons.broken_image_outlined,
                              color: _cobalt,
                            ),
                          ),
                    ),
                  ),
                );
                if (widget.onBannerTap == null) return artwork;
                return Semantics(
                  button: true,
                  label: 'Explore the café menu, banner ${index + 1}',
                  child: GestureDetector(
                    onTap: () => widget.onBannerTap!(index),
                    child: artwork,
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_paths.length, (index) {
            final selected = index == _active;
            return Semantics(
              label: 'Banner ${index + 1} of ${_paths.length}',
              selected: selected,
              button: true,
              child: InkWell(
                key: Key('banner-dot-$index'),
                onTap: () => _selectPage(index),
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  width: 44,
                  height: 32,
                  child: Center(
                    child: AnimatedContainer(
                      key: selected ? Key('banner-active-dot-$index') : null,
                      duration: const Duration(milliseconds: 180),
                      width: selected ? 9 : 7,
                      height: selected ? 9 : 7,
                      decoration: BoxDecoration(
                        color: selected ? _cream : _cream.withAlpha(92),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
