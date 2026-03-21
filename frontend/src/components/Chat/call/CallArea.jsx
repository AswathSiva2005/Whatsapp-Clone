import { capitalize } from "../../../utils/string";
import CallTimes from "./CallTimes";

export default function CallArea({
  name,
  callType = "video",
  isGroup = false,
  participants = [],
  totalSecInCall,
  setTotalSecInCall,
  callAccepted,
}) {
  return (
    <div className="absolute top-12 z-40 w-full p-1">
      {/*Container*/}
      <div className="flex flex-col items-center">
        {/*Call infos*/}
        <div className="flex flex-col items-center gap-y-1">
          <h1 className="text-white text-lg">
            <b>{name ? capitalize(name) : ""}</b>
          </h1>
          <span className="text-dark_text_1 text-xs">
            {callType === "audio" ? "Audio call" : "Video call"}
          </span>
          {isGroup ? (
            <span className="text-dark_text_1 text-xs text-center max-w-[290px] truncate">
              Members: {participants.map((p) => p?.name).filter(Boolean).join(", ")}
            </span>
          ) : null}
          {!callAccepted && totalSecInCall === 0 ? (
            <span className="text-dark_text_1">Ringing...</span>
          ) : null}
          {callAccepted && totalSecInCall === 0 ? (
            <span className="text-dark_text_1">Connecting...</span>
          ) : null}
          <CallTimes
            totalSecInCall={totalSecInCall}
            setTotalSecInCall={setTotalSecInCall}
            callAccepted={callAccepted}
          />
        </div>
      </div>
    </div>
  );
}
