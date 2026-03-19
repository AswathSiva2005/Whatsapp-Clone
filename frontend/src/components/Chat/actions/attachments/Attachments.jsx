import { AttachmentIcon } from "../../../../svg";
import Menu from "./menu/Menu";

export default function Attachments({
  showAttachments,
  setShowAttachments,
  setShowPicker,
  onCreatePoll,
}) {
  return (
    <li className="relative">
      <button
        onClick={() => {
          setShowPicker(false);
          setShowAttachments((prev) => !prev);
        }}
        type="button"
        className="btn"
      >
        <AttachmentIcon className="dark:fill-dark_svg_1" />
      </button>
      {/*Menu*/}
      {showAttachments ? (
        <Menu onCreatePoll={onCreatePoll} setShowAttachments={setShowAttachments} />
      ) : null}
    </li>
  );
}
