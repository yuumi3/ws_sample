
export type MaintenanceNotificationType = {
  date: Date,
  message: string
}

export const maintenanceNotificationToJSon = (date: Date, message: string): string => {
  return JSON.stringify({date, message});
}

export const jsonToMaintenanceNotification = (json: string): MaintenanceNotificationType => {
  try {
    const obj: {date: string, message:string} = JSON.parse(json);
    return {date: new Date(obj.date), message: obj.message};
  } catch (err) {
    console.log("JSON error ", err);
    return {date: new Date(), message: ""};
  }
}