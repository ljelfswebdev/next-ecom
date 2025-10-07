export async function uploadToCloudinary(
  file,
  {
    cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  } = {}
) {
  const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);

  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    const t = await res.text().catch(()=>'');
    throw new Error('Cloudinary upload failed: ' + (t || res.status));
  }
  return res.json(); // { secure_url, public_id, ... }
}