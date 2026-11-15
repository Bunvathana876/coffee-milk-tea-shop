/// Uses a bounded Cloudinary derivative for known public product cutouts.
/// Other catalog URLs remain untouched.
String productImageUrl(String url, {int width = 320}) {
  const original = 'https://res.cloudinary.com/dr5o7ft6/image/upload/';
  if (!url.startsWith(original)) return url;
  final remainder = url.substring(original.length);
  if (!RegExp(r'^v\d+/').hasMatch(remainder)) return url;
  return '${original}c_limit,w_$width,q_auto,f_auto/$remainder';
}
