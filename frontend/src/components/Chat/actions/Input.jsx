import { useState } from "react";
import { useSelector } from "react-redux";
import SocketContext from "../../../context/SocketContext";

function Input({ message, setMessage, textRef, socket }) {
  const { user } = useSelector((state) => state.user);
  const { activeConversation } = useSelector((state) => state.chat);

  const [typing, setTyping] = useState(false);
  const onChangeHandler = (e) => {
    setMessage(e.target.value);
    if (!activeConversation?._id) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", {
        conversationId: activeConversation._id,
        user: {
          _id: user._id,
          name: user.name,
          picture: user.picture,
        },
      });
    }
    let lastTypingTime = new Date().getTime();
    let timer = 1000;
    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timer && typing) {
        socket.emit("stop typing", {
          conversationId: activeConversation._id,
          userId: user._id,
        });
        setTyping(false);
      }
    }, timer);
  };
  return (
    <div className="w-full">
      <input
        type="text"
        className="dark:bg-dark_hover_1 dark:text-dark_text_1 outline-none h-[45px] w-full flex-1 rounded-lg pl-4"
        placeholder="Type a message"
        value={message}
        onChange={onChangeHandler}
        ref={textRef}
      />
    </div>
  );
}

const InputWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <Input {...props} socket={socket} />}
  </SocketContext.Consumer>
);
export default InputWithSocket;
