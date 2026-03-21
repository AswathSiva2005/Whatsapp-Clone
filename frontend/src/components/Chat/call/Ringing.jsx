import { useEffect, useState, useRef } from "react";
import { CloseIcon, ValidIcon } from "../../../svg";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";
export default function Ringing({ call, setCall, answerCall, endCall }) {
  const { name, picture, callType } = call;
  const [timer, setTimer] = useState(0);
  const audioRef = useRef(null);
  let interval;
  const handleTimer = () => {
    interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };
  console.log(timer);
  useEffect(() => {
    if (timer <= 30) {
      handleTimer();
    } else {
      endCall("missed");
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleAnswer = () => {
    // Stop ringtone audio immediately when answering
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    answerCall();
  };

  const handleReject = () => {
    // Stop ringtone audio when rejecting
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    endCall("rejected");
  };

  return (
    <div className="dark:bg-dark_bg_1 rounded-lg fixed  top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg z-30">
      {/*Container*/}
      <div className="p-4 flex items-center justify-between gap-x-8">
        {/*Call infos*/}
        <div className="flex items-center gap-x-2">
          <img
            src={picture || getTwoLetterAvatarUrl(name || "Caller")}
            alt={`caller profile picture`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getTwoLetterAvatarUrl(name || "Caller");
            }}
            className="w-28 h-28 rounded-full"
          />
          <div>
            <h1 className="dark:text-white">
              <b>{name}</b>
            </h1>
            <span className="dark:text-dark_text_2">
              {callType === "audio" ? "Whatsapp audio..." : "Whatsapp video..."}
            </span>
          </div>
        </div>
        {/*Call actions*/}
        <ul className="flex items-center gap-x-2">
          <li onClick={handleReject}>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500">
              <CloseIcon className="fill-white w-5" />
            </button>
          </li>
          <li onClick={handleAnswer}>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500">
              <ValidIcon className="fill-white w-6 mt-2" />
            </button>
          </li>
        </ul>
      </div>
      {/*Ringtone*/}
      <audio ref={audioRef} src="../../../../audio/ringtone.mp3" autoPlay loop></audio>
    </div>
  );
}
