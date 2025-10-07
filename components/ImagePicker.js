'use client';
import { useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary-client';

export default function ImagePicker({
  label = 'Images',
  value = [],            // array of url strings
  onChange = () => {},
  multiple = true,
}) {
  const [uploading, setUploading] = useState(false);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => uploadToCloudinary(f)));
      const urls = results.map(r => r.secure_url);
      onChange(multiple ? [...value, ...urls] : urls.slice(0,1));
    } catch (err) {
      alert('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAt = (i) => {
    const copy = value.slice();
    copy.splice(i,1);
    onChange(copy);
  };

  return (
    <div>
      <label className="label">{label}</label>
      <input type="file" accept="image/*" multiple={multiple} onChange={onFiles} />
      {uploading && <p className="text-sm text-gray-500 mt-1">Uploading…</p>}
      {value?.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {value.map((src,i)=>(
            <div key={i} className="relative">
              <img src={src} alt="" className="w-full h-24 object-cover rounded-lg border" />
              <button type="button" onClick={()=>removeAt(i)}
                className="absolute top-1 right-1 text-xs bg-white border rounded px-1">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}