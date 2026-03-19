import { useRef, useState } from "react";
import Cropper from "react-easy-crop";

export default function Picture({
  readablePicture,
  setReadablePicture,
  setPicture,
}) {
  const [error, setError] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [tempImage, setTempImage] = useState("");
  const inputRef = useRef();

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  const handleFilePick = (e) => {
    let pic = e.target.files[0];
    if (!pic) return;

    // Validate file type
    if (
      pic.type !== "image/jpeg" &&
      pic.type !== "image/png" &&
      pic.type !== "image/webp"
    ) {
      setError(`${pic.name} format is not supported. Use JPG, PNG, or WebP.`);
      return;
    }

    // Validate file size (25MB)
    if (pic.size > MAX_FILE_SIZE) {
      setError(
        `${pic.name} is too large. Maximum 25MB allowed. (File size: ${(pic.size / (1024 * 1024)).toFixed(2)}MB)`
      );
      return;
    }

    setError("");
    setPicture(pic);

    // Read and show image for cropping
    const reader = new FileReader();
    reader.readAsDataURL(pic);
    reader.onload = (e) => {
      setTempImage(e.target.result);
      setShowCropper(true);
    };
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (err) => reject(err));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async () => {
    try {
      const image = await createImage(tempImage);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob((blob) => {
        // Create a File object from the blob
        const croppedFile = new File(
          [blob],
          `cropped_${Date.now()}.${blob.type.split("/")[1]}`,
          { type: blob.type }
        );
        setPicture(croppedFile);
        setReadablePicture(canvas.toDataURL());
        setShowCropper(false);
        setTempImage("");
      }, "image/jpeg");
    } catch (e) {
      setError("Failed to crop image. Please try again.");
    }
  };

  const handleRemovePic = () => {
    setPicture("");
    setReadablePicture("");
    setShowCropper(false);
    setTempImage("");
    setError("");
  };

  return (
    <div className="mt-8 content-center dark:text-dark_text_1 space-y-1">
      <label htmlFor="picture" className="text-sm font-bold tracking-wide">
        Picture (Optional) - Max 25MB
      </label>

      {showCropper && tempImage ? (
        <div className="space-y-3">
          <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
            <Cropper
              image={tempImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">Zoom</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
              className="w-full dark:bg-dark_bg_3 rounded-md cursor-pointer"
            />
            <span className="text-xs text-gray-400">
              {(zoom * 100).toFixed(0)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={getCroppedImg}
              className="flex-1 py-2 dark:bg-green-600 hover:dark:bg-green-700 rounded-md font-semibold text-sm transition"
            >
              Confirm Crop
            </button>
            <button
              onClick={() => {
                setShowCropper(false);
                setTempImage("");
              }}
              className="flex-1 py-2 dark:bg-dark_bg_3 hover:dark:bg-dark_bg_2 rounded-md font-semibold text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : readablePicture ? (
        <div>
          <img
            src={readablePicture}
            alt="preview"
            className="w-20 h-20 object-cover rounded-full border-2 border-green-500"
          />
          {/* Change pic */}
          <div className="flex gap-2 mt-2">
            <div
              className="flex-1 py-1 dark:bg-dark_bg_3 rounded-md text-xs font-bold flex items-center justify-center cursor-pointer hover:dark:bg-dark_bg_2 transition"
              onClick={() => inputRef.current.click()}
            >
              Change
            </div>
            <div
              className="flex-1 py-1 dark:bg-red-600 rounded-md text-xs font-bold flex items-center justify-center cursor-pointer hover:dark:bg-red-700 transition"
              onClick={handleRemovePic}
            >
              Remove
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-12 dark:bg-dark_bg_3 rounded-md font-bold flex items-center justify-center cursor-pointer hover:dark:bg-dark_bg_2 transition"
          onClick={() => inputRef.current.click()}
        >
          📷 Upload Picture
        </div>
      )}

      <input
        type="file"
        name="picture"
        id="picture"
        hidden
        ref={inputRef}
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFilePick}
      />

      {/* Error Message */}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {/* File Size Info */}
      {readablePicture && (
        <p className="text-xs text-gray-400">✓ Image ready to upload</p>
      )}
    </div>
  );
}
