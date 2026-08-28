import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadImage(file: File, folder: string = "blog-images") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET || "ml_default");
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return data;
}

export async function deleteImage(publicId: string) {
  const response = await fetch("/api/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });

  return response.json();
}