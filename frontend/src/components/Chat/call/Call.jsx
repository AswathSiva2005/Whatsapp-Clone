import { useEffect, useRef, useState } from "react";
import CallAcions from "./CallAcions";
import CallArea from "./CallArea";
import Header from "./Header";
import Ringing from "./Ringing";

export default function Call({
  call,
  setCall,
  callAccepted,
  myVideo,
  stream,
  userVideo,
  answerCall,
  show,
  endCall,
  switchToVideoCall,
  totalSecInCall,
  setTotalSecInCall,
}) {
  const { receiveingCall, callEnded, name, callType, isGroup, participants } = call;
  const [showActions, setShowActions] = useState(false);
  const [toggle, setToggle] = useState(false);
  const outgoingRingtoneRef = useRef(null);

  useEffect(() => {
    // Ensure ringback audio cannot continue after call transitions.
    if (callAccepted || callEnded || !show) {
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current.currentTime = 0;
      }
    }
  }, [callAccepted, callEnded, show]);

  useEffect(() => {
    const ringAudio = outgoingRingtoneRef.current;
    return () => {
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
      }
    };
  }, []);

  return (
    <>
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-24px)] max-w-[350px] h-[calc(100dvh-120px)] max-h-[550px] z-10 rounded-2xl overflow-hidden callbg
        ${receiveingCall && !callAccepted ? "hidden" : ""}
        `}
        onMouseOver={() => setShowActions(true)}
        onMouseOut={() => setShowActions(false)}
      >
        {/*Container*/}
        <div>
          <div>
            {/*Header*/}
            <Header />
            {/*Call area*/}
            <CallArea
              name={name}
              callType={callType}
              isGroup={isGroup}
              participants={participants}
              totalSecInCall={totalSecInCall}
              setTotalSecInCall={setTotalSecInCall}
              callAccepted={callAccepted}
            />
            {/*Call actions*/}
            {showActions || callAccepted ? (
              <CallAcions
                endCall={endCall}
                callType={callType}
                switchToVideoCall={switchToVideoCall}
              />
            ) : null}
          </div>
          {/*Video streams*/}
          <div>
            {/*user video*/}
            {callType === "video" && callAccepted && !callEnded ? (
              <div>
                <video
                  ref={userVideo}
                  playsInline
                  autoPlay
                  className={toggle ? "SmallVideoCall" : "largeVideoCall"}
                  onClick={() => setToggle((prev) => !prev)}
                ></video>
              </div>
            ) : null}

            {callType === "audio" && callAccepted && !callEnded ? (
              <audio ref={userVideo} autoPlay></audio>
            ) : null}
            {/*my video*/}
            {callType === "video" && stream ? (
              <div>
                <video
                  ref={myVideo}
                  playsInline
                  muted
                  autoPlay
                  className={`${toggle ? "largeVideoCall" : "SmallVideoCall"} ${
                    showActions ? "moveVideoCall" : ""
                  }`}
                  onClick={() => setToggle((prev) => !prev)}
                ></video>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {/*Ringing*/}
      {receiveingCall && !callAccepted ? (
        <Ringing
          call={call}
          setCall={setCall}
          answerCall={answerCall}
          endCall={endCall}
        />
      ) : null}
      {/*calling ringtone*/}
      {!callAccepted && show ? (
        <audio
          ref={outgoingRingtoneRef}
          src="../../../../audio/ringing.mp3"
          autoPlay
          loop
        ></audio>
      ) : null}
    </>
  );
}
