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


### Admin(Client)

ClientはAdminから通知送信機能を削除したものです。


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
