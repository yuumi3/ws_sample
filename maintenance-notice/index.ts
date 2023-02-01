
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