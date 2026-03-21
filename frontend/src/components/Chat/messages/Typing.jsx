import TraingleIcon from "../../../svg/triangle";
import { getTwoLetterAvatarUrl } from "../../../utils/avatar";

export default function Typing({ typing }) {
  const typingUserName = typing?.user?.name || "Someone";
  const typingUserPicture =
    typing?.user?.picture || getTwoLetterAvatarUrl(typingUserName);

  return (
    <div className="w-full flex mt-2 space-x-2 max-w-xs items-end">
      <img
        src={typingUserPicture}
        alt={typingUserName}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = getTwoLetterAvatarUrl(typingUserName);
        }}
        className="w-8 h-8 rounded-full object-cover"
      />
      {/*Message Container*/}
      <div>
        <div
          className={`relative h-full dark:text-dark_text_1 p-2 rounded-lg dark:bg-dark_bg_2
        `}
        >
          {/*Typing animation*/}
          <div className="typing-wave" aria-label="typing indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          {/*Traingle*/}
          <span>
            <TraingleIcon className="dark:fill-dark_bg_2 rotate-[60deg] absolute top-[-5px] -left-1.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
