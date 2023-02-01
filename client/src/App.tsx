import { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { MaintenanceNoticeType, jsonToMaintenanceNotice, maintenanceNoticeToJSon } from 'maintenance-notice';

const SocketUrl = "ws://localhost:4040";

export const App = () => {
  const [notices, setNotices] = useState<MaintenanceNoticeType[]>([]);
  const { lastMessage, readyState } = useWebSocket(SocketUrl);

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
        <ul>
          {notices.map((notice, idx) => {
            const date =notice.date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
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
