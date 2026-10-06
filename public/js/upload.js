async function subirImagenCloudinary(file) {
  if (!file) return null;
  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary no está configurado. Completa cloudinary-config.js");
  }

  if (!file.type.startsWith("image/")) throw new Error("Solo se permiten imágenes.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB.");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form
  });
  if (!response.ok) throw new Error("No se pudo subir la imagen.");
  const data = await response.json();
  return data.secure_url;
}
