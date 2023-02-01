
export type MaintenanceCommandType = "CLAER" | "NONE" ;

export type MaintenanceNoticeType = {
  date: Date,
  message: string,
  command?: MaintenanceCommandType
}

export const maintenanceNoticeToJSon = (date: Date, message: string, command? :MaintenanceCommandType): string => {
  return JSON.stringify({date, message, command});
}

export const jsonToMaintenanceNotice = (json: string): MaintenanceNoticeType => {
  try {
    const obj: MaintenanceNoticeType = JSON.parse(json);
    return {...obj, date: new Date(obj.date)};
  } catch (err) {
    console.log("JSON error ", err);
    return {date: new Date(), message: ""};
  }
}