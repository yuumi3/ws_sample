# WebSocket サンプル

WebSocketを使ってReactアプリの全利用者に通知を行うサンプル・コードです。

## 概要

このサンプルは以下のような構成になっています

1. Admin: 通知情報を入力・送信するReactアプリ
   - Clearボタンを押すとサーバーおよび全クライアントの通知が消去されます
2. Client: 通知を受け取るReactアプリ
3. Server: WebSocketのnode.jsサーバーで、Adminから送られてきた通知を全Clientに送信します
   - 全ClientとのWebScket接続を管理しています
   - 後から接続されたClientにも全通知が送信されます

![](/images/ws_sample.png)

[WebSocket](https://developer.mozilla.org/ja/docs/Web/API/WebSockets_API)の通信には以下のライブラリーを使っています

- Reactアプリ側 [React useWebSocket](https://github.com/robtaussig/react-use-websocket)
- サーバー側 [ws](https://github.com/websockets/ws)


## ファイル構成

```txt
├── README.md           このドキュメント
├── admin               通知情報を入力・送信するReactアプリ
├── client              通知を受け取るReactアプリ
├── images              ドキュメント用画像
├── maintenance-notice  通知ライブラリー
└── server              WebSocketのサーバー
```

## コード解説

### maintenance-notice

WebSocketでやり取りされるオブジェクトの型とJSONとの変換関数が定義されています。

- index.ts

```ts

// サーバー・クライアントで実行すべき命令（コマンド）の型
//    CLAER : 通知の消去
//    NONE  : 何もしない（現在未実装）
export type MaintenanceCommandType = "CLAER" | "NONE" ;

// 通知データの型
export type MaintenanceNoticeType = {
  date: Date,                         // 送信日時
  message: string,                    // メッセージ
  command?: MaintenanceCommandType    // 実行すべき命令（オプション）
}

// date, message, command から通知用JSONを作成
export const maintenanceNoticeToJSon = (date: Date, message: string, command?: MaintenanceCommandType): string => {
  return JSON.stringify({date, message, command});
}

// 通知用JSONから通知データ型のオブジェクトに変換
export const jsonToMaintenanceNotice = (json: string): MaintenanceNoticeType => {
  try {
    const obj: MaintenanceNoticeType = JSON.parse(json);
    return {...obj, date: new Date(obj.date)};    // JSONにするとDate型は文字列なってしまうので、Dateに戻す
  } catch (err) {
    console.log("JSON error ", err);
    return {date: new Date(), message: ""};
  }
}
```


### Admin


```jsx
import { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { MaintenanceNoticeType, jsonToMaintenanceNotice, maintenanceNoticeToJSon } from 'maintenance-notice';

const SocketUrl = "ws://localhost:4040";   // ← ①

export const App = () => {
  const [notices, setNotices] = useState<MaintenanceNoticeType[]>([]);      // ← ②
  const [message, setMessage] = useState("");                               // ← ③
  const { sendMessage, lastMessage, readyState } = useWebSocket(SocketUrl); // ← ④

  useEffect(() => {
    if (lastMessage !== null) {  // ← ⑤
      const notice = jsonToMaintenanceNotice(lastMessage.data);
      if (notice.command && notice.command == "CLAER") {
        setNotices([]);
      } else {
        setNotices((prevNotice) => prevNotice.concat(notice));
      }
    }
  }, [lastMessage, setNotices]);

  switch (readyState) {   // ← ⑥
  case ReadyState.CLOSED:
    return <p>!! Server not running !!</p>
  case ReadyState.OPEN:
    return (             // ← ⑦
      <>
        <input type="text" onChange={e => setMessage(e.target.value)} />
        <button onClick={_ => {
          sendMessage(maintenanceNoticeToJSon(new Date(), message));      // ← ⑧
        }}> Send </button>
        <button onClick={_ => {
          sendMessage(maintenanceNoticeToJSon(new Date(), "", "CLAER"));  // ← ⑨
        }}> Clear </button>
        <ul>
          {notices.map((notice, idx) => {       // ← ⑩
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
  default:     // ← ⑪
    return <p> CONNECTING, CLOSING, UNINSTANTIATED {readyState}</p>
  }
};

export default App;
```

- ① WebSockerサーバーのURL
- ② notices : サーバーから受信した全通知のState
- ③ message : メッセージ入力用State
- ④ WebSocket用Hook、戻り値は
   - sendMessage : 送信用関数
   - lastMessage : 最新の受信値
   - readyState : WebSocketの状態
- ⑤ WebSocketを受信した時の処理
    - lastMessage.dataは受信したJSON文字列です
    - jsonToMaintenanceNotice()でJSON文字列を通知型のオブジェクトに変換します
    - もし通知がCLAERコマンドなら、受信した通知Stateをクリアします
    - それ以外なら受信した通知Stateの最後に追加します
       - Stateのset関数はこのように関数を渡すこともできます
       - その場合は引数に現在のStateが渡ってきます
- ⑥ WebSocketの状態により処理を変えています
     - ReadyState.CLOSEDはサーバーが動作してない場合なので、エラーを表示しています
- ⑦ WebSocketが接続済み（正常）の場合の処理
- ⑧ Sendボタンが押された場合、inputタグに入力された文字列をmessageとしてサーバーに送信しています
- ⑨ Clearボタンが押された場合は、CLAERコマンドをサーバーに送信しています
- ⑩ 受信通知の表示
   - dateは日本timezoneで日本的な形式の文字列に変換しています
- ⑪ CONNECTING（接続処理中）、CLOSING（接続終了処理中）、UNINSTANTIATED（起動処理中）は無視しています


### Server

```ts
import { WebSocketServer, WebSocket } from 'ws';
import { jsonToMaintenanceNotice } from 'maintenance-notice';

const wss = new WebSocketServer({ port: 4040 });  // ← ①

let connections: WebSocket[] = [];     // ← ②
let messageHistory: string[] = [];     // ← ③

wss.on('connection', (ws) => {   // ← ④
  console.log('- connectioned ', connections.length);
  connections.push(ws);          // ← ⑤
  if (messageHistory.length > 0) {
    console.log('-  send history X ', messageHistory.length)
    messageHistory.forEach(message => ws.send(message));   // ← ⑥
  }

  ws.on('close', () => {                      // ← ⑦
    const ix = connections.findIndex(conn => (conn === ws));   // ← ⑧
    console.log('- disconnectioned ', ix);
    if (ix >= 0) connections.splice(ix, 1);   // ← ⑨
  });

  ws.on('message', (data) =>  {                        // ← ⑩
    const message = data.toString();
    const notice = jsonToMaintenanceNotice(message);   // ← ⑪

    if (notice.command && notice.command == "CLAER") { // ← ⑫
      console.log('- clear history');
      messageHistory = [];
    } else {
      messageHistory.push(message);                    // ← ⑬
    }

    console.log('- send message:', message, ' X ', connections.length);
    connections.forEach(con => con.send(message));     // ← ⑭
  });

  ws.on('error', (err) => {            // ← ⑮
    console.error("= Error: ", err);
  });
});
```

- ① シンプルなWebSocketサーバーを起動
- ② connections : 接続されているクライアント接続情報（WebSocket）の配列
- ③ messageHistory : 過去に送信した通知データ（JSON文字列）の配列
- ④ クライアントが接続されると、この処理が始まります
   - ⑤ クライアント接続情報をconnectionsに追加
   - ⑥ 接続前に送信した通知データがあれば、接続したクライアントに送信
- ⑦ クライアントの接続が切れたときに、この処理が始まります
   - ⑧ 切れた接続を見つけ
   - ⑨ その接続をconnectionsから削除します
- ⑩ メッセージを受信したときに、この処理が始まります
   - ⑪ 受信データ（JSON文字列）を通知型のオブジェクトに変換
   - ⑫ もし通知がCLAERコマンドなら、受信したmessageHistoryをクリアします
   - ⑬ それ以外なら受信データをmessageHistoryに追加
   - ⑭ 受信データを接続中の全クライアントに送信
- ⑮ エラーが発生したときに、この処理が始まります


### Client

UIを追加しました。🔔

##### 1. useMaintenanceNotice.ts

WebSocketとの通信部分はHookにしました。

```ts

import { MaintenanceNoticeType, jsonToMaintenanceNotice } from 'maintenance-notice';
import { useEffect, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const SocketUrl = "ws://localhost:4040";                                 // ← ①

// useMaintenanceNoticeの戻り値の型
type UseMaintenanceNoticeReturnType = {
  notices: MaintenanceNoticeType[],        // MaintenanceNoticeの配列
  socketError: boolean                     // 通信エラー発生
}
// 通知をWebScoketで受け取るHook

const useMaintenanceNotice = (): UseMaintenanceNoticeReturnType => {
  const [notices, setNotices] = useState<MaintenanceNoticeType[]>([]);   // ← ②
  const { lastMessage, readyState } = useWebSocket(SocketUrl);           // ← ③

  useEffect(() => {                                                      // ← ④
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
    return {notices: [], socketError: true};         // ← ⑤
  } else {
    return {notices, socketError: false};            // ← ⑥
  }
}

export default useMaintenanceNotice
```


- ① WebSockerサーバーのURL
- ② notices : サーバーから受信した全通知のState
- ③ WebSocket用Hook、戻り値は
   - lastMessage : 最新の受信値
   - readyState : WebSocketの状態
- ④ WebSocketを受信した時の処理は`useEffect`を使って lastMessage の変更時に行われます
   - lastMessage.dataは受信したJSON文字列です
   - jsonToMaintenanceNotice()でJSON文字列を通知型のオブジェクトに変換します
   - もし通知がCLAERコマンドなら、受信した通知Stateをクリアします
   - それ以外なら受信した通知Stateの最後に追加します
- ⑤ ReadyState.CLOSEDはサーバーが動作してない場合なのでエラーを戻します
- ⑥ それ以外の状態はnoticesを戻します

#### 2. App.tsx

UIには以下を使っています

- IconButton　アイコンボタン
- Badge　バッジ（右上の）件数表示
- Card　通知リスト表示の枠
- Alert 通知（アラート）表示
- Slide　通知表示コンポーネントの移動アニメーション

```jsx
import React, { useState } from "react";
import useMaintenanceNotice from "./useMaintenanceNotice";
import { MaintenanceNoticeType } from "maintenance-notice";

import { AppBar, Badge, Button, Card, CardContent, CardHeader, IconButton, makeStyles, Slide, Toolbar, Typography } from "@material-ui/core";
import { Alert } from '@material-ui/lab';
import CloseIcon             from '@material-ui/icons/Close';
import NotificationsIcon     from '@material-ui/icons/Notifications';
import NotificationsNoneIcon from '@material-ui/icons/NotificationsNone';

// 通知リスト表示コンポーネント               // ← ①
type MaintenanceNoticeAlertProps = {
  notices: MaintenanceNoticeType[],
  onClose: () => void
}
const MaintenanceNoticeAlerts: React.FC<MaintenanceNoticeAlertProps> = ({notices, onClose}) => {
  return (
    <Card>
      <CardHeader
        title="通知"
        action={
          <IconButton onClick={_ => onClose()} color="primary" aria-label="upload picture" component="span">
            <CloseIcon />
          </IconButton>
        }
      />
      <CardContent>
        {notices.map((notice, idx) => {
          const date = notice.date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
          return (
            <Alert key={idx} style={{marginBottom: 10}} severity="warning"><span style={{fontSize: '60%'}}>{date} </span> — <span>{notice.message}</span></Alert>
          );
        })}
      </CardContent>
    </Card>
  )
}

// 通知アイコン                            // ← ②
type NotificationsBellIconProps = {
  notices: MaintenanceNoticeType[],
  socketError: boolean
}
const NotificationsBellIcon: React.FC<NotificationsBellIconProps> = ({socketError, notices}) => {
  if (socketError) {
    return <NotificationsIcon color="error" />;
  } else if (notices.length === 0) {
    return <NotificationsNoneIcon />;
  } else {
    return <NotificationsIcon />;
  }
};


const App = () => {
  const {notices, socketError} = useMaintenanceNotice();     // ← ③
  const [showNotice, setShowNotice] = useState(false);       // ← ④

  const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
    work: {
      margin: 10
    }
  }));

  const classes = useStyles();

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Apps
          </Typography>
          <IconButton onClick={_ => setShowNotice(!showNotice)} color="inherit">  // ← ⑤
            <Badge badgeContent={notices.length} color="secondary">
              <NotificationsBellIcon notices={notices} socketError={socketError} />
            </Badge>
          </IconButton>
          <Button color="inherit">Logout</Button>
        </Toolbar>
      </AppBar>
      <div className={classes.work}>
        {socketError ?                                         // ← ⑥
          <Alert severity="error">通知サーバーまたはネットワークに問題が発生しています</Alert> :
          <Slide direction="up" in={showNotice && notices.length > 0} mountOnEnter unmountOnExit>  // ← ⑦
            <div>
              <MaintenanceNoticeAlerts notices={notices} onClose={() => setShowNotice(false)}/>  // ← ⑧
            </div>
          </Slide>
        }
      </div>
    </div>
  )
}

export default App;
```

- ① 通知リストを表示するコンポーネント
    - Card(MUI)コンポーネントの上に通知リストを表示しています
    - 1つの通知はAlert(MUI)コンポーネントを使っています
    - 閉じるボタンがあります
- ② 通知アイコンを表示するコンポーネント
    - エラー、通知無し、通知有りで表示するアイコンを切り替えています
- ③ useMaintenanceNotice呼び出し
    - 通知の配列と通信エラーが戻ります
    - 通知を受け取るとAppコンポーネントは再描画されます
- ④ 通知リスト表示On/OffのState
- ⑤ 通知ICON
    - クリックすると通知リストを表示します
    - 通知件数がBadgeで右上に表示されます
    - アイコンはエラー、通知無し、通知有で変わります
- ⑥ 通信エラーの場合はエラーAlert(MUI)が表示されます
- ⑦ 通知リストを表示する際に移動型のアニメーションが使われます
    - 通信エラーがない場合のみ表示されます
    - アニメーションはSlide(MUI)コンポーネントを使っています
- ⑧ 通知リスト表示コンポーネントを利用

## インストール・起動方法

### 1. インストールとmaintenance-notice

```sh
$ git clone https://github.com/yuumi3/ws_sample
$ cd ws_sample
$ cd maintenance-notice
$ npm install
$ npm start
$ 
```

### 2. Server

```sh
$ cd ../server
$ npm install
$ npm start

> server@1.0.0 start
> ts-node src/index.ts
```

### 3. Admin

別ターミナルを起動してください。

```sh
$ cd ws_sample
$ cd admin
$ npm install
$ npm start

・・・

You can now view client in the browser.

  Local:            http://localhost:3010
  On Your Network:  http://192.168.3.36:3010

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
Files successfully emitted, waiting for typecheck results...
Issues checking in progress...
No issues found.
```

ブラウザーで `http://localhost:3010` をアクセスすると下のような画面が表示されます。

![](/images/admin1.png)

入力欄にメッセージを入力し、Sendボタンを押すと、下のようにメッセージが表示されます。

![](/images/admin2.png)

### 3. Client

別ターミナルを起動してください。


```sh
$ cd ws_sample
$ cd admin
$ npm install
$ npm start

・・・

You can now view client in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.3.36:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
Files successfully emitted, waiting for typecheck results...
Issues checking in progress...
No issues found.
```

ブラウザーで `http://localhost:3000` をアクセスすると下のようにメッセージが表示されます。

![](/images/client1.png)


## License

[MIT License](http://www.opensource.org/licenses/MIT).
