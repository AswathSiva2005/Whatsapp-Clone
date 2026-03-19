import { useDispatch, useSelector } from "react-redux";
import { votePollMessage } from "../../../features/chatSlice";

export default function PollMessage({ message, me }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const poll = message?.poll;

  if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) {
    return null;
  }

  const totalVotes = poll.options.reduce(
    (count, option) => count + (option.votes?.length || 0),
    0
  );

  const myVoteIndex = poll.options.findIndex((option) =>
    (option.votes || []).some((id) => String(id) === String(user._id))
  );

  const vote = async (optionIndex) => {
    await dispatch(
      votePollMessage({
        token: user.token,
        messageId: message._id,
        optionIndex,
      })
    );
  };

  return (
    <div className={`w-full flex mt-2 max-w-xs ${me ? "ml-auto justify-end" : ""}`}>
      <div
        className={`w-full rounded-lg p-3 ${
          me ? "bg-green_3" : "dark:bg-dark_bg_2"
        }`}
      >
        <p className="text-sm font-semibold dark:text-dark_text_1">{poll.question}</p>

        <div className="mt-2 space-y-2">
          {poll.options.map((option, index) => {
            const optionVotes = option.votes?.length || 0;
            const ratio = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
            const selected = myVoteIndex === index;

            return (
              <button
                key={index}
                type="button"
                className={`w-full text-left rounded-md border px-2 py-2 text-sm dark:text-dark_text_1 ${
                  selected
                    ? "border-green_1 bg-[#1f2c33]"
                    : "dark:border-dark_border_2 hover:dark:bg-dark_bg_3"
                }`}
                onClick={() => vote(index)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{option.label}</span>
                  <span className="text-xs dark:text-dark_text_2">{ratio}%</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-xs dark:text-dark_text_2">{totalVotes} votes</p>
      </div>
    </div>
  );
}
