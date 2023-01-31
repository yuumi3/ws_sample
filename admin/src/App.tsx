import { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { jsonToMaintenanceNotification, maintenanceNotificationToJSon } from './NotificationType';

const SocketUrl = "ws://localhost:4040";

export const App = () => {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const { sendMessage, lastMessage, readyState } = useWebSocket(SocketUrl);

  useEffect(() => {
    if (lastMessage !== null) {
      setNotifications((prevNotifications) => prevNotifications.concat(lastMessage.data));
    }
  }, [lastMessage, setNotifications]);

  switch (readyState) {
  case ReadyState.CLOSED:
    return <p>!! Server not running !!</p>
  case ReadyState.OPEN:
    return (
      <>
        <input type="text" onChange={e => setMessage(e.target.value)} />
        <button onClick={_ => {
          sendMessage(maintenanceNotificationToJSon(new Date(), message));
        }}>Send</button>
        <ul>
          {notifications.map((notification, idx) => {
            const notice = jsonToMaintenanceNotification(notification);
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
