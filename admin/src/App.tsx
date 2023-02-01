import { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { MaintenanceNoticeType, jsonToMaintenanceNotice, maintenanceNoticeToJSon } from 'maintenance-notice';

const SocketUrl = "ws://localhost:4040";

export const App = () => {
  const [notices, setNotices] = useState<MaintenanceNoticeType[]>([]);
  const [message, setMessage] = useState("");
  const { sendMessage, lastMessage, readyState } = useWebSocket(SocketUrl);

  useEffect(() => {
    if (lastMessage !== null) {
      const notice = jsonToMaintenanceNotice(lastMessage.data);
      if (notice.command && notice.command == "CLAER") {
        setNotices([]);
      } else {
        setNotices((prevNotice) => prevNotice.concat(notice));
      }
    }
  }, [lastMessage, setNotices]);

  switch (readyState) {
  case ReadyState.CLOSED:
    return <p>!! Server not running !!</p>
  case ReadyState.OPEN:
    return (
      <>
        <input type="text" onChange={e => setMessage(e.target.value)} />
        <button onClick={_ => {
          sendMessage(maintenanceNoticeToJSon(new Date(), message));
        }}> Send </button>
        <button onClick={_ => {
          sendMessage(maintenanceNoticeToJSon(new Date(), "", "CLAER"));
        }}> Clear </button>
        <ul>
          {notices.map((notice, idx) => {
            const date = notice.date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            return (
              <li key={idx}>
                <span style={{fontSize: '60%'}}>{date} </span>
                <span>{notice.message}</span>
              </li>
            );
          })}
        </ul>
      </>
    );
  default:
    return <p> CONNECTING, CLOSING, UNINSTANTIATED {readyState}</p>
  }
};

export default App;
