
import { MaintenanceNoticeType, jsonToMaintenanceNotice } from 'maintenance-notice';
import { useEffect, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const SocketUrl = "ws://localhost:4040";



// useMaintenanceNoticeの戻り値の型
type UseMaintenanceNoticeReturnType = {
  notices: MaintenanceNoticeType[],        // MaintenanceNoticeの配列
  socketError: boolean                     // 通信エラー発生
}
// 通知をWebScoketで受け取るHook

const useMaintenanceNotice = (): UseMaintenanceNoticeReturnType => {
  const [notices, setNotices] = useState<MaintenanceNoticeType[]>([]);
  const { lastMessage, readyState } = useWebSocket(SocketUrl);

  useEffect(() => {
    if (lastMessage !== null) {
      const notice = jsonToMaintenanceNotice(lastMessage.data);
      if (notice.command && notice.command === "CLAER") {
        setNotices([]);
      } else {
        setNotices((prevNotice) => prevNotice.concat(notice));
      }
  }
  }, [lastMessage, setNotices]);

  if (readyState === ReadyState.CLOSED) {
    return {notices: [], socketError: true};
  } else {
    return {notices, socketError: false};
  }

}

export default useMaintenanceNotice