const CLOUDINARY_ORIGINAL = /^https:\/\/res\.cloudinary\.com\/dr5o7ft6\/image\/upload\/(?=v\d+\/)/;

export function isCloudinaryProductImage(url: string | null | undefined): boolean {
  return Boolean(url && CLOUDINARY_ORIGINAL.test(url));
}

export function productThumbnailUrl(url: string | null | undefined, width = 160): string | undefined {
  if (!url) return undefined;
  return url.replace(CLOUDINARY_ORIGINAL, `https://res.cloudinary.com/dr5o7ft6/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}
