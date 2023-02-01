export type MaintenanceCommandType = "CLAER" | "NONE";
export type MaintenanceNoticeType = {
    date: Date;
    message: string;
    command?: MaintenanceCommandType;
};
export declare const maintenanceNoticeToJSon: (date: Date, message: string, command?: MaintenanceCommandType) => string;
export declare const jsonToMaintenanceNotice: (json: string) => MaintenanceNoticeType;
