import DownloadIcon from "../../../../svg/Download";
export default function FileOthers({ file, type, me }) {
  const extensionFromPublicId = file?.public_id?.includes(".")
    ? file.public_id.split(".").pop()
    : file?.format || "file";
  const displayName = file?.original_filename || "file";
  const fileBytes = Number(file?.bytes || 0);

  return (
    <div className="bg-green_4 p-2 rounded-lg">
      {/*Container*/}
      <div className="flex justify-between gap-x-8">
        {/*File infos*/}
        <div className="flex items-center gap-2">
          <img
            src={`../../../../images/file/${type}.png`}
            alt=""
            className="w-8 object-contain"
          />
          <div className="flex flex-col gap-2">
            <h1>
              {displayName}.{extensionFromPublicId}
            </h1>
            <span className="text-sm">
              {type} . {fileBytes}B
            </span>
          </div>
        </div>
        {/*Download button*/}
        {!me && (
          <a href={file.secure_url} target="_blank" rel="noreferrer" download>
            <DownloadIcon />
          </a>
        )}
      </div>
    </div>
  );
}
