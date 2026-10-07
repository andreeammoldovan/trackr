// Downscales a picked photo before upload: smaller payload, faster estimate, same accuracy.
export async function prepareImage(file: File): Promise<{ base64: string; dataUrl: string; thumb: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const dataUrl = draw(bitmap, 1280, 0.82);
  const thumb = draw(bitmap, 160, 0.7);
  bitmap.close();
  return { base64: dataUrl.split(",")[1], dataUrl, thumb };
}

function draw(bitmap: ImageBitmap, maxSide: number, quality: number): string {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
